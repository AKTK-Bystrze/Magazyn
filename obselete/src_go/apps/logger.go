package apps

import (
	"bystrze/apps/common/session"
	"log"
	"net/http"
	"os"
)

func (app *App) SetLogger() {
	app.Logger = log.New(os.Stdout, app.AppName+"\t", log.Ldate|log.Ltime|log.Lmsgprefix)
}

func (app App) Debug(format string, a ...any) {
	app.Logger.Printf("DEBUG:\t"+format, a...)
}

func (app App) Info(format string, a ...any) {
	app.Logger.Printf("INFO:\t"+format, a...)
}

func (app App) Warn(format string, a ...any) {
	app.Logger.Printf("WARN:\t"+format, a...)
}

func (app App) Err(format string, a ...any) {
	app.Logger.Printf("ERR:\t"+format, a...)
}

func (app App) ErrSession(r *http.Request, e error) {
	app.Logger.Printf("ERR:\t%v %v", session.GetSessionUserName(r), e.Error())
}

func (app App) Fatal(v ...any) {
	app.Logger.Print("FATAL ERROR")
	app.Logger.Fatal(v...)
}
