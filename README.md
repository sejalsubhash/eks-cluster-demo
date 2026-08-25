# DR Demo App — Part 1 (Phase 1: Prepare the application)

Simple demo app (Node/Express backend + static frontend) used to build and
test the Mumbai → Ohio EKS disaster recovery flow.

## Folder structure
```
backend/    # Express API, talks to MySQL via env vars (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
frontend/   # Static page + nginx, calls backend via BACKEND_URL env var
.github/workflows/build-and-push.yml   # CI: builds both images, pushes to ECR
```

## One-time AWS setup (before the workflow will work)

### 1. Create the two ECR repositories (Mumbai region)
```bash
aws ecr create-repository --repository-name dr-demo-backend  --region ap-south-1
aws ecr create-repository --repository-name dr-demo-frontend --region ap-south-1
```

### 2. Create an IAM role GitHub Actions can assume via OIDC
This avoids storing long-lived AWS access keys as GitHub secrets.

- Create (once per AWS account) the GitHub OIDC identity provider:
  `token.actions.githubusercontent.com` — skip if you already have this from
  another project.
- Create an IAM role (e.g. `github-actions-ecr-push`) trusting that OIDC
  provider, scoped to your repo (`repo:<org>/<repo>:ref:refs/heads/main`).
- Attach a policy allowing `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`,
  `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`,
  `ecr:CompleteLayerUpload` on the two repos above.

Tell me if you want, and I'll generate the exact trust policy + permissions
policy JSON for this role next.

### 3. Add the GitHub repo secret
- `AWS_GITHUB_ACTIONS_ROLE_ARN` = ARN of the role created in step 2

### 4. Getting images into Ohio too
The doc calls for images available in both Mumbai and Ohio. Easiest path:
turn on **ECR cross-region replication** (Mumbai → Ohio) at the registry
level — one-time console/CLI config, no workflow changes needed. We'll set
this up when we get to the Ohio phase; no action needed right now.

## Running locally (optional, to sanity check before touching AWS)
```bash
docker build -t dr-demo-backend ./backend
docker run -p 3000:3000 \
  -e DB_HOST=<your-mysql-host> -e DB_USER=<user> -e DB_PASSWORD=<pass> \
  dr-demo-backend

docker build -t dr-demo-frontend ./frontend
docker run -p 8080:80 -e BACKEND_URL=http://localhost:3000 dr-demo-frontend
```
Then open http://localhost:8080

## What's next (Part 2)
Once these files are pushed to `main` and the workflow runs successfully
(images visible in ECR), we move to Phase 2: creating the Mumbai VPC and EKS
cluster via the AWS Console.
