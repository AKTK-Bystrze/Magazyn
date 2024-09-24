package apps

import (
	"bystrze/services/utils"
	"errors"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

const OUT_TIME_FMT = "2006-01-02 15:04:05"

type App struct {
	Db        utils.Database   //setted by main
	FuncMap   template.FuncMap //setted by main and shared by apps. Can be appended by app
	Store     sessions.Store   //setted by main and shared by apps
	Server    string           //setted by main. *Do app need it?
	AppName   string           //setted by main
	Router    *mux.Router      //setted by main, updated by app
	Logger    *log.Logger      //setted by app
	Templates utils.Templates  //setted by app
}

func (app App) RenderTemplate(w http.ResponseWriter, r *http.Request, tmpl string, data TemplateDataIfce) {
	if uinfo, ok := r.Context().Value("UserInfo").(utils.TmpUser); ok {
		data.SetUser(&uinfo)
		data.SetURL(r.URL.String())
		err := app.Templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
		}
	} else {
		err := app.Templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", utils.GetUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
		}
	}
}

func (a *App) LoadTemplates() {
	funcMap := template.FuncMap{
		"Now": time.Now,
		"Before": func(t1, t2 time.Time) bool {
			return t1.Before(t2)
		},
		"After": func(t1, t2 time.Time) bool {
			return t1.After(t2)
		},
		"AddHours": func(t time.Time, d int) time.Time {
			return t.Add(time.Duration(d) * time.Hour)
		},
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, errors.New("invalid dict call")
			}
			dict := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, errors.New("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
		"contains": func(substring, str string) bool {
			return strings.Contains(str, substring)
		},
	}
	patterns := []string{
		"templates/*.html",
		"templates/*/*.html",
	}
	files := []string{}

	for _, dir := range patterns {
		ff, err := filepath.Glob(dir)
		if err != nil {
			a.Logger.Fatal("Error loading templates: %v", err)
		}
		files = append(files, ff...)
	}

	var err error
	a.Templates, err = template.New("").Funcs(funcMap).ParseFiles(files...)
	if err != nil {
		a.Logger.Fatal("Error parsing templates: %v", err)
	}
}

func (app App) RenderTemplateNoData(w http.ResponseWriter, tmpl string) {
	err := app.Templates.ExecuteTemplate(w, tmpl, nil)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

type TemplateData struct {
	UserInfo utils.TmpUser
	URL      string
}

type TemplateDataIfce interface {
	SetUser(*utils.TmpUser)
	SetURL(string)
}

func (data *TemplateData) SetUser(uinfo *utils.TmpUser) {
	data.UserInfo = *uinfo
}

func (data *TemplateData) SetURL(url string) {
	data.URL = url
}

func DbBackupHandler(w http.ResponseWriter, r *http.Request) {
	dbPath := structs.DATABASE_PATH
	file, err := os.Open(dbPath)
	if err != nil {
		app.Err("%v %v", utils.GetUserName(r), err.Error())
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment; filename="+time.Now().UTC().Format(OUT_TIME_FMT)+structs.DATABASE_NAME)

	_, err = io.Copy(w, file)
	if err != nil {
		app.Err("%v Error copying file %v", utils.GetUserName(r), err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusNotFound)
		return
	}

}
