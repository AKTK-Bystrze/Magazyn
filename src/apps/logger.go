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

func (app App) Debug(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf(app.AppName+"\tDEBUG:\t "+format, a...))
}

func (app App) Info(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf(app.AppName+"\tINFO:\t "+format, a...))
}

func (app App) Warn(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf(app.AppName+"\tWARN:\t "+format, a...))
}

func (app App) Err(format string, a ...interface{}) {
	log.Output(2, fmt.Sprintf(app.AppName+"\tERR:\t"+format, a...))
}

func (app App) ErrSession(r *http.Request, e error) {
	log.Output(2, fmt.Sprintf(app.AppName+"\tERR:\t %v %v", session.GetSessionUserName(r), e.Error()))
}

func (App) Fatal(v ...any) {
	log.Output(2, "FATAL ERROR")
	log.Fatal(v...)
}
