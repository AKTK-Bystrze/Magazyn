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
func TestValidateUUID_ValidFormat_ReturnsNil(t *testing.T) {
	tests := []struct {
		name string
		uuid string
	}{
		{"lowercase", "550e8400-e29b-41d4-a716-446655440000"},
		{"uppercase", "550E8400-E29B-41D4-A716-446655440000"},
		{"mixed case", "550e8400-E29B-41d4-A716-446655440000"},
		{"all zeros", "00000000-0000-0000-0000-000000000000"},
		{"all f's", "ffffffff-ffff-ffff-ffff-ffffffffffff"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUUID(tt.uuid)
			assert.NoError(t, err)
		})
	}
}
func TestValidateUUID_InvalidFormat_ReturnsError(t *testing.T) {
	tests := []struct {
		name string
		uuid string
	}{
		{"empty string", ""},
		{"too short", "550e8400-e29b-41d4-a716"},
		{"too long", "550e8400-e29b-41d4-a716-446655440000-extra"},
		{"missing hyphens", "550e8400e29b41d4a716446655440000"},
		{"wrong hyphen positions", "550e84-00e29b-41d4a716-446655440000"},
		{"invalid characters", "550e8400-e29b-41d4-a716-gggggggggggg"},
		{"not a uuid", "not-a-valid-uuid-string-here"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUUID(tt.uuid)
			assert.Error(t, err)
		})
	}
}
func TestValidateEnum_AllowedValue_ReturnsNil(t *testing.T) {
	allowedStatuses := []string{"PENDING", "APPROVED", "DENIED"}
	tests := []struct {
		name  string
		value string
	}{
		{"first value", "PENDING"},
		{"middle value", "APPROVED"},
		{"last value", "DENIED"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEnum(tt.value, allowedStatuses)
			assert.NoError(t, err)
		})
	}
}
func TestValidateEnum_DisallowedValue_ReturnsError(t *testing.T) {
	allowedStatuses := []string{"PENDING", "APPROVED", "DENIED"}
	tests := []struct {
		name  string
		value string
	}{
		{"empty string", ""},
		{"wrong case", "pending"},
		{"invalid value", "INVALID"},
		{"partial match", "PEND"},
		{"similar value", "APPROVED_EXTRA"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEnum(tt.value, allowedStatuses)
			assert.Error(t, err)
		})
	}
}
func TestValidateStringLength_ValidLength_ReturnsNil(t *testing.T) {
	tests := []struct {
		name      string
		str       string
		minLength int
		maxLength int
	}{
		{"min boundary", "ab", 2, 10},
		{"max boundary", "abcdefghij", 2, 10},
		{"middle length", "abcde", 2, 10},
		{"empty allowed", "", 0, 10},
		{"exact length", "test", 4, 4},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateStringLength(tt.str, tt.minLength, tt.maxLength)
			assert.NoError(t, err)
		})
	}
}
func TestValidateStringLength_InvalidLength_ReturnsError(t *testing.T) {
	tests := []struct {
		name      string
		str       string
		minLength int
		maxLength int
	}{
		{"too short", "a", 2, 10},
		{"too long", "abcdefghijk", 2, 10},
		{"empty not allowed", "", 1, 10},
		{"way too long", "this is a very long string that exceeds the maximum", 1, 10},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateStringLength(tt.str, tt.minLength, tt.maxLength)
			assert.Error(t, err)
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
