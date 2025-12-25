package validation

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestSanitizeSearchTerm_SpecialCharacters_EscapesOperators verifies that PostgREST operators are properly escaped
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

// TestSanitizeSearchTerm_InjectionAttempts_BlocksAttacks tests common SQL injection patterns
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
			// The expected value already contains escaped characters, so this assertion
			// verifies that operators are properly escaped
			assert.Equal(t, tt.expected, result)
		})
	}
}

// TestValidateUUID_ValidFormat_ReturnsNil tests valid UUID formats
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

// TestValidateUUID_InvalidFormat_ReturnsError tests invalid UUID formats
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

// TestValidateISODate_ValidFormat_ReturnsNil tests valid ISO date formats
func TestValidateISODate_ValidFormat_ReturnsNil(t *testing.T) {
	tests := []struct {
		name string
		date string
	}{
		{"regular date", "2025-12-25"},
		{"first day of year", "2025-01-01"},
		{"last day of year", "2025-12-31"},
		{"leap year feb 29", "2024-02-29"},
		{"january", "2025-01-15"},
		{"december", "2025-12-15"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateISODate(tt.date)
			assert.NoError(t, err)
		})
	}
}

// TestValidateISODate_InvalidFormat_ReturnsError tests invalid date formats
func TestValidateISODate_InvalidFormat_ReturnsError(t *testing.T) {
	tests := []struct {
		name string
		date string
	}{
		{"empty string", ""},
		{"wrong format MM/DD/YYYY", "12/25/2025"},
		{"wrong format DD-MM-YYYY", "25-12-2025"},
		{"missing leading zero", "2025-1-1"},
		{"invalid month", "2025-13-01"},
		{"invalid day", "2025-12-32"},
		{"non-leap year feb 29", "2025-02-29"},
		{"too short", "2025-12"},
		{"too long", "2025-12-25T00:00:00"},
		{"invalid separator", "2025/12/25"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateISODate(tt.date)
			assert.Error(t, err)
		})
	}
}

// TestValidateEnum_AllowedValue_ReturnsNil tests valid enum values
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

// TestValidateEnum_DisallowedValue_ReturnsError tests invalid enum values
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

// TestValidateInt32Range_ValidValue_ReturnsNil tests values within range
func TestValidateInt32Range_ValidValue_ReturnsNil(t *testing.T) {
	tests := []struct {
		name  string
		value int32
		min   int32
		max   int32
	}{
		{"min boundary", 0, 0, 100},
		{"max boundary", 100, 0, 100},
		{"middle value", 50, 0, 100},
		{"negative range", -50, -100, 0},
		{"single value range", 42, 42, 42},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInt32Range(tt.value, tt.min, tt.max)
			assert.NoError(t, err)
		})
	}
}

// TestValidateInt32Range_InvalidValue_ReturnsError tests values outside range
func TestValidateInt32Range_InvalidValue_ReturnsError(t *testing.T) {
	tests := []struct {
		name  string
		value int32
		min   int32
		max   int32
	}{
		{"below min", -1, 0, 100},
		{"above max", 101, 0, 100},
		{"far below", -1000, 0, 100},
		{"far above", 1000, 0, 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInt32Range(tt.value, tt.min, tt.max)
			assert.Error(t, err)
		})
	}
}

// TestValidateStringLength_ValidLength_ReturnsNil tests strings within length range
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

// TestValidateStringLength_InvalidLength_ReturnsError tests strings outside length range
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

// Benchmark sanitization performance
func BenchmarkSanitizeSearchTerm(b *testing.B) {
	input := "test,id.eq.value(something)"
	for i := 0; i < b.N; i++ {
		_ = SanitizeSearchTerm(input)
	}
}

// Benchmark UUID validation performance
func BenchmarkValidateUUID(b *testing.B) {
	uuid := "550e8400-e29b-41d4-a716-446655440000"
	for i := 0; i < b.N; i++ {
		_ = ValidateUUID(uuid)
	}
}
