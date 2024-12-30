package env

import (
	"context"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

const (
	TEST_APP_NAME        = "test_app"
	DB_PATH_IN_CONTAINER = "/app/magazyn.db"

	Localhost = "http://localhost:8080"
	CookeName = "bystrzeMagazyn"

	TIME_FORMAT    = "2006-01-02T15:04"
	DB_TIME_FORMAT = "2006-01-02 15:04:05"
)

func composeContainers() {
	projectRoot, err := os.Getwd()
	if err != nil {
		log.Printf("Error getting current directory: %v\n", err)
		os.Exit(1)
	}
	cmd := exec.Command("docker-compose", "up", "--build", "-d")
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	log.Println("Starting Docker Compose...")
	err = cmd.Run()
	if err != nil {
		log.Printf("Error running Docker Compose: %v\n", err)
		os.Exit(1)
	}

	log.Println("Docker Compose ran successfully.")
}

func cleanup() {
	log.Printf("Cleaning previous test leftovers")
	projectRoot, err := os.Getwd()
	if err != nil {
		log.Printf("Error getting current directory: %v\n", err)
		os.Exit(1)
	}
	cmd := exec.Command("docker-compose", "down")
	cmd.Dir = projectRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Println("Starting Docker Compose down...")
	err = cmd.Run()
	if err != nil {
		log.Printf("Error running Docker Compose down: %v\n", err)
		os.Exit(1)
	}
	log.Println("Cleaned successfully.")
}

func ContainerExists(containerName string) bool {
	output := RunCommand(false, "docker", "ps", "-a", "--format", "{{.Names}}")
	for _, name := range strings.Split(output, "\n") {
		if name == containerName {
			return true
		}
	}
	return false
}

func EnviromentSetUP() {
	cleanup()
	composeContainers()
}

func RunTests() {
	WAREHOUSE := "boxTest/tests/warehouse"
	USEER_MANAGER := "boxTest/tests/userManager"
	testsCMD := []struct {
		name     string
		timeout  int
		location string
	}{
		{"Test_allUsers_loginAndlogut", 60, USEER_MANAGER},
		{"Test_allUsers_loginSameTime", 60, USEER_MANAGER},
		{"Test_reservationMadeAndStartedSameTime", 150, WAREHOUSE},
		{"Test_reservationMadeInFuture", 150, WAREHOUSE},
		{"Test_reservationNotAsPlanned", 150, WAREHOUSE},
		{"Test_reservationAdminDoesNothing", 60, WAREHOUSE},
		{"Test_reservationAdminDoesntApprove", 60, WAREHOUSE},
		{"Test_AdminDoesntRent", 60, WAREHOUSE},
		{"Test_AdminDoesntReturn", 60, WAREHOUSE},
		{"Test_AdminDeniesReservation", 60, WAREHOUSE},
		{"Test_AdminDeniesReservationAfterApproving", 60, WAREHOUSE},
		//add test here
	}
	var failedTests []string
	var passedTests []string
	log.Print("Running all tests from the list...")
	for _, tc := range testsCMD {
		log.Printf("RUNNING %v", tc.name)

		timeout := time.Duration(tc.timeout) * time.Second
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()

		cmd := exec.CommandContext(ctx, "go.exe", "test", "-run", tc.name, tc.location)
		output, err := cmd.CombinedOutput()
		if err != nil {
			failedTests = append(failedTests, tc.name)
			log.Printf("\tFAILED: %v", tc.name)
			if exitError, ok := err.(*exec.ExitError); ok {
				exitCode := exitError.ExitCode()
				log.Printf("Exit code %v Err %v", exitCode, err)
			} else {
				exitCode := exitError.ExitCode()
				log.Printf("Unknown exit code %v Err %v", exitCode, err)
			}
			log.Printf("\tLOGS\n")
			log.Print(string(output))
			log.Printf("\tFAILED: %v", tc.name)
		} else {
			passedTests = append(passedTests, tc.name)
			log.Printf("\tPASSED: %v", tc.name)
		}

	}
	log.Printf("Tessts passed : \n %v", passedTests)
	log.Printf("Tessts failed : \n %v", failedTests)
	if len(failedTests) != 0 {
		os.Exit(1)
	} else {
		os.Exit(0)
	}
}
