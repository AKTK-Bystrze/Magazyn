# Calendar & Analytics API Reference

This document provides detailed API documentation for the Calendar and Analytics endpoints.

---

## Calendar Endpoints

### GET /calendar/availability

Returns equipment availability for a specified date range, showing which dates are available or reserved.

**Authentication**: Required (any authenticated user)

**Authorization**: All authenticated users

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `equipment_id` | UUID | No | - | Filter by specific equipment ID |
| `start_date` | String | No | Today | Start date in `YYYY-MM-DD` format |
| `days` | Integer | No | 30 | Number of days to return (1-90) |

#### Response

**Status**: `200 OK`

```json
{
  "calendar": [
    {
      "date": "2025-12-01",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "is_available": true,
      "reservation_id": null,
      "reservation_status": null
    },
    {
      "date": "2025-12-02",
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "is_available": false,
      "reservation_id": "reservation-uuid",
      "reservation_status": "PENDING"
    }
  ]
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid query parameters (invalid date format, days out of range, invalid UUID) |
| 401 | Missing or invalid authentication token |
| 500 | Internal server error |

#### Example Request

```bash
# Get 7-day calendar for specific equipment
curl -X GET "https://api.example.com/calendar/availability?equipment_id=uuid&start_date=2025-12-01&days=7" \
  -H "Authorization: Bearer <token>"

# Get default 30-day calendar for all equipment
curl -X GET "https://api.example.com/calendar/availability" \
  -H "Authorization: Bearer <token>"
```

---

## Analytics Endpoints

> [!IMPORTANT]
> Analytics endpoints require **Admin** or **Super Admin** role.

### GET /analytics/equipment-stats

Returns aggregated usage statistics for equipment, including total reservations, days rented, utilization rate, and top renters.

**Authentication**: Required

**Authorization**: Admin or Super Admin

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | Integer | No | - | Filter by year (2000-2100) |
| `month` | Integer | No | - | Filter by month (1-12) |
| `equipment_id` | UUID | No | - | Filter by specific equipment ID |

#### Response

**Status**: `200 OK`

```json
{
  "equipment_stats": [
    {
      "equipment_id": "uuid",
      "equipment_name": "Red Kayak",
      "equipment_type": "Kayaks",
      "total_reservations": 25,
      "total_days_rented": 45,
      "utilization_rate": 0.75,
      "top_renters": [
        {
          "user_id": "user-uuid",
          "username": "john_doe",
          "reservation_count": 5,
          "days_rented": 12
        }
      ]
    }
  ],
  "period": {
    "year": 2025,
    "month": 12
  }
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid query parameters |
| 401 | Missing or invalid authentication token |
| 403 | Insufficient permissions (not Admin/SuperAdmin) |
| 500 | Internal server error |

#### Example Request

```bash
# Get all equipment stats
curl -X GET "https://api.example.com/analytics/equipment-stats" \
  -H "Authorization: Bearer <admin-token>"

# Get stats for specific equipment in December 2025
curl -X GET "https://api.example.com/analytics/equipment-stats?equipment_id=uuid&year=2025&month=12" \
  -H "Authorization: Bearer <admin-token>"
```

---

### GET /analytics/user-stats

Returns aggregated activity statistics for users, including total reservations, credits spent, and favorite equipment type.

**Authentication**: Required

**Authorization**: Admin or Super Admin

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `year` | Integer | No | - | Filter by year (2000-2100) |
| `month` | Integer | No | - | Filter by month (1-12) |

#### Response

**Status**: `200 OK`

```json
{
  "user_stats": [
    {
      "user_id": "uuid",
      "username": "john_doe",
      "total_reservations": 15,
      "total_credits_spent": 500,
      "last_reservation_date": "2025-12-01",
      "favorite_equipment_type": "Kayaks"
    }
  ],
  "period": {
    "year": 2025,
    "month": null
  }
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid query parameters |
| 401 | Missing or invalid authentication token |
| 403 | Insufficient permissions (not Admin/SuperAdmin) |
| 500 | Internal server error |

#### Example Request

```bash
# Get all user stats
curl -X GET "https://api.example.com/analytics/user-stats" \
  -H "Authorization: Bearer <admin-token>"

# Get stats for 2025
curl -X GET "https://api.example.com/analytics/user-stats?year=2025" \
  -H "Authorization: Bearer <admin-token>"
```

---

## Data Sources

These endpoints rely on the following database views:

- `analytics_equipment_stats` - Aggregated equipment usage data
- `analytics_user_stats` - Aggregated user activity data

Both views are defined in the initial database migration (`20251120194634_initial_schema.sql`).
