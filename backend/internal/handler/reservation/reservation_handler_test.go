package reservation_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/handler/reservation"
	reservationservice "magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func setupTestHandler() (http.Handler, *mocks.MockReservationRepository, *mocks.MockEquipmentRepository) {
	mockRepo := new(mocks.MockReservationRepository)
	mockEquipRepo := new(mocks.MockEquipmentRepository)
	mockUserRepo := new(mocks.MockUserRepository)
	mockEmailService := new(mocks.MockEmailService)

	svc := reservationservice.NewReservationService(mockRepo, mockEquipRepo, mockUserRepo, mockEmailService)
	handler := reservation.NewReservationHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("/reservations", func(w http.ResponseWriter, r *http.Request) {
		handler.HandleCreate(w, r)
	})

	return mux, mockRepo, mockEquipRepo
}

func createTestContext(userID, role string) context.Context {
	ctx := context.Background()

	user := &types.User{
		ID: userID,
	}
	ctx = context.WithValue(ctx, appcontext.UserContextKey, user)

	profile := &types.PublicProfilesSelect{
		ID:   userID,
		Role: role,
	}
	ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, profile)

	return ctx
}

func TestHandleCreate_FreeReservationAuthorization(t *testing.T) {
	tests := []struct {
		name            string
		userID          string
		role            string
		freeReservation bool
		expectedStatus  int
		expectedError   string
	}{
		{
			name:            "Admin can create free reservation",
			userID:          "user-123",
			role:            auth.RoleAdmin,
			freeReservation: true,
			expectedStatus:  201, // Created
			expectedError:   "",
		},
		{
			name:            "SuperAdmin can create free reservation",
			userID:          "user-123",
			role:            auth.RoleSuperAdmin,
			freeReservation: true,
			expectedStatus:  201,
			expectedError:   "",
		},
		{
			name:            "Regular user cannot create free reservation",
			userID:          "user-123",
			role:            auth.RoleUser,
			freeReservation: true,
			expectedStatus:  403, // Forbidden
			expectedError:   "Only admins can create free reservations",
		},
		{
			name:            "Regular user can create regular reservation",
			userID:          "user-123",
			role:            auth.RoleUser,
			freeReservation: false,
			expectedStatus:  201,
			expectedError:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			router, mockRepo, mockEquipRepo := setupTestHandler()

			// Setup equipment for reservation
			equipName := "Test Equipment"
			equip := &types.PublicEquipmentSelect{
				ID:         "equip-1",
				Name:       &equipName,
				TypeID:     "type-1",
				Status:     "available",
				IsArchived: false,
			}
			mockEquipRepo.On("GetByID", mock.Anything, "equip-1").Return(equip, nil)

			// Setup equipment type
			equipType := &types.PublicEquipmentTypesSelect{
				ID:               "type-1",
				CreditCostPerDay: 10,
			}
			mockEquipRepo.On("GetTypeByID", mock.Anything, "type-1").Return(equipType, nil)

			// Setup atomic reservation creation
			mockRepo.On("CreateReservationsAtomic", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("int32"), mock.Anything, mock.Anything).
				Return([]string{"res-123"}, 100, nil)

			cmd := types.CreateReservationsCommand{
				Reservations: []types.CreateReservationItem{
					{
						EquipmentID: "equip-1",
						StartDate:   "2024-01-01",
						EndDate:     "2024-01-02",
					},
				},
				FreeReservation: &tt.freeReservation,
			}

			body, err := json.Marshal(cmd)
			require.NoError(t, err)

			req, _ := http.NewRequest("POST", "/reservations", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Set user context
			req = req.WithContext(createTestContext(tt.userID, tt.role))

			// Act
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedStatus == 403 {
				var response map[string]interface{}
				err = json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)

				// Check error message (it might be in "error" or "message" field)
				errorMsg := ""
				if val, ok := response["error"]; ok {
					if str, ok := val.(string); ok {
						errorMsg = str
					}
				}
				if val, ok := response["message"]; ok {
					if str, ok := val.(string); ok {
						errorMsg = str
					}
				}

				assert.Contains(t, errorMsg, tt.expectedError)
				// Should not have called the repository for forbidden requests
				mockRepo.AssertNotCalled(t, "CreateReservationsAtomic")
			} else {
				// Should have called the repository for successful requests
				mockRepo.AssertCalled(t, "CreateReservationsAtomic")
			}
		})
	}
}
