package apps

import (
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"database/sql"
	"errors"
	"html/template"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
)

type App struct {
	Db        Database       //setted by main
	Store     sessions.Store //setted by main
	Server    string         //setted by main. *Do app need it?
	AppName   string         //setted by main
	Router    *mux.Router    //setted by main, updated by app
	Logger    *log.Logger    //setted by app
	Templates Templates      //setted by app
}

func (app App) RenderTemplate(w http.ResponseWriter, r *http.Request, tmpl string, data TemplateDataIfce) {
	if uinfo, ok := r.Context().Value("UserInfo").(models.User); ok {
		data.SetUser(&uinfo)
		data.SetURL(r.URL.String())
		err := app.Templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", session.GetSessionUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
		}
	} else {
		err := app.Templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", session.GetSessionUserName(r), err.Error())
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
		"dict": func(values ...any) (map[string]any, error) {
			if len(values)%2 != 0 {
				return nil, errors.New("invalid dict call")
			}
			dict := make(map[string]any, len(values)/2)
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
		"templates/*/*/*.html",
		"templates/*/*/*/*.html",
	}
	files := []string{}

	for _, dir := range patterns {
		ff, err := filepath.Glob(dir)
		if err != nil {
			a.Logger.Fatalf("Error loading templates: %v", err)
		}
		files = append(files, ff...)
	}

	var err error
	a.Templates, err = template.New("").Funcs(funcMap).ParseFiles(files...)
	if err != nil {
		a.Logger.Fatalf("Error parsing templates: %v", err)
	}
}

func (app App) RenderTemplateNoData(w http.ResponseWriter, tmpl string) {
	err := app.Templates.ExecuteTemplate(w, tmpl, nil)
	if err != nil {
		app.Err("RenderTemplateNoData: %v", err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

type TemplateData struct {
	UserInfo models.User
	URL      string
}

type TemplateDataIfce interface {
	SetUser(*models.User)
	SetURL(string)
}

func (data *TemplateData) SetUser(uinfo *models.User) {
	data.UserInfo = *uinfo
}

func (data *TemplateData) SetURL(url string) {
	data.URL = url
}

type Database interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
	Get(dest any, query string, args ...any) error
	Prepare(query string) (*sql.Stmt, error)
	Unsafe() *sqlx.DB
	Queryx(query string, args ...any) (*sqlx.Rows, error)
	QueryRowx(query string, args ...any) *sqlx.Row
}

type Templates interface {
	ExecuteTemplate(wr io.Writer, name string, data any) error
}
