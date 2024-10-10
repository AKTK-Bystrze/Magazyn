# test app
go clean -testcache
go cd boxTest
go run main.go --setUp
go go run main.go --tests 
#OPTIONAL
#create and populate db. Can get current one from a server using admin's /db/backup endpoint
sqlite3 magazyn_prod.db < db.schema
sqlite3 magazyn_prod.db ".read boxTest/db_test.data" 
#build and push
build, push image to google cloud and deploy app
docker build --target production -t gcr.io/magazynbystrze/app -t magazyn_bystrze . --build-arg EMAIL=EMAIL --build-arg EMAIL_PASS="PASS" DB_PATH=./magazyn_prod.db --build-arg EMAIL_PASS="PASS" DEBUG=false
gcloud auth configure-docker
docker push gcr.io/magazynbystrze/app
gcloud run deploy app --image gcr.io/magazynbystrze/app --platform managed --region europe-central2 --allow-unauthenticated
