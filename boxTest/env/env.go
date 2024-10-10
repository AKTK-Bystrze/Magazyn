package env

import (
	"context"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

const (
	TEST_APP_NAME        = "test_app"
	DB_PATH_IN_CONTAINER = "/app/magazyn.db"
	DB_PATH_IN_PROJ      = "bystrze_test.db"
	SMTP_SERVER_NAME     = "test_server"
	DOCKERFILE_PATH      = "../"
	NETWORK_NO_WEB       = "test_network_no_web"
	SMTP_PORT            = "3465"
	COOKIE_KEY           = ""

	Localhost = "http://localhost:8080"
	CookeName = "bystrzeMagazyn"
)

func createTestDB() {
	log.Print("Creating DB...")
	db, err := sqlx.Open("sqlite3", DB_PATH_IN_PROJ)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	applySQLFromFile(db, "../db.schema")
	applySQLFromFile(db, "../boxTest/db_test.data")
	log.Print("DB created")
}

func buildTestApp() {
	log.Print("Building and running test app...")
	RunCommand(false, "docker", "build",
		"--target", "test",
		"-t", TEST_APP_NAME,
		"--build-arg", "EMAIL=test_app@bystrzeMail.com",
		"--build-arg", "COOKIE_KEY="+COOKIE_KEY,
		"--build-arg", "EMAIL_PASS=password",
		"--build-arg", "DB_PATH=./boxTest/"+DB_PATH_IN_PROJ,
		DOCKERFILE_PATH)
	RunCommand(false, "docker", "run",
		"--name", TEST_APP_NAME,
		"--cap-add=SYS_TIME",
		"-d",
		"-p", "8080:8080",
		"-e", "SMTP_HOST="+SMTP_SERVER_NAME,
		"-e", "SMTP_PORT="+SMTP_PORT,
		TEST_APP_NAME)

	time.Sleep(2 * time.Second)
	log.Print("test app created")
}

func cleanup() {
	log.Print("Cleaning previous test leftovers...")
	containersToClean := []string{TEST_APP_NAME}
	for _, app := range containersToClean {
		if ContainerExists(app) {
			RunCommand(false, "docker", "stop", app)
			RunCommand(false, "docker", "rm", app)
			log.Printf("Removed %s", app)
		}
	}

	if dbExists(DB_PATH_IN_PROJ) {
		os.Remove(DB_PATH_IN_PROJ)
		log.Printf("Removed %s", DB_PATH_IN_PROJ)
	}
	log.Print("Cleaning up is done")
}

func dbExists(dbPath string) bool {
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return false
	}
	return true
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

func setup() {
	log.Print("Setting up for test...")
	createTestDB()
	buildTestApp()
	log.Print("Setting up is done")
}

func EnviromentSetUP() {
	cleanup()
	setup()
}

func RunTests() {
	WAREHOUSE := "boxTest/tests/warehouse"
	USEER_MANAGER := "boxTest/tests/userManager"
	testsCMD := []struct {
		name     string
		timeout  int
		location string
	}{
		{"Test_allUsers_loginAndlogut", 20, USEER_MANAGER},
		{"Test_allUsers_loginSameTime", 30, USEER_MANAGER},
		{"Test_reservationMadeAndStartedSameTime", 60, WAREHOUSE},
		{"Test_reservationMadeInFuture", 60, WAREHOUSE},
		{"Test_reservationNotAsPlanned", 100, WAREHOUSE},
		{"Test_reservationAdminDoesNothing", 40, WAREHOUSE},
		{"Test_reservationAdminDoesntApprove", 30, WAREHOUSE},
		{"Test_AdminDoesntRent", 40, WAREHOUSE},
		{"Test_AdminDoesntReturn", 40, WAREHOUSE},
		{"Test_AdminDeniesReservation", 40, WAREHOUSE},
		{"Test_AdminDeniesReservationAfterApproving", 30, WAREHOUSE},
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
