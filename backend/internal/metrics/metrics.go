// Package metrics provides Prometheus metrics initialization and an internal HTTP server for scraping.
package metrics

import (
	"context"
	"errors"
	"net/http"
	"time"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Server encapsulates the metrics HTTP server.
type Server struct {
	httpServer *http.Server
}

// StartMetricsServer initializes Prometheus metrics, starts a background goroutine
// to update them periodically, and starts an HTTP server to expose the metrics.
func StartMetricsServer(ctx context.Context, repo repository.ReservationRepository, serviceKey string) *Server {
	// Initialize custom Prometheus metrics
	pendingReservations := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "magazyn_reservations_pending",
		Help: "Current number of pending reservations",
	})
	overdueReservations := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "magazyn_reservations_overdue",
		Help: "Current number of overdue reservations",
	})
	activeTodayReservations := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "magazyn_reservations_active_today",
		Help: "Current number of active reservations today",
	})

	prometheus.MustRegister(pendingReservations, overdueReservations, activeTodayReservations)

	// Start a background goroutine to update the metrics
	go func(ctx context.Context) {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		bgCtx := context.WithValue(context.Background(), appcontext.AccessTokenContextKey, serviceKey)

		updateMetrics := func() {
			stats, err := repo.GetDashboardStats(bgCtx)
			if err != nil {
				logger.Errorf(bgCtx, "Failed to fetch dashboard stats for metrics: %v", err)
			} else {
				pendingReservations.Set(float64(stats.PendingReservations))
				overdueReservations.Set(float64(stats.OverdueReservations))
				activeTodayReservations.Set(float64(stats.ActiveToday))
			}
		}

		updateMetrics() // Initial execution

		for {
			select {
			case <-ticker.C:
				updateMetrics()
			case <-ctx.Done():
				return
			}
		}
	}(ctx)

	// Metrics Server on a separate internal port
	metricsMux := http.NewServeMux()
	metricsMux.Handle("/metrics", promhttp.Handler())
	metricsServer := &http.Server{
		Addr:    ":9091",
		Handler: metricsMux,
	}

	go func() {
		logger.Infof(ctx, "Metrics server listening on port :9091")
		if err := metricsServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Errorf(ctx, "Metrics server failed: %v", err)
		}
	}()

	return &Server{
		httpServer: metricsServer,
	}
}

// Shutdown gracefully shuts down the metrics HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}
