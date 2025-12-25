// Package constants defines application-wide constants for reservation status, equipment status,
// pagination defaults, authentication settings, and storage configuration.
package constants

import "time"

// ============================================================================
// Database Table Constants
// ============================================================================

// Database table names to avoid hardcoded strings.
const (
	TableProfiles        = "profiles"
	TableEquipment       = "equipment"
	TableReservations    = "reservations"
	TableEquipmentTypes  = "equipment_types"
	TableMaintenanceLogs = "maintenance_logs"
	TableCreditHistory   = "credit_history"
)

// ============================================================================
// Reservation Status Constants
// ============================================================================

// Reservation status values that represent the lifecycle of an equipment rental.
const (
	ReservationStatusPending   = "PENDING"   // Reservation created but equipment not yet picked up
	ReservationStatusRented    = "RENTED"    // Equipment currently rented out
	ReservationStatusReturned  = "RETURNED"  // Equipment returned and reservation complete
	ReservationStatusDenied    = "DENIED"    // Reservation denied by admin
	ReservationStatusCancelled = "CANCELLED" // Reservation cancelled
)

// ============================================================================
// Equipment Status Constants
// ============================================================================

// Equipment status values that indicate the current condition and availability.
const (
	EquipmentStatusOK      = "ok"      // Equipment is in good condition and available
	EquipmentStatusBroken  = "broken"  // Equipment broken, not usable
	EquipmentStatusBlocked = "blocked" // Equipment blocked by admin (e.g. for maintenance)

)

// ============================================================================
// Pagination Constants
// ============================================================================

// Pagination defaults and limits for list endpoints.
const (
	DefaultPage    = 1   // Default page number when not specified
	DefaultPerPage = 25  // Default number of items per page
	MaxPerPage     = 100 // Maximum items per page to prevent excessive data transfer
)

// AllowedPerPageValues defines the standard allowed page sizes for pagination.
var AllowedPerPageValues = []int{10, 25, 50, 100}

// ============================================================================
// Authentication Constants
// ============================================================================

// Authentication-related timing and security constants.
const (
	// SessionExpiryDuration defines how long a session is valid (per PRD requirement 3.1.4).
	// Sessions expire after 2 hours and users must re-authenticate.
	SessionExpiryDuration = 2 * time.Hour
)

// ============================================================================
// Storage Constants
// ============================================================================

// Storage configuration for file uploads and asset management.
const (
	StorageBucket = "equipment" // Supabase storage bucket name for equipment images
)

// ============================================================================
// Calendar Constants
// ============================================================================

// Calendar-related defaults and limits for availability endpoints.
const (
	CalendarDefaultDays = 30           // Default number of days for calendar view
	CalendarMaxDays     = 90           // Maximum number of days allowed in a single request
	CalendarMinDays     = 1            // Minimum number of days for calendar view
	TopRentersLimit     = 5            // Number of top renters to include in equipment stats
	AnalyticsMinYear    = 2000         // Minimum year for analytics filters
	AnalyticsMaxYear    = 2100         // Maximum year for analytics filters
	DateFormatISO       = "2006-01-02" // ISO date format for Go time parsing
)

// ============================================================================
// Validation Constants
// ============================================================================

// Validation constraints for input parameters.
const (
	UUIDLength    = 36 // Length of a standard UUID string
	DateLengthISO = 10 // Length of an ISO 8601 date string (YYYY-MM-DD)
	MinMonth      = 1  // Minimum month value
	MaxMonth      = 12 // Maximum month value
)

// ============================================================================
// Input Validation Constants
// ============================================================================

// ValidEquipmentStatuses lists all valid equipment status values for validation.
var ValidEquipmentStatuses = []string{EquipmentStatusOK, EquipmentStatusBroken, EquipmentStatusBlocked}

// ValidReservationStatuses lists all valid reservation status values for validation.
var ValidReservationStatuses = []string{
	ReservationStatusPending,
	ReservationStatusRented,
	ReservationStatusReturned,
	ReservationStatusDenied,
	ReservationStatusCancelled,
}

// Input length constraints
const (
	MaxSearchLength     = 100 // Maximum length for search queries
	MaxInternalIDLength = 50  // Maximum length for equipment internal IDs
	MinPasswordLength   = 8   // Minimum password length for user accounts
)
