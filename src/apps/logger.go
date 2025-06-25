package apps

import (
	"bystrze/apps/common/session"
	"log"
	"net/http"
	"os"
)

func (app *App) SetLogger() {
	app.Logger = log.New(os.Stdout, app.AppName+":\t", log.Ldate|log.Ltime|log.Lshortfile|log.Lmsgprefix)
}

func (app App) Debug(format string, a ...any) {
	app.Logger.Printf("DEBUG: "+format, a...)
}

func (app App) Info(format string, a ...any) {
	app.Logger.Printf("INFO: "+format, a...)
}

func (app App) Warn(format string, a ...any) {
	app.Logger.Printf("WARN: "+format, a...)
}

func (app App) Err(format string, a ...any) {
	app.Logger.Printf("ERR: "+format, a...)
}

func (app App) ErrSession(r *http.Request, e error) {
	app.Logger.Printf("ERR: %v %v", session.GetSessionUserName(r), e.Error())
}

func (app App) Fatal(v ...any) {
	app.Logger.Print("FATAL ERROR")
	app.Logger.Fatal(v...)
}
