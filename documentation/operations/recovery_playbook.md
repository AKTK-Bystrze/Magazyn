# Magazyn Disaster Recovery & Operations Playbook

This playbook provides actionable, step-by-step procedures for administering, deploying, and recovering the Magazyn application stack.

---

## 1. Quick Start: The Admin Cockpit (`./admin.sh`)

All routine and emergency administrative tasks are unified under [`admin.sh`](../../admin.sh).

### Interactive Mode (Recommended for Newcomers)

Simply run the script with no arguments:

```bash
./admin.sh
```

This presents an interactive menu that automatically discovers available Git release tags and backup snapshots:

```text
==============================================
           Magazyn Admin Cockpit
==============================================
  1) Deploy release tag
  2) Rollback release (revert tag & restore DB)
  3) Run system diagnostics (doctor)
  4) Run sanity check
  5) Create database backup snapshot
  6) Restore database from snapshot
  7) View system status & container health
  8) Prune unused Docker images (free disk)
  q) Exit
```

### CLI Command Mode (For Automation & CI)

```bash
./admin.sh deploy v0.2.2             # Deploy a specific tag
./admin.sh deploy v0.2.2 --force     # Force redeploy if already on target tag
./admin.sh rollback                  # Interactive rollback wizard
./admin.sh rollback v0.2.1 <snap> -y # Non-interactive rollback
./admin.sh doctor                    # Run system health diagnostics
./admin.sh sanity                    # Run endpoint and auth sanity tests
./admin.sh backup [tag]              # Create a pre-deploy or ad-hoc DB snapshot
./admin.sh restore <snap> -y         # Restore DB snapshot without confirmation prompt
./admin.sh status                    # View active tag, containers, disk space
./admin.sh prune                     # Prune dangling/old images (free disk space)
```

---

## 2. Recovery Scenarios

### Scenario A: Deployment Fails During Docker Build

**Symptom**: `docker compose build` fails with an out-of-disk error (`no space left on device`) or a TypeScript/Go compilation error.

- **Impact**: **Zero downtime / Zero database corruption**.
- **Reason**: [`admin.sh`](../../admin.sh) builds container images **before** pushing database migrations. The database has not been touched, and your previous containers remain online.
- **Resolution**:
  1. Free disk space on the host:
     ```bash
     ./admin.sh prune
     ```
  2. Run the doctor to verify disk and system health:
     ```bash
     ./admin.sh doctor
     ```
  3. Re-run deployment:
     ```bash
     ./admin.sh deploy <TARGET_TAG>
     ```

---

### Scenario B: Deployment Fails During Database Migration

**Symptom**: `supabase db push` fails with SQL syntax errors, failed constraints, or connection timeout.

- **Impact**: The database may be partially migrated, but container images have not been restarted.
- **Resolution**:
  1. Revert to the snapshot created right before the deployment started:
     ```bash
     ./admin.sh rollback
     ```
  2. The rollback wizard will prompt you to select:
     - Target Git tag (e.g., your previous stable release tag).
     - Database snapshot (select the most recent snapshot from `infra/backups/daily/`).
  3. The script will automatically restore the database schema, checkout the previous tag, and restart containers with health validation.

---

### Scenario C: Post-Deployment Sanity Check Reports Failure

**Symptom**: Deployment completes, but [`infra/sanity_check.sh`](../../infra/sanity_check.sh) reports a failed health check or authenticated read error.

- **Policy**: Sanity test failures **do not** trigger automated rollbacks. This allows you to inspect logs and distinguish between test credential expiration vs an actual application issue.
- **Resolution**:
  1. Inspect container logs:
     ```bash
     cd infra && docker compose logs -f backend
     ```
  2. Verify if the issue is just missing/invalid sanity test credentials in `.env` (`SANITY_TEST_USER_EMAIL` / `SANITY_TEST_USER_PASSWORD`).
  3. If there is a legitimate application bug in the new release, execute an emergency rollback:
     ```bash
     ./admin.sh rollback <PREVIOUS_TAG>
     ```

---

### Scenario D: Accidental Data Deletion or Standalone Database Restore

If you need to restore the database independently without changing the Git repository or container versions:

1. Locate your target snapshot:
   ```bash
   ls -lh infra/backups/daily/
   ```
2. Run the standalone restore script:
   ```bash
   ./infra/backups/restore_db.sh infra/backups/daily/public-rollback-YYYYMMDD-HHMMSS.sql.gz
   ```
   _(Or use `-y` / `--yes` to skip the interactive confirmation prompt)._

---

### Scenario E: Complete Host Rebuild (Bare-metal Recovery)

If the server machine is wiped or being migrated to a new host:

1. Clone the repository and copy your production `.env` and SSL certificates (`infra/certs/`).
2. Run the doctor tool to verify dependencies:
   ```bash
   ./admin.sh doctor
   ```
3. Restore the latest database backup:
   ```bash
   ./infra/backups/restore_db.sh infra/backups/latest-public-rollback.sql.gz
   ```
4. Deploy the desired release tag:
   ```bash
   ./admin.sh deploy <TAG>
   ```

---

## 3. Standalone Script Reference

Every helper script in `infra/` is designed as a standalone, single-responsibility tool that can be invoked directly outside `admin.sh`:

| Script                                                             | Purpose                                      | Key Flags / Arguments                                                            |
| :----------------------------------------------------------------- | :------------------------------------------- | :------------------------------------------------------------------------------- |
| [`admin.sh`](../../admin.sh)                                       | Central admin cockpit & orchestrator         | `deploy`, `rollback`, `doctor`, `sanity`, `backup`, `restore`, `status`, `prune` |
| [`infra/doctor.sh`](../../infra/doctor.sh)                         | Validates `.env`, disk space, Docker, and DB | No arguments. Returns exit code `0` (pass) or `1` (fail).                        |
| [`infra/sanity_check.sh`](../../infra/sanity_check.sh)             | Tests public endpoints & read-only auth flow | Uses credentials from `.env`. Returns `0` (pass) or `1` (fail).                  |
| [`infra/backups/backup_db.sh`](../../infra/backups/backup_db.sh)   | Dumps `public` and `auth` schemas to gzip    | `[TAG_LABEL]` (optional label prepended to filename).                            |
| [`infra/backups/restore_db.sh`](../../infra/backups/restore_db.sh) | Drops schemas and restores from snapshot     | `[-y \| --yes]` (bypass prompt), `[--no-restart]`, `<PATH_TO_GZ>`.               |
