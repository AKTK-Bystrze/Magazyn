package httpResponse

import (
	"encoding/json"
	"net/http"
)

func ResponseErrorMsg(w http.ResponseWriter, r *http.Request, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
