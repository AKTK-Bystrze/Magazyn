package env

import (
	"boxTest/common/consts"
	"log"
	"os/exec"
	"strings"
	"time"
)

func GetContainerLogs(containerName string, since time.Time) string {
	timeDiff := time.Since(since)
	logs := RunCommand(false, "docker", "logs", "--since", timeDiff.String(), containerName)
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
		log.Printf("Running command: %s %v", command, args)
	}
	cmd := exec.Command(command, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Error running command: %s %v\nOutput: %s\n", command, args, output)
		return string(output), err
	}
	if printOutput {
		log.Print("Command result: ", string(output))
	}
	return string(output), nil
}

// Works for a while till system synchronize it. Oppening browser does synchronise time
func SetContainerTime(timeToSet time.Time, containerName string) {
	timeFormated := strings.ReplaceAll(timeToSet.Format(consts.TIME_FORMAT), "T", " ")
	RunCommand(false, "docker", "exec", containerName, "date", "-s", timeFormated)
	res := RunCommand(false, "docker", "exec", containerName, "date")
	if res == "" {
		log.Fatalf("can't change time on %v", containerName)
	} else {
		log.Printf("Set time to %v for container %v", res, containerName)
	}
}

func RevertContainerTime(containerName string) {
	SetContainerTime(time.Now(), containerName)
}
