# build, push image to google cloud and deploy app
docker build --target production -t gcr.io/magazynbystrze/app -t magazyn_bystrze . --build-arg EMAIL=test.dev.g6@gmail.com --build-arg EMAIL_PASS="ushd dvvv jmiy wgeq" 
gcloud auth configure-docker
docker push gcr.io/magazynbystrze/app
gcloud run deploy app --image gcr.io/magazynbystrze/app --platform managed --region europe-central2 --allow-unauthenticated
#create and populate db. Can get current one from a server using admin's /db/backup endpoint
sqlite3 magazyn.db < db.schema
sqlite3 magazyn.db ".read boxTest/db_test.data"