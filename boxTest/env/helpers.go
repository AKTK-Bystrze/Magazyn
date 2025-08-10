package env

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

func GetContainerLogs(containerName string, since time.Time) string {
	// TODO: fix it. It always take all logs
	if containerName == "" {
		log.Print("containerName is empty")
		return ""
	}
	sinceStr := since.Format(time.RFC3339)
	logs, err := RunCommandError(false, "docker", "logs", "--since", sinceStr, containerName)
	if err != nil {
		log.Printf("failed to get logs for container %s: %v", containerName, err)
		return ""
	}
	return logs
}

func GetContainerLogsAfterString(containerName string, stringMark string) string {
	allLogs := GetContainerLogs(containerName, time.Now())
	logs := allLogs
	if logs == "" {
		log.Printf("Can't trim logs by mark. No logs for %v", containerName)
		return allLogs
	}

	lastIndex := strings.LastIndex(logs, stringMark)
	if lastIndex == -1 {
		log.Printf("No logs after mark '%v' in %v", stringMark, containerName)
		return allLogs
	}

	logs = logs[lastIndex+len(stringMark):]
	logs = strings.TrimSpace(logs)

	if logs == "" {
		log.Printf("No logs found after the last occurrence of mark '%v' in %v", stringMark, containerName)
		return allLogs
	}

	return logs
}

func RunCommand(printOutput bool, command string, args ...string) string {
	res, err := RunCommandError(printOutput, command, args...)
	if err != nil {
		log.Fatalf("Error running command: %s %v\nOutput: %s\n", command, args, res)
	}
	return res
}

func RunCommandError(printOutput bool, command string, args ...string) (string, error) {
	if printOutput {
		log.Printf("Running command: %s %s", command, strings.Join(args, " "))
	}
	cmd := exec.Command(command, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error running command: %s %v\nOutput: %s\n", command, args, string(output))
		return string(output), fmt.Errorf("command failed: %w", err)
	}
	if printOutput {
		log.Print("Command result: ", string(output))
	}
	return string(output), nil
}

// Works for a while till system synchronize it. Oppening browser does synchronise time
func SetContainerTime(timeToSet time.Time, containerName string) {
	const maxAttempts = 5
	timeFormatted := strings.ReplaceAll(timeToSet.Format(CONTAINER_TIME_FORMAT), "T", " ")
	var lastRes string
	var success bool

	for i := 0; i < maxAttempts; i++ {
		RunCommand(false, "docker", "exec", containerName, "date", "-s", timeFormatted)
		res := RunCommand(false, "docker", "exec", containerName, "date")
		lastRes = res

		containerTime, err := time.Parse(DATE_FORMAT, strings.TrimSpace(res))
		if err == nil && containerTime.Format(CONTAINER_TIME_FORMAT) == timeToSet.Format(CONTAINER_TIME_FORMAT) {
			success = true
			log.Printf("Set time to %v for container %v", res, containerName)
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	if !success {
		log.Fatalf("can't change time on %v after %d attempts, last result: %v", containerName, maxAttempts, lastRes)
	}
}

func RevertContainerTime(containerName string) {
	SetContainerTime(time.Now(), containerName)
}

func applySQLFromFile(db *sqlx.DB, filepath string) {
	content, err := ioutil.ReadFile(filepath)
	if err != nil {
		log.Fatalf("failed to read file %s: %w", filepath, err)
	}

	_, err = db.Exec(string(content))
	if err != nil {
		log.Fatalf("failed to execute SQL from file %s: %w", filepath, err)
	}
}

func saveLogsToFile(path string, content string) {
	dir := filepath.Dir(path)
	if _, err := ioutil.ReadDir(dir); err != nil {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Fatalf("failed to create directory %s: %v", dir, err)
		}
	}
	f, err := os.OpenFile(string(path), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		log.Fatalf("failed to open file %s: %v", path, err)
	}
	defer f.Close()
	if _, err := f.WriteString(content); err != nil {
		log.Fatalf("failed to write to file %s: %v", path, err)
	}
	log.Printf("Logs saved to %s\n", path)
}

func MarkNewTestInLogs(testName string) {
	client := http.Client{}
	client.Get(Localhost + "/warehouse/user/search?______" + testName)
}
