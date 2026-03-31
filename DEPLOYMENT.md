# SenGuard – Google Cloud Run Deployment Guide
# Complete step-by-step setup for CI/CD via GitHub + Cloud Build

---

## Architecture on Cloud Run

```
GitHub (push to main)
    │
    ▼
Cloud Build (cloudbuild.yaml)
    ├── Build + Push Backend Image  → Artifact Registry
    ├── Build + Push Frontend Image → Artifact Registry
    ├── Deploy senguard-backend     → Cloud Run (FastAPI)
    └── Deploy senguard-frontend    → Cloud Run (nginx + React)
```

---

## Prerequisites Checklist

- [ ] GCP Project: `gen-lang-client-0688216311`
- [ ] GitHub repo with SenGuard code pushed
- [ ] MongoDB Atlas cluster (or cloud MongoDB URI)
- [ ] `gcloud` CLI installed locally

---

## STEP 1 — Enable GCP APIs

```bash
gcloud config set project gen-lang-client-0688216311

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

---

## STEP 2 — Create Artifact Registry Repository

```bash
gcloud artifacts repositories create senguard \
  --repository-format=docker \
  --location=us-central1 \
  --description="SenGuard Docker images"
```

Authenticate Docker:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

---

## STEP 3 — Create GCS Bucket for File Storage

```bash
# Create the bucket (replace PROJECT_ID with gen-lang-client-0688216311)
gsutil mb -p gen-lang-client-0688216311 -l us-central1 gs://senguard-storage

# Block public access (files served through the API, not directly)
gsutil ubla set on gs://senguard-storage

# Grant the Cloud Run service account read/write access to the bucket
PROJECT_NUMBER=$(gcloud projects describe gen-lang-client-0688216311 --format='value(projectNumber)')

gsutil iam ch \
  serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com:roles/storage.objectAdmin \
  gs://senguard-storage
```

> **Local development:** Authenticate with `gcloud auth application-default login` so the
> SDK picks up credentials automatically. Set `GCS_BUCKET_NAME=senguard-storage` in your
> backend `.env` file.

---

## STEP 4 — Set Up MongoDB Atlas

1. Go to https://mongodb.com/atlas → Create free cluster
2. Create a database user (username + password)
3. Whitelist IP: `0.0.0.0/0` (allow all — Cloud Run uses dynamic IPs)
4. Get connection string:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/senguard_db?retryWrites=true&w=majority`

---

## STEP 5 — Store Secrets in GCP Secret Manager

```bash
# MongoDB Atlas connection string
echo -n "mongodb+srv://nobiadmin:FCE\!B3n3f1ts@cluster0.7tyb3ys.mongodb.net/senguard_db?appName=Cluster0&retryWrites=true&w=majority" | \
  gcloud secrets create senguard-mongo-url --data-file=-

# JWT secret (keep the same value from local .env)
echo -n "f31f600a19f81aca5b878bc9a7c823a496af6c671a820968a74301a7e054457f" | \
  gcloud secrets create senguard-jwt-secret --data-file=-

# Gemini API key
echo -n "AIzaSyDZdo90XSgVR6oiiENjtmw-l9LZAcgmuqw" | \
  gcloud secrets create senguard-gemini-key --data-file=-

# Emergent LLM key (for image generation + object storage)
echo -n "sk-emergent-f251058F771Aa4c927" | \
  gcloud secrets create senguard-emergent-key --data-file=-

# Admin credentials
echo -n "admin@senguard.com" | \
  gcloud secrets create senguard-admin-email --data-file=-

echo -n "SenGuard2024!" | \
  gcloud secrets create senguard-admin-password --data-file=-
```

---

## STEP 6 — Grant Cloud Build Permission to Secrets

```bash
PROJECT_NUMBER=$(gcloud projects describe gen-lang-client-0688216311 --format='value(projectNumber)')

# Allow Cloud Build service account to access secrets
gcloud projects add-iam-policy-binding gen-lang-client-0688216311 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Allow Cloud Build to deploy to Cloud Run
gcloud projects add-iam-policy-binding gen-lang-client-0688216311 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Allow Cloud Build to use service account
gcloud projects add-iam-policy-binding gen-lang-client-0688216311 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow Cloud Build to push to Artifact Registry
gcloud projects add-iam-policy-binding gen-lang-client-0688216311 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

---

## STEP 7 — First Manual Deploy (Bootstrap)

Run this once to get the backend URL (needed for REACT_APP_BACKEND_URL):

```bash
# Deploy backend first (from root /app directory)
gcloud builds submit . \
  --config=cloudbuild.yaml \
  --substitutions=_BACKEND_URL=https://placeholder.run.app

# Get the backend URL after first deploy:
gcloud run services describe senguard-backend \
  --region=us-central1 \
  --format='value(status.url)'
```

Copy the backend URL output (e.g. `https://senguard-backend-abc123-uc.a.run.app`).

---

## STEP 8 — Connect GitHub to Cloud Build (CD Trigger)

### Via GCP Console (easiest):
1. Go to: https://console.cloud.google.com/cloud-build/triggers
2. Click **"Connect Repository"** → GitHub → Authenticate → Select your repo
3. Click **"Create Trigger"**:
   - Name: `senguard-deploy`
   - Event: **Push to branch** → `^main$`
   - Config: **Cloud Build configuration file** → `cloudbuild.yaml`
   - Substitution variables:
     ```
     _REGION         = us-central1
     _REPO           = senguard
     _BACKEND_URL    = https://senguard-backend-YOUR_HASH-uc.a.run.app
     _GCS_BUCKET     = senguard-storage
     ```
4. Click **Save**

### Via gcloud CLI:
```bash
gcloud builds triggers create github \
  --repo-name=nobiart-ai \
  --repo-owner=ecouso1977 \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --substitutions='_REGION=us-central1,_REPO=senguard,_BACKEND_URL=https://senguard-backend-YOUR_HASH-uc.a.run.app,_GCS_BUCKET=senguard-storage' \
  --name=senguard-deploy
```

---

## STEP 9 — Push Code to GitHub

```bash
cd /app
git remote add origin https://github.com/ecouso1977/nobiart-ai.git
git add .
git commit -m "feat: SenGuard initial deployment setup"
git push -u origin main
```

Every push to `main` will automatically:
1. Build backend + frontend Docker images
2. Push to Artifact Registry
3. Deploy to Cloud Run

---

## STEP 10 — Verify Deployment

```bash
# Get service URLs
gcloud run services list --region=us-central1 --format='table(metadata.name,status.url)'

# Test backend health
curl https://senguard-backend-YOUR_HASH-uc.a.run.app/api/

# Test frontend
open https://senguard-frontend-YOUR_HASH-uc.a.run.app
```

---

## Optional: Custom Domain

```bash
# Map custom domain to frontend service
gcloud run domain-mappings create \
  --service=senguard-frontend \
  --domain=app.yourdomain.com \
  --region=us-central1

# Map API subdomain to backend
gcloud run domain-mappings create \
  --service=senguard-backend \
  --domain=api.yourdomain.com \
  --region=us-central1
```

Then update `_BACKEND_URL` substitution to `https://api.yourdomain.com`.

---

## Cost Estimate (Cloud Run free tier)

| Service  | Free Tier | Typical Cost |
|---|---|---|
| Cloud Run | 2M req/month | ~$0 for low traffic |
| Artifact Registry | 0.5 GB free | ~$0.10/GB/month |
| Cloud Build | 120 min/day free | ~$0 for CI/CD |
| Secret Manager | 10K accesses free | ~$0 |
| MongoDB Atlas | M0 free cluster | $0 |

---

## Troubleshooting

```bash
# View Cloud Run logs
gcloud run services logs read senguard-backend --region=us-central1 --limit=50
gcloud run services logs read senguard-frontend --region=us-central1 --limit=50

# View Cloud Build history
gcloud builds list --limit=5

# Re-run a build manually
gcloud builds submit . --config=cloudbuild.yaml \
  --substitutions=_BACKEND_URL=https://YOUR_BACKEND_URL.run.app
```
