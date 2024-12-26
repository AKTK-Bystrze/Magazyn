docker build \
  -t registry.heroku.com/<your-heroku-app>/web \
  --build-arg EMAIL=EMAIL \
  --build-arg EMAIL_PASS="PASS" \
  --build-arg DB_PATH=./magazyn_prod.db \
  --build-arg DEBUG=false .
heroku container:login
docker push registry.heroku.com/<your-heroku-app>/web
heroku container:release web --app <your-heroku-app>
heroku config:set EMAIL_PASS="PASS" DB_PATH=./magazyn_prod.db EMAIL=EMAIL
#test deployment
heroku open --app <your-heroku-app>
#debugging
heroku logs --tail --app <your-heroku-app>