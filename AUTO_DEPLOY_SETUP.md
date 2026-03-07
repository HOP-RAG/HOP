# Auto-Deploy Setup Guide

This guide explains how to set up automatic deployment to your DigitalOcean droplet when you merge to `main`.

## What It Does

The `auto-deploy-main.yml` workflow:

1. Triggers automatically when you push to `main` (or merge a PR)
2. Builds Docker images for backend and web in GitHub Actions
3. Pushes images to GitHub Container Registry (ghcr.io)
4. SSHes into your DigitalOcean droplet
5. Pulls the new images and restarts services

## Prerequisites

You need to set up 3 GitHub Secrets for this to work:

### 1. SSH Key (`DROPLET_SSH_KEY`)

Generate an SSH key on your local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hop_deploy -C "hop-deploy"
```

Add the public key to your droplet:

```bash
ssh root@45.55.68.178
cat >> ~/.ssh/authorized_keys << 'EOF'
<paste contents of ~/.ssh/hop_deploy.pub>
EOF
```

Copy the **private key** content:

```bash
cat ~/.ssh/hop_deploy
```

### 2. Droplet IP (`DROPLET_IP`)

Your DigitalOcean droplet IP: `45.55.68.178`

### 3. Droplet User (`DROPLET_USER`)

The user to SSH as: `root` (or your deployment user)

## Setting Up GitHub Secrets

1. Go to: **GitHub Settings → Secrets and variables → Actions**
2. Create these secrets:

| Secret Name | Value |
|-------------|-------|
| `DROPLET_IP` | `45.55.68.178` |
| `DROPLET_USER` | `root` |
| `DROPLET_SSH_KEY` | *Private SSH key (from step 1)* |

## Docker Registry Access

The workflow automatically uses GitHub's token to push/pull images from GitHub Container Registry (ghcr.io). No additional setup needed!

## Verification

After setting up secrets, the next time you push to `main`:

1. Check the Actions tab to see the workflow run
2. Look for two jobs: `build-and-push` and `deploy`
3. Check your droplet logs: `docker compose -f deployment/docker_compose/docker-compose.yml logs -f`

## Troubleshooting

### SSH Connection Failed
- Verify the droplet IP and SSH key are correct
- Make sure the public key is added to `~/.ssh/authorized_keys` on the droplet
- Test manually: `ssh -i ~/.ssh/hop_deploy root@45.55.68.178`

### Docker Image Not Found
- Make sure the droplet can access ghcr.io
- The workflow pushes as `ghcr.io/HOP-RAG/HOP/backend:main` and `ghcr.io/HOP-RAG/HOP/web:main`

### Services Won't Start
- Check droplet logs: `docker compose logs`
- Verify environment variables in `.env` on the droplet
- Make sure required services (PostgreSQL, Redis, etc.) started

## Manual Deployment

If you need to deploy manually to test:

```bash
# From your local machine
ssh -i ~/.ssh/hop_deploy root@45.55.68.178

# On the droplet:
cd /opt/onyx
git fetch origin main
git reset --hard origin/main
docker compose -f deployment/docker_compose/docker-compose.yml down
docker compose -f deployment/docker_compose/docker-compose.yml up -d --wait
```

## Disabling Auto-Deploy

To temporarily disable auto-deploy:
- Delete the `DROPLET_SSH_KEY` secret from GitHub
- The workflow will still run but will fail at the deploy step
- Re-add the secret to re-enable

## Notes

- Deployments only trigger on pushes to `main`
- Pull requests don't trigger deployment
- You can manually trigger a deployment from the Actions tab using `workflow_dispatch`
- Each deployment rebuilds images (no caching from previous builds across runs)
