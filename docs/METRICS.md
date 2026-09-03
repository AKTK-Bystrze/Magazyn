# Magazyn Metrics & Observability Guide

This guide explains how observability is structured in the Magazyn project, how to run it locally, and how to instrument the Go backend with new Prometheus metrics.

## Architecture Overview

Magazyn uses a decoupled observability stack:
- **Backend (Go)**: Exposes Prometheus metrics at `/metrics`.
- **Caddy**: Exposes its own HTTP access metrics at `/metrics`.
- **Grafana Alloy**: A lightweight collector (OpenTelemetry / Prometheus agent) that scrapes both the Backend and Caddy every 60 seconds.
- **Prometheus**: A time-series database where Alloy remote-writes the collected metrics.
- **Grafana**: A visualization dashboard that queries Prometheus.

By default, the observability stack is **disabled** to keep the core local environment lightweight. 

## Running the Application

### 1. Default Setup (No Metrics)
To run just the application (Frontend, Backend, Caddy, Supabase):
```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d
```
*Note: The backend will still expose the `/metrics` endpoint, but nothing will collect the data.*

### 2. Full Setup (With Metrics)
To run the application alongside Grafana, Prometheus, and Alloy:
```bash
docker compose -f infra/docker-compose.yml -f infra/docker-compose.obs.yml --env-file .env up -d
```

Once running, you can access Grafana at:
**http://localhost:3000**
*(No login required, it uses anonymous Admin access locally).*

---

## How to Add New Custom Metrics

Magazyn uses the `github.com/prometheus/client_golang/prometheus` library. 

### Step 1: Define and Register the Metric
Metrics are typically initialized and registered in `backend/cmd/api/main.go`. 

For example, to add a new metric tracking active user sessions:
```go
import "github.com/prometheus/client_golang/prometheus"

// 1. Define the Gauge or Counter
activeSessions := prometheus.NewGauge(prometheus.GaugeOpts{
    Name: "magazyn_active_sessions",
    Help: "Current number of active user sessions",
})

// 2. Register it with the Prometheus registry
prometheus.MustRegister(activeSessions)
```

### Step 2: Update the Metric Value
You can update the metric anywhere in your code. If the metric reflects a point-in-time value from the database, the best approach is to spawn a background goroutine in `main.go` that periodically polls the database.

**Security Note (RLS)**: If your database uses Row-Level Security (RLS) and you are querying via the Supabase client in a background task, the query will run as an anonymous user and return 0 rows. To bypass RLS and get true counts, you must inject the Service Role Key into the context:
```go
bgCtx := context.WithValue(context.Background(), appcontext.AccessTokenContextKey, appState.Config.SupabaseServiceKey)

go func() {
    ticker := time.NewTicker(60 * time.Second)
    defer ticker.Stop()
    for {
        count, err := authRepo.GetActiveSessions(bgCtx)
        if err == nil {
            activeSessions.Set(float64(count))
        }
        <-ticker.C
    }
}()
```

### Step 3: Add to Grafana Dashboard
Grafana dashboards are provisioned from code via `infra/grafana/provisioning/dashboards/magazyn.json`.

To add a new chart for your metric:
1. Open `infra/grafana/provisioning/dashboards/generate.py`.
2. Add a new panel definition to the `panels` array.
3. For the query target, always use the job filter `job="prometheus.scrape.magazyn_backend"` so it only fetches metrics from the Go container (and not Caddy's internal metrics). Example:
```json
{
  "expr": "magazyn_active_sessions{job=\"prometheus.scrape.magazyn_backend\"}",
  "legendFormat": "Active Sessions"
}
```
4. Run `python infra/grafana/provisioning/dashboards/generate.py` to regenerate the JSON.
5. Restart the Grafana container:
```bash
docker restart magazyn-grafana
```
6. Hard-refresh your browser (`F5`).
