package env

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

const (
	TEST_APP_NAME     = "boxtest-web-1"
	TEST_DB_NAME      = "boxtest-db-1"
	TESTS_OUTPUT_PATH = "failedTests/"

	Localhost = "http://localhost:8080"
	CookeName = "bystrzeMagazyn"

	CONTAINER_TIME_FORMAT = "2006-01-02T15:04"
	FILENAME_TIME_FORMAT  = "2006-01-02T15-04-05"
	TIME_FORMAT_SECONDS   = "2006-01-02 15:04:05"
	DATE_FORMAT           = "Mon Jan 2 15:04:05 MST 2006"
)

var (
	DB *sql.DB
)

func composeContainers() {
	cmd := exec.Command("docker", "compose", "up", "--build", "-d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	log.Println("Starting Docker Compose...")
	err := cmd.Run()
	if err != nil {
		log.Printf("Error running Docker Compose: %v\n", err)
		os.Exit(1)
	}
	log.Print("App deployed on " + Localhost)
	log.Printf("To log to application use one of the users from the xdata.sql. Try `superAdmin`. Login link is inside the %s container", TEST_APP_NAME)
	log.Printf("to run all tests type: run main.go --tests")
}

func ConnectToDB() {
	var err error
	DB, err = sql.Open("postgres", "postgres://postgres:postgres@localhost:5433/magazyn?sslmode=disable")
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}
}

func cleanup() {
	log.Printf("Cleaning previous test leftovers")
	cmd := exec.Command("docker", "compose", "down")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Println("Starting Docker Compose down...")
	err := cmd.Run()
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

func RunTests() {
	composeContainers()
	defer cleanup()

	WAREHOUSE := "boxTest/tests/warehouse"
	USER_MANAGER := "boxTest/tests/userManager"
	testsCMD := []struct {
		name     string
		timeout  int
		location string
	}{
		{"Test_allUsers_loginAndlogut", 60, USER_MANAGER},
		{"Test_allUsers_loginSameTime", 60, USER_MANAGER},
		{"Test_reservationMadeAndStartedSameTime", 150, WAREHOUSE},
		{"Test_reservationMadeInFuture", 150, WAREHOUSE},
		{"Test_reservationNotAsPlanned", 150, WAREHOUSE},
		{"Test_reservationAdminDoesNothing", 60, WAREHOUSE},
		{"Test_AdminDoesntReturn", 60, WAREHOUSE},
		{"Test_AdminDeniesReservation", 60, WAREHOUSE},
		{"Test_ForbidenStatusChanges", 120, WAREHOUSE},
		//add tests here
	}
	var failedTests []string
	var passedTests []string
	log.Print("Running all tests from the list...")
	for _, tc := range testsCMD {
		log.Printf("RUNNING %v", tc.name)

		timeout := time.Duration(tc.timeout) * time.Second
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		MarkNewTestInLogs(tc.name)
		cmd := exec.CommandContext(ctx, "go", "test", "-run", tc.name, tc.location)
		output, err := cmd.CombinedOutput()

		log.Print(string(output))

		if err != nil {
			failedTests = append(failedTests, tc.name)
			log.Printf("\tFAILED: %v", tc.name)
			if exitError, ok := err.(*exec.ExitError); ok {
				exitCode := exitError.ExitCode()
				log.Printf("Exit code %v Err %v", exitCode, err)
			} else {
				log.Printf("Unknown error %v", err)
			}
			fileName := tc.name + "_" + time.Now().Format(FILENAME_TIME_FORMAT)
			saveLogsToFile(TESTS_OUTPUT_PATH+fileName+"_TEST.log", string(output))
			saveLogsToFile(TESTS_OUTPUT_PATH+fileName+"_LOGS.log", GetContainerLogsAfterString(TEST_APP_NAME, tc.name))
		} else {
			if strings.Contains(string(output), "cached") {
				log.Printf("%v was cached. Skipping... . You can clear cache with 'go clean -testcache'", tc.name)
				continue
			}
			passedTests = append(passedTests, tc.name)
			log.Printf("\tPASSED: %v", tc.name)
		}

	}
	log.Printf("Tests passed : \n %v", passedTests)
	log.Printf("Tests failed : \n %v", failedTests)
	if len(failedTests) != 0 {
		os.Exit(1)
	} else {
		os.Exit(0)
	}
}
