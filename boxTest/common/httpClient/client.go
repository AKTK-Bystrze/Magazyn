package httpClient

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
)

var (
	DefaultClient = http.Client{}
)

func GetRequest(url string) *http.Response {
	resp, err := DefaultClient.
		Get(url)
	if err != nil {
		log.Fatalf("Failed request %v\n\tResp: %v\n\tErr: %v", url, resp, err)
	}
	return resp
}

func PostFormRequest(url string, formData url.Values) *http.Response {
	resp, err := DefaultClient.
		PostForm(url, formData)
	if err != nil {
		log.Printf("/users/token response %v", resp)
		log.Fatalf("Failed request: %v", err)
	}
	return resp
}

func RestartDefaultClient() {
	DefaultClient = CreateHttpClient()
}

func CreateHttpClient() http.Client {
	jar, err := cookiejar.New(nil)
	if err != nil {
		log.Fatalf("Failed to create cookie jar: %v", err)
	}

	client := http.Client{
		Jar: jar,
	}
	return client
}
