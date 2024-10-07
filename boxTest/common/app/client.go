package app

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
)

type UserClient struct {
	User   User
	Client http.Client
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

func (uc UserClient) GetRequest(url string) *http.Response {
	log.Printf("Get \t%v", url)
	resp, err := uc.Client.Get(url)
	if err != nil {
		log.Fatalf("Failed request %v\n\tResp: %v\n\tErr: %v", url, resp, err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Response code %v is different than %v \n%v", resp.StatusCode, http.StatusOK, resp)
	}
	return resp
}

func (uc UserClient) PostFormRequest(url string, formData url.Values) *http.Response {
	log.Printf("Post \t$%v\n\t%v", url, formData)
	resp, err := uc.Client.
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

func (uc UserClient) PutRequest(url string, formData url.Values) *http.Response {
	log.Printf("PUT \t%v\n\t%v", url, formData)
	req, err := http.NewRequest(http.MethodPut, url, strings.NewReader(formData.Encode()))
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := uc.Client.Do(req)
	if err != nil {
		log.Fatalf("Failed request: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Response code %v is different than %v \n%v", resp.StatusCode, http.StatusOK, resp)
	}
	return resp
}
