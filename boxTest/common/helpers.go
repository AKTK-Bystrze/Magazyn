package common

import (
	"log"
	"os/exec"
	"time"
)

func PrintContainerLogs(containerName string, since time.Time) string {
	// Step 1: Calculate the time difference between now and the 'since' time
	timeDiff := time.Since(since)

	// Step 4: Fetch logs from the container starting from the adjusted time
	logs := RunCommand("docker", "logs", "--since", timeDiff.String(), containerName)

	return logs
}

func RunCommand(command string, args ...string) string {
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
