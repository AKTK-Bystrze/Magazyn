package controllers

import (
	"bystrze/apps"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/credits"
	"net/http"
)

func CreditsHandler(w http.ResponseWriter, r *http.Request) {
	userId := int(session.GetSessionUserId(r))
	creditsHistory, err := credits.GetUserCreditsAudits(userId)
	if err != nil {
		appState.App.Err("%v %v", session.GetSessionUserName(r), err.Error())
		http.Error(w, "Can't load user's credits history", http.StatusBadRequest)
		return
	}

	data := struct {
		CreditsHistory []credits.CreditsAuditTmp
		apps.TemplateData
	}{
		CreditsHistory: creditsHistory,
	}

	appState.App.RenderTemplate(w, r, "credits_view.html", &data)
}
