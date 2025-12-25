package httpResponse

import (
	"bystrze/apps/warehouse/appState"
	"encoding/json"
	"net/http"
)

func ResponseErrorMsg(w http.ResponseWriter, r *http.Request, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": msg}); err != nil {
		appState.App.Warn("Error %v when encoding map to json format. This should never happen.", err)
	}
}
