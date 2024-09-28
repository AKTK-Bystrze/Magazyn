package main

import (
	"boxTest/common"
	"log"
	"os"
	"strings"
	"testing"
	"time"
)

func goToDir(dir string) {
	err := os.Chdir(dir)
	if err != nil {
		log.Fatal("Can't change dir to " + dir)
	}
}

func buildTestApp() {
	log.Print("Creating test app...")
	goToDir("..")
	common.RunCommand("docker", "build", "-t", common.TEST_APP_NAME, "--build-arg", "EMAIL=test_app@bystrzeMail.com", "--build-arg", "EMAIL_PASS=password", common.DOCKERFILE_PATH)
	common.RunCommand("docker", "run", "--name", common.TEST_APP_NAME, "-d", "-p", "8080:8080", "-e", "SMTP_HOST="+common.SMTP_SERVER_NAME, "-e", "SMTP_PORT="+common.SMTP_PORT, common.TEST_APP_NAME)
	time.Sleep(5 * time.Second)
	goToDir("boxTest")
	log.Print("test app created")
}

func cleanup() {
	log.Print("Cleaning previous test leftovers...")
	containersToClean := []string{common.TEST_APP_NAME}
	for _, app := range containersToClean {
		if containerExists(app) {
			common.RunCommand("docker", "stop", app)
			common.RunCommand("docker", "rm", app)
			log.Printf("Removed %s", app)
		}
	}

	if dbExists(common.TEST_DB_NAME) {
		os.Remove("test.db")
		log.Printf("Removed %s", common.TEST_DB_NAME)
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

func containerExists(containerName string) bool {
	output := common.RunCommand("docker", "ps", "-a", "--format", "{{.Names}}")
	for _, name := range strings.Split(output, "\n") {
		if name == containerName {
			return true
		}
	}
	return false
}

func setup() {
	log.Print("Setting up for test...")
	// createDB() //TODO
	buildTestApp()
	log.Print("Setting up is done")
}

func TestMain(m *testing.M) {
	cleanup()
	setup()
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
		// startTime := time.Now() // Capture the start time
		log.Printf("START TEST %v", tc.name)
		t := &testing.T{}
		testResult := tc.run()
		if testResult == 1 {
			log.Printf("Test %v failed", tc.name)
			t.Fail()
			code = testResult
		}
		// printContainerLogs(TEST_APP_NAME, startTime) // Print logs after each test
	}
	os.Exit(code)
}
