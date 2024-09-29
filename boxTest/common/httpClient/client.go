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
	log.Printf("Get \t%v", url)
	resp, err := DefaultClient.
		Get(url)
	if err != nil {
		log.Fatalf("Failed request %v\n\tResp: %v\n\tErr: %v", url, resp, err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Response code %v is different than %v \n%v", resp.StatusCode, http.StatusOK, resp)
	}
	return resp
}

func PostFormRequest(url string, formData url.Values) *http.Response {
	log.Printf("Post \t$%v\n\t%v", url, formData)
	resp, err := DefaultClient.
		PostForm(url, formData)
	if err != nil {
		log.Printf("%v response %v", url, resp)
		log.Fatalf("Failed request: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Response code %v is different than %v \n%v", resp.StatusCode, http.StatusOK, resp)
	}
	return resp
}

func RestartDefaultClient() {
	log.Print("Restart default client")
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
