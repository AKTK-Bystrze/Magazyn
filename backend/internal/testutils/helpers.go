package testutils

// StringPtr returns a pointer to the passed string value.
func StringPtr(s string) *string {
	return &s
}
