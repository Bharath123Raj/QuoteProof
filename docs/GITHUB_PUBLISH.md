# Publish QuoteProof from Windows PowerShell

Download the latest ZIP and extract it into a fresh folder. Open PowerShell in the inner QuoteProof directory that contains package.json, README.md and src. These steps create a new public repository using your locally authenticated GitHub CLI account.

## 1. Verify the app and account

```powershell
npm test
gh auth status
```

Expect 110 passing checks. Confirm that gh is using the GitHub account you want to submit under. If it is signed out, run gh auth login. If another account is active, run gh auth switch and verify again. Git and GitHub CLI must already be installed.

## 2. Create and push a new repository

```powershell
git init
git add .
git commit -m "Build QuoteProof SerpApi procurement MVP"
git branch -M main
gh repo create QuoteProof --public --source=. --remote=origin --push --description "Evidence-first supplier quote audits powered by SerpApi"
gh repo view --web
```

This route creates the repository directly: do not create an empty QuoteProof repository on the website first. If you already have that repository, use the existing-repository route in SUBMISSION.md instead. Do not force-push over existing work.

The ZIP excludes source Git credentials and the private Site identity. The included .gitignore excludes .env files, dependencies and generated archives. Keep raw private quote reports and any API keys outside the project folder; the documentation contains only the example validation summary.

Official GitHub CLI reference: https://cli.github.com/manual/gh_repo_create

## 3. Check GitHub Actions

Open the repository's Actions tab. The Tests and build workflow should run after the first push. It builds the app, runs the 110 offline checks and validates the deployment module. It needs no SerpApi secret. Local checks pass, but a green hosted workflow is only confirmed after this run completes.

## 4. Record and submit

Start the app with npm start and use docs/DEMO_SCRIPT.md to record a local demo under three minutes. Publish a public or unlisted video, verify repository and video access while signed out, and use the project description and AI disclosure in docs/SUBMISSION.md. Fill participant details and accept the official rules yourself.
