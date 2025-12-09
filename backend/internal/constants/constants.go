// Package constants defines application-wide constants for reservation status, equipment status,
// pagination defaults, authentication settings, and storage configuration.
package constants

import "time"

// ============================================================================
// Reservation Status Constants
// ============================================================================

// Reservation status values that represent the lifecycle of an equipment rental.
const (
	ReservationStatusPending  = "PENDING"  // Reservation created but equipment not yet picked up
	ReservationStatusRented   = "RENTED"   // Equipment currently rented out
	ReservationStatusReturned = "RETURNED" // Equipment returned and reservation complete
)

// ============================================================================
// Equipment Status Constants
// ============================================================================

// Equipment status values that indicate the current condition and availability.
const (
	EquipmentStatusOK          = "ok"          // Equipment is in good condition and available
	EquipmentStatusMaintenance = "maintenance" // Equipment undergoing maintenance, not available
	EquipmentStatusDamaged     = "damaged"     // Equipment damaged, needs repair
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
