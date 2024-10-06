package httpClient

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
)

var (
	DefaultClient = http.Client{}
)

func GetRequestDefClient(url string) *http.Response {
	return GetRequest(url, DefaultClient)
}

func GetRequest(url string, client http.Client) *http.Response {
	log.Printf("Get \t%v", url)
	resp, err := client.
		Get(url)
	if err != nil {
		log.Fatalf("Failed request %v\n\tResp: %v\n\tErr: %v", url, resp, err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Response code %v is different than %v \n%v", resp.StatusCode, http.StatusOK, resp)
	}
	return resp
}

func PostFormRequestDefClient(url string, formData url.Values) *http.Response {
	return PostFormRequest(url, formData, DefaultClient)
}

func PostFormRequest(url string, formData url.Values, client http.Client) *http.Response {
	log.Printf("Post \t$%v\n\t%v", url, formData)
	resp, err := client.
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

func PutRequestDefClient(url string, formData url.Values) *http.Response {
	log.Printf("PUT \t%v\n\t%v", url, formData)
	req, err := http.NewRequest(http.MethodPut, url, strings.NewReader(formData.Encode()))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := DefaultClient.Do(req)
	if err != nil {
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
