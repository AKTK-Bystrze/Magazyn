build, push image to google cloud and deploy app
docker build --target production -t gcr.io/magazynbystrze/app -t magazyn_bystrze . --build-arg EMAIL=EMAIL --build-arg EMAIL_PASS="PASS" DB_PATH=./magazyn_prod.db --build-arg EMAIL_PASS="PASS" DEBUG=false
gcloud auth configure-docker
docker push gcr.io/magazynbystrze/app
gcloud run deploy app --image gcr.io/magazynbystrze/app --platform managed --region europe-central2 --allow-unauthenticated
