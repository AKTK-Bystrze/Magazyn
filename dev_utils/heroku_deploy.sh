docker build \
  -t registry.heroku.com/<your-heroku-app>/web \
  --build-arg EMAIL=<email> \
  --build-arg EMAIL_PASS=<pass> \
  --build-arg DSN=<dsn> \
  --build-arg DEBUG=false .
#add postgres db
# heroku addons:create heroku-postgresql:hobby-dev
#migrate db, connect to db
# heroku pg:psql -a your-app-name
# heroku pg:psql -a your-app-name < schema.sql
# heroku pg:psql -a your-app-name < data.sql
#in psql
# \i /path/to/schema.sql
# \i /path/to/data.sql
heroku container:login
docker push registry.heroku.com/<your-heroku-app>/web
heroku container:release web --app <your-heroku-app>
#test deployment
heroku open --app <your-heroku-app>
#debugging
heroku logs --tail --app <your-heroku-app>