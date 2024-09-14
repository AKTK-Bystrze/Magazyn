package main

import (
	"net/http"
)

func homePage(w http.ResponseWriter, r *http.Request) {
	app.renderTemplateNoData(w, "home/home.html")
}

// home gets list of main tiles and list of side tiles
// if logged then can see empty tiles that can be added
