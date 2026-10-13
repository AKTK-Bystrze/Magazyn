// Package constants defines application-wide constants including database table names,
// pagination defaults, authentication settings, and storage configuration.
package constants

// Database table names to avoid hardcoded strings.
const (
	TableProfiles        = "profiles"
	TableEquipment       = "equipment"
	TableReservations    = "reservations"
	TableEquipmentTypes  = "equipment_types"
	TableMaintenanceLogs = "maintenance_logs"
	TableCreditHistory   = "credit_history"
	TableCreditRequests  = "credit_requests"
)

// Reservation status values that represent the lifecycle of an equipment rental.
const (
	// ReservationStatusPending indicates reservation is created but equipment is not yet picked up.
	ReservationStatusPending = "PENDING"
	// ReservationStatusRented indicates equipment is currently rented out.
	ReservationStatusRented = "RENTED"
	// ReservationStatusReturned indicates equipment is returned and reservation is complete.
	ReservationStatusReturned = "RETURNED"
	// ReservationStatusDenied indicates reservation was denied by an administrator.
	ReservationStatusDenied = "DENIED"
	// ReservationStatusCancelled indicates reservation was cancelled.
	ReservationStatusCancelled = "CANCELLED"
)

// Equipment status values that indicate the current condition and availability.
const (
	// EquipmentStatusOK indicates equipment is in good condition and available.
	EquipmentStatusOK = "ok"
	// EquipmentStatusBroken indicates equipment is broken and unusable.
	EquipmentStatusBroken = "broken"
	// EquipmentStatusBlocked indicates equipment is blocked by an admin (e.g. for maintenance).
	EquipmentStatusBlocked = "blocked"
)

// Credit reason values used when adjusting user credit balances.
const (
	// CreditReasonWorkCredit indicates credits awarded for approved help requests.
	CreditReasonWorkCredit = "work_credit"
)

// Pagination defaults and limits for list endpoints.
const (
	// DefaultPage is the default page number when not specified.
	DefaultPage = 1
	// DefaultPerPage is the default number of items per page.
	DefaultPerPage = 25
	// MaxPerPage is the maximum items per page to prevent excessive data transfer.
	MaxPerPage = 100
)

// AllowedPerPageValues defines the standard allowed page sizes for pagination.
var AllowedPerPageValues = []int{10, 25, 50, 100}

// Storage configuration for file uploads and asset management.
const (
	// StorageBucket is the Supabase storage bucket name for equipment images.
	StorageBucket = "equipment"
)

// Calendar-related defaults and limits for availability endpoints.
const (
	// CalendarDefaultDays is the default number of days for calendar view.
	CalendarDefaultDays = 30
	// CalendarMaxDays is the maximum number of days allowed in a single request.
	CalendarMaxDays = 90
	// CalendarMinDays is the minimum number of days for calendar view.
	CalendarMinDays = 1
	// TopRentersLimit is the number of top renters to include in equipment stats.
	TopRentersLimit = 5
	// AnalyticsMinYear is the minimum year for analytics filters.
	AnalyticsMinYear = 2000
	// AnalyticsMaxYear is the maximum year for analytics filters.
	AnalyticsMaxYear = 2100
	// DateFormatISO is the ISO date format for Go time parsing.
	DateFormatISO = "2006-01-02"
)

// Validation constraints for input parameters.
const (
	// UUIDLength is the character length of a standard UUID string.
	UUIDLength = 36
	// DateLengthISO is the length of an ISO 8601 date string (YYYY-MM-DD).
	DateLengthISO = 10
	// MinMonth is the minimum month value.
	MinMonth = 1
	// MaxMonth is the maximum month value.
	MaxMonth = 12
)

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

// Input length constraints.
const (
	// MaxSearchLength is the maximum character length for search queries.
	MaxSearchLength = 100
)
