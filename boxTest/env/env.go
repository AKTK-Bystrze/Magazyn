package env

import (
	"log"
	"os"
	"strings"
	"testing"
	"time"
)

const (
	TEST_APP_NAME    = "test_app"
	TEST_DB_PATH     = "/app/magazyn.db"
	SMTP_SERVER_NAME = "test_server"
	DOCKERFILE_PATH  = "."
	NETWORK_NO_WEB   = "test_network_no_web"
	SMTP_PORT        = "3465"
	COOKIE_KEY       = ""

	Localhost = "http://localhost:8080"
	CookeName = "bystrzeMagazyn"
)

func goToDir(dir string) {
	err := os.Chdir(dir)
	if err != nil {
		log.Fatal("Can't change dir to " + dir)
	}
}

func createTestDB() {
	// Run the first command
	log.Print("Createing DB...")
	goToDir("..")
	RunCommand(false, "sh", "-c", "sqlite3 magazyn.db < db.schema")
	RunCommand(false, "sh", "-c", "sqlite3 magazyn.db \".read boxTest/db_test.data\"")
	goToDir("boxTest")
	log.Print("DB created")

	//todo
	//create db file according to schema
	//append test data
	//edits dockerfile to take db by given path
	//test db should be in /boxtest
	//update deploy script to take db that is in main catalog and is called bystrze
	//create deploy script with mock of getting prod db
	//decploy script runs tests before deploying
}

func buildTestApp() {
	log.Print("Building and running test app...")
	goToDir("..")
	RunCommand(false, "docker", "build",
		"--target", "test",
		"-t", TEST_APP_NAME,
		"--build-arg", "EMAIL=test_app@bystrzeMail.com",
		"--build-arg", "COOKIE_KEY="+COOKIE_KEY,
		"--build-arg", "EMAIL_PASS=password",
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
	goToDir("boxTest")
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

	if dbExists(TEST_DB_PATH) {
		os.Remove("test.db")
		log.Printf("Removed %s", TEST_DB_PATH)
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

func RunTests(m *testing.M) {
	testCases := []struct {
		name string
		run  func() int
	}{
		{"userLogin_test", func() int { return m.Run() }},
		// todo add running all thests from the test app packages with correct timeout
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
			log.Print("\n" + GetContainerLogs(TEST_APP_NAME, startTime))
			t.Fail()
			code = testResult
			log.Printf("TEST %v FAILED", tc.name)
		}
	}
	os.Exit(code)
}
