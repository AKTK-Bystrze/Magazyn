package apps

import (
	"bystrze/apps/common/session"
	"log"
	"net/http"
	"os"
)

func (app *App) SetLogger() {
	app.Logger = log.New(os.Stdout, app.AppName+"\t", log.Ldate|log.Ltime|log.Lshortfile)
}

func (app App) Debug(format string, a ...interface{}) {
	log.Printf(app.AppName+"\tDEBUG:\t "+format, a...)
}

func (app App) Info(format string, a ...interface{}) {
	log.Printf(app.AppName+"\tINFO:\t "+format, a...)
}

func (app App) Warn(format string, a ...interface{}) {
	log.Printf(app.AppName+"\tWARN:\t "+format, a...)
}

func (app App) Err(format string, a ...interface{}) {
	log.Printf(app.AppName+"\tERR:\t"+format, a...)
}

func (app App) ErrSession(r *http.Request, e error) {
	log.Printf(app.AppName+"\tERR:\t %v %v", session.GetSessionUserName(r), e.Error())
}

func (App) Fatal(v ...any) {
	log.Print("FATAL ERROR")
	log.Fatal(v...)
}
