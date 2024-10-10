package apps

import (
	"bystrze/apps/common/session"
	"fmt"
	"log"
	"net/http"
	"os"
)

func (app *App) SetLogger() {
	app.Logger = log.New(os.Stdout, app.AppName+"\t", log.Ldate|log.Ltime|log.Lshortfile)
}

func (App) Debug(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf("\tDEBUG:\t "+format, a...))
}

func (App) Info(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf("\tINFO:\t "+format, a...))
}

func (App) Warn(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf("\tWARN:\t "+format, a...))
}

func (app App) Err(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf("\tERR:\t"+format, a...))
}

func (app App) ErrSession(r *http.Request, e error) {
	log.Output(2, fmt.Sprintf("\tERR:\t %v %v", session.GetSessionUserName(r), e.Error()))
}

func (App) Fatal(v ...any) {
	log.Output(2, "FATAL ERROR")
	log.Fatal(v)
}
