# GitHub Actions CI/CD Setup

This guide explains how to set up automatic deployments to your DigitalOcean droplet.

## 1. Generate SSH Key for GitHub Actions

On your local machine:

```bash
# Generate a new SSH key (don't use your existing one)
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy -C "github-actions-deploy" -N ""

# Display the private key (you'll paste this into GitHub)
cat ~/.ssh/github_actions_deploy
```

## 2. Add Public Key to Droplet

```bash
# Copy the public key
cat ~/.ssh/github_actions_deploy.pub

# SSH into droplet and add it
ssh root@45.55.68.178

# Add to authorized_keys
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
exit
```

## 3. Configure GitHub Secrets

1. Go to your GitHub repo: https://github.com/HOP-RAG/HOP
2. Settings → Secrets and variables → Actions
3. Create two new secrets:

**Secret 1: DROPLET_IP**
- Name: `DROPLET_IP`
- Value: `45.55.68.178`

**Secret 2: DROPLET_SSH_KEY**
- Name: `DROPLET_SSH_KEY`
- Value: Paste the ENTIRE private key (from `~/.ssh/github_actions_deploy`)
  - Include `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

## 4. Test the Workflow

Make a small change to the frontend:

```bash
cd /Users/robimoller/Development/HOP

# Make a CSS change
echo "/* test */" >> web/src/app/css/colors.css

# Commit and push to main
git add web/src/app/css/colors.css
git commit -m "test deployment"
git push origin main
```

Go to GitHub → Actions to watch the deployment happen!

## 5. How It Works

When you push to `main`:

1. **GitHub Actions triggers** the deploy workflow
2. **Checks out your code**
3. **Connects to droplet via SSH** using the private key
4. **Pulls latest code** from GitHub
5. **Builds Docker images** with new code
6. **Restarts services** with new images
7. **Runs health checks** to verify deployment
8. **Reports success/failure**

## 6. What Gets Deployed

The workflow rebuilds:
- `api_server` (Backend API)
- `web_server` (Frontend)
- `background` (Background workers)

Other services (PostgreSQL, Redis, Vespa, etc.) are not rebuilt.

## 7. Versioning

Each deployment gets a version based on git tags:

```bash
# Create a version tag
git tag v1.0.0
git push origin v1.0.0

# Next deployment will use v1.0.0
# If no tag exists, it uses timestamp (v20260307-120000)
```

## 8. Rollback (if needed)

If a deployment fails:

```bash
# SSH into droplet
ssh root@45.55.68.178
cd /opt/onyx

# Revert to previous commit
git reset --hard HEAD~1

# Rebuild and restart
sudo docker compose build api_server web_server background
sudo docker compose up -d

# Check logs
sudo docker compose logs -f api_server
```

## 9. Monitoring Deployments

Check deployment status:
- **GitHub**: https://github.com/HOP-RAG/HOP/actions
- **Droplet logs**: `ssh root@45.55.68.178 && cd /opt/onyx && sudo docker compose logs -f api_server`

## 10. Troubleshooting

### SSH connection fails
- Verify SSH key is added to droplet: `cat ~/.ssh/authorized_keys`
- Check IP address is correct: `ping 45.55.68.178`
- Verify secrets are set in GitHub: Settings → Secrets

### Build fails
- Check logs in GitHub Actions
- SSH to droplet and manually test: `cd /opt/onyx && sudo docker compose build api_server`

### Services don't start
- Check docker compose logs: `sudo docker compose logs api_server`
- Verify database is running: `sudo docker compose ps`
- Check disk space: `df -h /opt/onyx`

## 11. Manual Deployment

If needed, you can still deploy manually:

```bash
ssh root@45.55.68.178
cd /opt/onyx
git reset --hard origin/main
sudo docker compose build api_server web_server background
sudo docker compose up -d
```

---

**That's it!** Now every time you push to `main`, your changes automatically deploy to the droplet. 🚀
