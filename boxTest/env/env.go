package env

import (
	"boxTest/common/consts"
	"boxTest/common/helpers"
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
	// pwd, _ := os.Getwd()
	goToDir("..")
	helpers.RunCommand(false, "docker", "build",
		"-t", consts.TEST_APP_NAME,
		"--build-arg", "EMAIL=test_app@bystrzeMail.com",
		"--build-arg", "COOKIE_KEY="+consts.COOKIE_KEY,
		"--build-arg", "EMAIL_PASS=password",
		consts.DOCKERFILE_PATH)
	helpers.RunCommand(false, "docker", "run",
		"--name", consts.TEST_APP_NAME,
		"-d",
		"-p", "8080:8080",
		"-e", "SMTP_HOST="+consts.SMTP_SERVER_NAME,
		"-e", "SMTP_PORT="+consts.SMTP_PORT,
		consts.TEST_APP_NAME)

	time.Sleep(2 * time.Second)
	goToDir("boxTest")
	log.Print("test app created")
}

func cleanup() {
	log.Print("Cleaning previous test leftovers...")
	containersToClean := []string{consts.TEST_APP_NAME}
	for _, app := range containersToClean {
		if ContainerExists(app) {
			helpers.RunCommand(false, "docker", "stop", app)
			helpers.RunCommand(false, "docker", "rm", app)
			log.Printf("Removed %s", app)
		}
	}

	if dbExists(consts.TEST_DB_NAME) {
		os.Remove("test.db")
		log.Printf("Removed %s", consts.TEST_DB_NAME)
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

func ContainerExists(containerName string) bool {
	output := helpers.RunCommand(false, "docker", "ps", "-a", "--format", "{{.Names}}")
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

func EnviromentSetUP() {
	cleanup()
	setup()
}

func RunTests(m *testing.M) {
	testCases := []struct {
		name string
		run  func() int
	}{
		{"userLogin_test", func() int { return m.Run() }},
		// Add more tests here as needed
	}
	log.Printf("Running tests %v", testCases)
	var code = 0
	for _, tc := range testCases {
		startTime := time.Now()
		log.Printf("START TEST %v", tc.name)
		t := &testing.T{}
		testResult := tc.run()
		if testResult == 1 {
			log.Printf("TEST %v FAILED", tc.name)
			log.Print("\n" + helpers.GetContainerLogs(consts.TEST_APP_NAME, startTime))
			t.Fail()
			code = testResult
			log.Printf("TEST %v FAILED", tc.name)
		}
	}
	os.Exit(code)
}
