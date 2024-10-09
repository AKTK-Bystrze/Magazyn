package main

import (
	"boxTest/env"
	"flag"
	"fmt"
)

func main() {
	setUpEnv := flag.Bool("setUp", false, "Set up the environment")
	runAllTests := flag.Bool("tests", false, "Run all tests")
	flag.Parse()
	if *setUpEnv {
		env.EnviromentSetUP()
	}

	if *runAllTests {
		env.RunTests()
	}
	if !*setUpEnv && !*runAllTests {
		fmt.Println("No flags provided. Please use --setUp or --tests.")
	}
}
