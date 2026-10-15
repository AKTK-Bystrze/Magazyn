package supabase

import (
	"testing"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseRPCVoidResponse(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectError   bool
		expectedMsg   string
		isInternalErr bool
	}{
		{
			name:        "Empty string (success void)",
			input:       "",
			expectError: false,
		},
		{
			name:        "Literal null (success void)",
			input:       "null",
			expectError: false,
		},
		{
			name:          "PostgREST error with message",
			input:         `{"message": "Reservation not found"}`,
			expectError:   true,
			expectedMsg:   "RPC Error: Reservation not found",
			isInternalErr: true,
		},
		{
			name:          "PostgREST error with code and message",
			input:         `{"code": "P0001", "details": "not found", "message": "Reservation not found"}`,
			expectError:   true,
			expectedMsg:   "RPC Error: Reservation not found",
			isInternalErr: true,
		},
		{
			name:        "Non-JSON error payload (e.g. gateway error)",
			input:       "502 Bad Gateway",
			expectError: false, // CHALLENGE: Observe behavior on non-JSON
		},
		{
			name:        "JSON without message key (e.g. only error key)",
			input:       `{"error": "Unauthorized"}`,
			expectError: false, // CHALLENGE: Observe behavior without message key
		},
		{
			name:        "JSON array error",
			input:       `[{"message": "Error in batch"}]`,
			expectError: false, // CHALLENGE: Observe behavior on array
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := parseRPCVoidResponse(tc.input)
			if tc.expectError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedMsg)
				if tc.isInternalErr {
					var internalErr *types.InternalError
					assert.ErrorAs(t, err, &internalErr)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
