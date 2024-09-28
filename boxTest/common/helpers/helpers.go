package helpers

import (
	"log"
	"os/exec"
	"time"
)

func GetContainerLogs(containerName string, since time.Time) string {
	timeDiff := time.Since(since)
	logs := RunCommand(false, "docker", "logs", "--since", timeDiff.String(), containerName)
	return logs
}

func RunCommand(printOutput bool, command string, args ...string) string {
	if printOutput {
		log.Printf("Running command: %s %v", command, args)
	}
	cmd := exec.Command(command, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatalf("Error running command: %s %v\nOutput: %s\n", command, args, output)
		return string(output)
	}
	if printOutput {
		log.Print("Command result: ", string(output))
	}

	return string(output)
}
