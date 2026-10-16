package reservation_test

import (
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/testutils/mocks"
)

type testServiceFixture struct {
	repo         *mocks.MockReservationRepository
	equipRepo    *mocks.MockEquipmentRepository
	userRepo     *mocks.MockUserRepository
	emailService *mocks.MockEmailService
	svc          reservation.ReservationService
}

func setupTestFixture() testServiceFixture {
	repo := new(mocks.MockReservationRepository)
	equipRepo := new(mocks.MockEquipmentRepository)
	userRepo := new(mocks.MockUserRepository)
	emailService := new(mocks.MockEmailService)
	svc := reservation.NewReservationService(repo, equipRepo, userRepo, emailService)
	return testServiceFixture{
		repo:         repo,
		equipRepo:    equipRepo,
		userRepo:     userRepo,
		emailService: emailService,
		svc:          svc,
	}
}

func setupTestService() (*mocks.MockReservationRepository, *mocks.MockEquipmentRepository, *mocks.MockUserRepository, *mocks.MockEmailService, reservation.ReservationService) {
	f := setupTestFixture()
	return f.repo, f.equipRepo, f.userRepo, f.emailService, f.svc
}
