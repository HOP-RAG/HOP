# Production Deployment Safety Guide

## Current Issues

1. **Untracked Root docker-compose.yml** - `/opt/onyx/docker-compose.yml` is not in git, causing drift from tracked version
2. **No Pre-Deployment Backups** - No snapshots or backups before running destructive operations
3. **Limited Rollback Options** - No easy way to revert to a known good state
4. **Health Check Gaps** - Only checks if endpoints respond, not data integrity

## Safe Deployment Procedure

### Before Deploying

1. **Create a Snapshot Tag** (on droplet):
   ```bash
   cd /opt/onyx
   # Create backup docker-compose before deployment
   cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d-%H%M%S)

   # Tag the current known-good state
   git tag deployment/prod-$(date +%Y%m%d-%H%M%S)
   git push origin --tags
   ```

2. **Database Snapshot** (optional but recommended):
   ```bash
   docker compose exec relational_db pg_dump -U postgres -d onyx > backup/onyx-$(date +%Y%m%d-%H%M%S).sql
   ```

### During Deployment

1. **Use Correct docker-compose.yml**:
   - The deploy script should explicitly use: `docker-compose -f deployment/docker_compose/docker-compose.yml`
   - OR symlink the root file: `ln -sf deployment/docker_compose/docker-compose.yml docker-compose.yml`

2. **Improved Health Checks**:
   - Check API health: `curl http://localhost:8080/health`
   - Check frontend: `curl http://localhost:3000`
   - Check nginx/SSL: `curl https://klugermax.com`
   - Verify database connectivity
   - Check disk space hasn't been exhausted

### Rollback Procedure (if deployment fails)

```bash
cd /opt/onyx

# Option 1: Restore from backup docker-compose
cp docker-compose.yml.backup.20260308-175034 docker-compose.yml

# Option 2: Revert to previous git tag
git reset --hard deployment/prod-20260308-175034

# Option 3: Restore database from backup
# docker compose exec relational_db psql -U postgres -d onyx < backup/onyx-20260308-175034.sql

# Restart services
docker compose down
docker compose up -d

# Verify health
docker compose ps
curl http://localhost:8080/health
curl https://klugermax.com
```

## Recommended Deploy Script Changes

The current deploy script should be enhanced with:

1. **Pre-deployment backup**:
   ```bash
   BACKUP_DIR=/opt/onyx/backups
   mkdir -p $BACKUP_DIR
   cp docker-compose.yml $BACKUP_DIR/docker-compose.yml.$(date +%Y%m%d-%H%M%S)
   ```

2. **Explicit docker-compose file**:
   ```bash
   docker compose -f deployment/docker_compose/docker-compose.yml pull
   docker compose -f deployment/docker_compose/docker-compose.yml up -d
   ```

3. **Enhanced health checks**:
   - Database connectivity test
   - Vespa search index test
   - Redis connectivity test
   - SSL certificate validity check

4. **Automatic rollback on failure**:
   ```bash
   if [ $deployment_failed ]; then
     cp $BACKUP_DIR/docker-compose.yml.latest docker-compose.yml
     docker compose down
     docker compose up -d
     # Alert operator
   fi
   ```

## Key Takeaways

✅ **Safe**: The actual docker-compose.yml IS in git
❌ **Unsafe**: The deploy script doesn't explicitly reference it
❌ **Unsafe**: No backups created before deployment
❌ **Unsafe**: No automated rollback on failure

## Next Steps

1. Update the deploy script to use explicit file path
2. Add pre-deployment backup creation
3. Implement automated rollback on health check failure
4. Set up monitoring/alerting for failed deployments
5. Document manual rollback procedure for operations team
