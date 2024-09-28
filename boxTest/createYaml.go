package main

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

const (
	TEST_APP_NAME    = "test_app"
	TEST_DB_NAME     = "test_db"
	SMTP_SERVER_NAME = "test_smtp_server"
	DOCKERFILE_PATH  = "."
	DOCKERYML_PATH   = "./docker-compose.yml"
	NETWORK_NO_WEB   = "test_network_no_web"
	SMTP_PORT        = "3465"
)

type Service struct {
	Image       string      `yaml:"image"`
	Container   string      `yaml:"container_name"`
	Networks    []string    `yaml:"networks"`
	Ports       []string    `yaml:"ports"`
	Environment []string    `yaml:"environment"`
	Build       BuildConfig `yaml:"build"`
}

type BuildConfig struct {
	Context    string            `yaml:"context"`
	Dockerfile string            `yaml:"dockerfile"`
	Args       map[string]string `yaml:"args"`
}

type DockerCompose struct {
	Version  string              `yaml:"version"`
	Services map[string]Service  `yaml:"services"`
	Networks map[string]struct{} `yaml:"networks"`
}

func CreateYaml() {
	compose := DockerCompose{
		Version: "3",
		Services: map[string]Service{
			"smtp_server": {
				Image:     "greenmail/standalone:1.6.6",
				Container: SMTP_SERVER_NAME,
				Networks:  []string{NETWORK_NO_WEB},
				Ports:     []string{SMTP_PORT + ":" + SMTP_PORT, "8025:8080"},
				Environment: []string{
					"JAVA_OPTS=-Dgreenmail.verbose -Dgreenmail.auth.enabled -Dgreenmail.starttls.required",
				},
			},
			"test_app": {
				Image:     TEST_APP_NAME,
				Container: TEST_APP_NAME,
				Networks:  []string{NETWORK_NO_WEB},
				Ports:     []string{"8080:8080"},
				Environment: []string{
					"SMTP_HOST=" + SMTP_SERVER_NAME,
					"SMTP_PORT=" + SMTP_PORT,
				},
				Build: BuildConfig{
					Context:    ".",
					Dockerfile: DOCKERFILE_PATH,
					Args: map[string]string{
						"EMAIL":      "test_app@bystrzeMail.com",
						"EMAIL_PASS": "password",
					},
				},
			},
		},
		Networks: map[string]struct{}{
			NETWORK_NO_WEB: {},
		},
	}

	data, err := yaml.Marshal(&compose)
	if err != nil {
		panic(err)
	}

	if err := os.WriteFile("docker-compose.yml", data, 0644); err != nil {
		panic(err)
	}

	fmt.Println("docker-compose.yml created successfully")
}
