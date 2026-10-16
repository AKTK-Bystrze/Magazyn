package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizeSearchTerm_SpecialCharacters_EscapesOperators(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"comma", "test,value", "test\\,value"},
		{"dot", "test.value", "test\\.value"},
		{"equals", "test=value", "test\\=value"},
		{"parentheses", "test(value)", "test\\(value\\)"},
		{"asterisk", "test*value", "test\\*value"},
		{"exclamation", "test!value", "test\\!value"},
		{"multiple operators", "test,id.eq.value", "test\\,id\\.eq\\.value"},
		{"normal text", "camera lens", "camera lens"},
		{"empty string", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SanitizeSearchTerm(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
func TestSanitizeSearchTerm_InjectionAttempts_BlocksAttacks(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			"role injection",
			"%,role.eq.super_admin",
			"%\\,role\\.eq\\.super_admin",
		},
		{
			"id bypass",
			"%,id.eq.fake-id",
			"%\\,id\\.eq\\.fake-id",
		},
		{
			"status filter injection",
			"test,status.eq.broken",
			"test\\,status\\.eq\\.broken",
		},
		{
			"nested operators",
			"or(name.eq.test,id.eq.123)",
			"or\\(name\\.eq\\.test\\,id\\.eq\\.123\\)",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SanitizeSearchTerm(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
func TestValidateUUID(t *testing.T) {
	tests := []struct {
		name    string
		uuid    string
		wantErr bool
	}{
		{"lowercase", "550e8400-e29b-41d4-a716-446655440000", false},
		{"uppercase", "550E8400-E29B-41D4-A716-446655440000", false},
		{"mixed case", "550e8400-E29B-41d4-A716-446655440000", false},
		{"all zeros", "00000000-0000-0000-0000-000000000000", false},
		{"all f's", "ffffffff-ffff-ffff-ffff-ffffffffffff", false},
		{"empty string", "", true},
		{"too short", "550e8400-e29b-41d4-a716", true},
		{"too long", "550e8400-e29b-41d4-a716-446655440000-extra", true},
		{"missing hyphens", "550e8400e29b41d4a716446655440000", true},
		{"wrong hyphen positions", "550e84-00e29b-41d4a716-446655440000", true},
		{"invalid characters", "550e8400-e29b-41d4-a716-gggggggggggg", true},
		{"not a uuid", "not-a-valid-uuid-string-here", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUUID(tt.uuid)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateEnum(t *testing.T) {
	allowedStatuses := []string{"PENDING", "RENTED", "RETURNED", "CANCELLED"}
	tests := []struct {
		name    string
		value   string
		wantErr bool
	}{
		{"first value", "PENDING", false},
		{"middle value", "RENTED", false},
		{"last value", "CANCELLED", false},
		{"empty string", "", true},
		{"wrong case", "pending", true},
		{"invalid value", "INVALID", true},
		{"partial match", "PEND", true},
		{"similar value", "RENTED_EXTRA", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEnum(tt.value, allowedStatuses)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateStringLength(t *testing.T) {
	tests := []struct {
		name      string
		str       string
		minLength int
		maxLength int
		wantErr   bool
	}{
		{"min boundary", "ab", 2, 10, false},
		{"max boundary", "abcdefghij", 2, 10, false},
		{"middle length", "abcde", 2, 10, false},
		{"empty allowed", "", 0, 10, false},
		{"exact length", "test", 4, 4, false},
		{"too short", "a", 2, 10, true},
		{"too long", "abcdefghijk", 2, 10, true},
		{"empty not allowed", "", 1, 10, true},
		{"way too long", "this is a very long string that exceeds the maximum", 1, 10, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateStringLength(tt.str, tt.minLength, tt.maxLength)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func BenchmarkSanitizeSearchTerm(b *testing.B) {
	input := "test,id.eq.value(something)"
	for i := 0; i < b.N; i++ {
		_ = SanitizeSearchTerm(input)
	}
}

func BenchmarkValidateUUID(b *testing.B) {
	uuid := "550e8400-e29b-41d4-a716-446655440000"
	for i := 0; i < b.N; i++ {
		_ = ValidateUUID(uuid)
	}
}
