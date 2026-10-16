package reservation_test

import (
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/testutils/mocks"
)

func setupTestService() (*mocks.MockReservationRepository, *mocks.MockEquipmentRepository, *mocks.MockUserRepository, *mocks.MockEmailService, reservation.ReservationService) {
	mockRepo := new(mocks.MockReservationRepository)
	mockEquipRepo := new(mocks.MockEquipmentRepository)
	mockUserRepo := new(mocks.MockUserRepository)
	mockEmailService := new(mocks.MockEmailService)
	svc := reservation.NewReservationService(mockRepo, mockEquipRepo, mockUserRepo, mockEmailService)
	return mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc
}
