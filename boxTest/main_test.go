package main

import (
	"log"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

const (
	TEST_APP_NAME    = "test_app"
	TEST_DB_NAME     = "test_db"
	SNTP_SERVER_NAME = "mailhog"
	DOCKERFILE_PATH  = "."
)

func runCommand(command string, args ...string) string {
	log.Printf("Running command: %s %v", command, args)
	cmd := exec.Command(command, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatalf("Error running command: %s %v\nOutput: %s\n", command, args, output)
		return string(output)
	}
	log.Print("Command result: ", command, args, output)
	return string(output)
}
func goToDir(dir string) {
	err := os.Chdir(dir)
	if err != nil {
		log.Fatal("Can't change dir to " + dir)
	}
}

func createDB() {
	log.Print("Creating db...")
	runCommand("sqlite3", TEST_DB_NAME+"< ../db.schema")
	runCommand("sqlite3", ".read db_test.data")
	log.Print("Test db created")
}

func startMailHogSMTPServer() {
	log.Print("Creating SMTP server...")
	runCommand("docker", "run", "--name", SNTP_SERVER_NAME, "-d", "-p", "1025:1025", "-p", "8025:8025", "mailhog/mailhog")
	log.Print("SMTP server created")
}

func buildTestApp() {
	log.Print("Creating test app...")
	goToDir("..")
	runCommand("docker", "build", "-t", TEST_APP_NAME, "--build-arg", "EMAIL=test_app@bystrzeMail.com", "--build-arg", "EMAIL_PASS=password", DOCKERFILE_PATH)
	runCommand("docker", "run", "--name", TEST_APP_NAME, "-d", "-p", "8080:8080", "-e", "SMTP_HOST=localhost", "-e", "SMTP_PORT=1025", TEST_APP_NAME)
	time.Sleep(5 * time.Second)
	goToDir("boxTest")
	log.Print("test up created")
}

func cleanup() {
	log.Print("Cleaning previous test leftovers...")
	if containerExists(TEST_APP_NAME) {
		runCommand("docker", "stop", TEST_APP_NAME)
		runCommand("docker", "rm", TEST_APP_NAME)
		log.Printf("Removed %s", TEST_APP_NAME)
	}
	if containerExists(SNTP_SERVER_NAME) {
		runCommand("docker", "stop", SNTP_SERVER_NAME)
		runCommand("docker", "rm", SNTP_SERVER_NAME)
		log.Printf("Removed %s", SNTP_SERVER_NAME)
	}
	if dbExists(TEST_DB_NAME) {
		os.Remove("test.db")
		log.Printf("Removed %s", TEST_DB_NAME)
	}
	log.Print("Cleaning up is done")
}

func dbExists(dbPath string) bool {
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Print("db doesn't exit")
		return false
	}
	log.Print("db exists")
	return true
}

func printContainerLogs(containerName string, since time.Time) {
	// Step 1: Calculate the time difference between now and the 'since' time
	timeDiff := time.Since(since)

	// Step 2: Get the current time in the container using 'docker exec'
	containerTimeOutput := runCommand("docker", "exec", containerName, "date", "+%Y-%m-%dT%H:%M:%S.%N")
	containerCurrentTime, err := time.Parse("2006-01-02T15:04:05.999999999", strings.TrimSpace(containerTimeOutput))
	if err != nil {
		log.Fatalf("Error parsing container time: %v", err)
	}

	// Step 3: Calculate the adjusted time in the container
	containerAdjustedTime := containerCurrentTime.Add(-timeDiff)
	containerAdjustedTimeFormatted := containerAdjustedTime.Format(time.RFC3339Nano)

	// Step 4: Fetch logs from the container starting from the adjusted time
	logs := runCommand("docker", "logs", "--since", containerAdjustedTimeFormatted, containerName)

	// Log the output
	log.Printf("LOGS for container %s from %s:\n%s\n", containerName, containerAdjustedTimeFormatted, logs)
}

func containerExists(containerName string) bool {
	output := runCommand("docker", "ps", "-a", "--format", "{{.Names}}")
	for _, name := range strings.Split(output, "\n") {
		if name == containerName {
			return true
		}
	}
	return false
}

func setup() {
	log.Print("Setting up for test...")
	createDB()
	startMailHogSMTPServer()
	buildTestApp()
	log.Print("Setting up is done")
}

// TestMain runs setup and cleanup
func TestMain(m *testing.M) {
	cleanup()
	setup()
	// Store the names of all tests
	testCases := []struct {
		name string
		run  func() int
	}{
		{"userLogin_test", func() int { return m.Run() }},
		// {"TestExample2", func() int { return m.Run() }},
		// Add more tests here as needed
	}
	var code = 0
	for _, tc := range testCases {
		startTime := time.Now() // Capture the start time
		log.Printf("START TEST %v", tc.name)
		t := &testing.T{}
		testResult := tc.run()
		if testResult == 1 {
			code = testResult
		}
		printContainerLogs(TEST_APP_NAME, startTime) // Print logs after each test
		if code != 0 {
			t.Fail() // Mark the test as failed if the exit code is not 0
		}
	}
	os.Exit(code)
}
