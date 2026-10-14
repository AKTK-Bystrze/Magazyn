#!/bin/bash
set -euo pipefail

# ==============================================================================
# Magazyn Admin Cockpit
# Single entry point for deployment, diagnostics, disaster recovery, and backups
# ==============================================================================

# Self-isolation mechanism: copy executing script and helpers to /tmp
# to prevent corruption or disappearance when switching git tags/branches.
if [ "${ADMIN_ISOLATED:-false}" != "true" ] && [ -n "${TMPDIR:-/tmp}" ]; then
  TMP_DIR=$(mktemp -d /tmp/magazyn-admin-XXXXXX)
  cp "$0" "${TMP_DIR}/admin.sh"
  mkdir -p "${TMP_DIR}/infra"
  if [ -d "$(dirname "$0")/infra" ]; then
    cp -r "$(dirname "$0")/infra"/* "${TMP_DIR}/infra/" 2>/dev/null || true
  fi
  chmod +x "${TMP_DIR}/admin.sh"
  export ADMIN_ISOLATED=true
  export ADMIN_TMP_DIR="${TMP_DIR}"
  export ORIGINAL_SCRIPT_DIR="$(dirname "$(realpath "$0")")"
  export MAGAZYN_ROOT_DIR="${ORIGINAL_SCRIPT_DIR}"
  exec "${TMP_DIR}/admin.sh" "$@"
fi

SCRIPT_DIR="${MAGAZYN_ROOT_DIR:-${ORIGINAL_SCRIPT_DIR:-$(dirname "$(realpath "$0")")}}"
cd "${SCRIPT_DIR}"
ROOT_DIR="${SCRIPT_DIR}"
export MAGAZYN_ROOT_DIR="${ROOT_DIR}"
HELPER_DIR="${ADMIN_TMP_DIR:-${ROOT_DIR}}"

# ANSI Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  [${GREEN}OK${NC}] $1"; }
warn() { echo -e "  [${YELLOW}WARN${NC}] $1"; }
fail() { echo -e "  [${RED}FAIL${NC}] $1"; }
info() { echo -e "${BLUE}==>${NC} $1"; }

show_error_guidance() {
  echo ""
  fail "Action failed at: $1"
  echo "Suggested recovery: 1) ./admin.sh doctor  2) docker compose logs --tail=50  3) ./admin.sh rollback"
  echo -e "Refer to Playbook: ${CYAN}documentation/operations/recovery_playbook.md${NC}"
  echo ""
}

load_env() {
  if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    source <(sed 's/\r$//' "${ROOT_DIR}/.env")
    set +a
  else
    fail ".env file not found at ${ROOT_DIR}/.env"
    exit 1
  fi
}

cmd_doctor() {
  bash "${HELPER_DIR}/infra/doctor.sh"
}

cmd_sanity() {
  bash "${HELPER_DIR}/infra/sanity_check.sh"
}

cmd_backup() {
  local tag="${1:-}"
  bash "${HELPER_DIR}/infra/backups/backup_db.sh" "${tag}"
}

cmd_restore() {
  local snapshot="${1:-}"
  shift || true
  if [ -z "$snapshot" ]; then
    echo "Available snapshots in infra/backups/daily:"
    ls -1t "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz 2>/dev/null || echo "No daily snapshots found."
    read -p "Enter snapshot file path to restore: " snapshot
  fi
  bash "${HELPER_DIR}/infra/backups/restore_db.sh" "$@" "${snapshot}"
}

cmd_status() {
  info "Repository Status:"
  local branch
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
  local current_tag
  current_tag=$(git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "none")
  local commit
  commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "  Branch:       ${branch}"
  echo "  Current Tag:  ${current_tag}"
  echo "  Commit:       ${commit}"
  echo ""

  info "Docker Containers:"
  load_env
  cd "${ROOT_DIR}/infra"
  docker compose ps || true
  echo ""

  info "Recent Backups:"
  ls -lh "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz 2>/dev/null | tail -n 5 || echo "No backups found."
}

cmd_prune() {
  info "Pruning unused Docker images and build caches to free disk space..."
  docker image prune -a -f --filter "until=48h" || docker image prune -f
  ok "Prune complete."
}

cmd_deploy() {
  local target_tag="${1:-}"
  local force=false
  if [ "${2:-}" = "--force" ] || [ "${target_tag}" = "--force" ]; then
    force=true
    if [ "${target_tag}" = "--force" ]; then target_tag="${2:-}"; fi
  fi

  # Auto-discovery if tag not provided
  if [ -z "$target_tag" ]; then
    git fetch --tags -f >/dev/null 2>&1 || true
    echo "Available release tags:"
    PS3="Select tag [number or name]: "
    select tag in $(git tag -l --sort=-v:refname | head -n 10); do
      target_tag="${tag:-$REPLY}"
      break
    done
  fi

  [ -n "$target_tag" ] || { fail "Target tag cannot be empty"; exit 1; }

  info "Starting deployment to: ${BOLD}${target_tag}${NC}"

  # Step 1: Pre-flight checks
  info "Step 1/6: Running pre-flight diagnostics..."
  git fetch --tags -f || { show_error_guidance "git fetch --tags"; exit 1; }

  if ! git rev-parse -q --verify "refs/tags/${target_tag}^{commit}" >/dev/null 2>&1; then
    if ! git rev-parse -q --verify "${target_tag}^{commit}" >/dev/null 2>&1; then
      fail "Target tag/commit '${target_tag}' does not exist in git."
      show_error_guidance "tag validation"; exit 1;
    fi
  fi

  CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "initial")
  if [ "${target_tag}" = "${CURRENT_TAG}" ] && [ "$force" = false ]; then
    echo ""
    warn "Repository is already at tag '${CURRENT_TAG}'."
    read -p "Do you want to force redeploy this tag? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Deployment cancelled."
      exit 0
    fi
  fi

  load_env

  # Step 2: Database snapshot
  info "Step 2/6: Creating pre-deployment database backup..."
  bash "${HELPER_DIR}/infra/backups/backup_db.sh" "${target_tag}" || {
    show_error_guidance "pre-deploy database backup"
    exit 1
  }

  # Step 3: Switch repository tag
  info "Step 3/6: Checking out ${target_tag}..."
  git checkout "${target_tag}" || {
    show_error_guidance "git checkout ${target_tag}"
    exit 1
  }

  # Ensure admin.sh exists in target repo after deployment
  if [ ! -f "${ROOT_DIR}/admin.sh" ] && [ -n "${ADMIN_TMP_DIR:-}" ]; then
    cp "${ADMIN_TMP_DIR}/admin.sh" "${ROOT_DIR}/admin.sh"
    chmod +x "${ROOT_DIR}/admin.sh"
  fi

  # Step 4: Build container images BEFORE migrating database
  info "Step 4/6: Building Docker container images (build-first safety)..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_tag}"
  if ! docker compose build; then
    fail "Docker build failed! Database was NOT modified."
    git checkout "${CURRENT_TAG}" 2>/dev/null || true
    show_error_guidance "docker compose build"
    exit 1
  fi

  # Step 5: Database migrations via containerized CLI
  info "Step 5/6: Applying database migrations..."
  cd "${ROOT_DIR}"
  if ! docker run --rm --network host \
    -v magazyn_npm_cache:/root/.npm \
    -v "${ROOT_DIR}:/app" \
    -w /app \
    node:22-alpine \
    npx --yes supabase db push --yes --db-url "${DB_CONNECTION_STRING}"; then
    fail "Database migration failed!"
    echo "Your previous containers are still running. If DB requires restoration, run:"
    echo "  ./admin.sh rollback ${CURRENT_TAG}"
    show_error_guidance "database migration"
    exit 1
  fi

  # Step 6: Bring up containers with healthcheck verification
  info "Step 6/6: Restarting containers and verifying health..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_tag}"
  docker compose up -d --wait || {
    fail "Containers failed to report healthy within timeout."
    show_error_guidance "docker compose up --wait"
    exit 1
  }

  # Post-deploy disk cleanup
  docker image prune -f --filter "dangling=true" >/dev/null 2>&1 || true

  # Sanity Check
  info "Running post-deploy sanity check..."
  if ! bash "${HELPER_DIR}/infra/sanity_check.sh"; then
    echo ""
    warn "Post-deployment sanity check reported warnings or failed."
    warn "The new containers are currently online. If you need to revert, run:"
    echo -e "  ${BOLD}./admin.sh rollback ${CURRENT_TAG}${NC}"
  else
    echo ""
    echo -e "${GREEN}${BOLD}====================================================================${NC}"
    echo -e "${GREEN}${BOLD}  Deployment to ${target_tag} successfully completed and verified!  ${NC}"
    echo -e "${GREEN}${BOLD}====================================================================${NC}"
  fi
}

cmd_rollback() {
  local target_tag="${1:-}"
  local snapshot_file="${2:-}"
  local auto_yes=false

  for arg in "$@"; do
    if [ "$arg" = "-y" ] || [ "$arg" = "--yes" ]; then auto_yes=true; fi
  done

  info "Initiating system rollback..."

  # Discover tags if not given
  if [ -z "$target_tag" ] || [ "$target_tag" = "-y" ] || [ "$target_tag" = "--yes" ]; then
    echo "Available previous release tags:"
    PS3="Select tag to roll back to: "
    select tag in $(git tag -l --sort=-v:refname | head -n 10); do
      target_tag="${tag:-$REPLY}"
      break
    done
  fi

  # Discover snapshots if not given
  if [ -z "$snapshot_file" ] || [ "$snapshot_file" = "-y" ] || [ "$snapshot_file" = "--yes" ]; then
    echo ""
    echo "Available backup snapshots:"
    PS3="Select snapshot to restore: "
    select snap in "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz; do
      snapshot_file="${snap:-$REPLY}"
      break
    done
  fi

  echo ""
  echo "Rollback Summary:"
  echo "  Target Git Tag: ${target_tag}"
  echo "  DB Snapshot:    $(basename "${snapshot_file}")"
  echo ""

  if [ "$auto_yes" = false ]; then
    read -p "Are you sure you want to rollback to this state? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Rollback cancelled."
      exit 0
    fi
  fi

  # Step 1: Restore DB
  info "Step 1/3: Restoring database snapshot..."
  bash "${HELPER_DIR}/infra/backups/restore_db.sh" --yes --no-restart "${snapshot_file}"

  # Step 2: Checkout Git Tag
  info "Step 2/3: Checking out git tag: ${target_tag}..."
  git checkout "${target_tag}"

  # Ensure admin.sh exists in target repo after rollback
  if [ ! -f "${ROOT_DIR}/admin.sh" ] && [ -n "${ADMIN_TMP_DIR:-}" ]; then
    cp "${ADMIN_TMP_DIR}/admin.sh" "${ROOT_DIR}/admin.sh"
    chmod +x "${ROOT_DIR}/admin.sh"
  fi

  # Step 3: Rebuild and Restart Containers
  info "Step 3/3: Rebuilding and restarting containers..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_tag}"
  docker compose up -d --build --wait

  # Verify with sanity
  bash "${HELPER_DIR}/infra/sanity_check.sh" || true

  echo ""
  echo -e "${GREEN}${BOLD}Rollback to ${target_tag} complete!${NC}"
}

show_menu() {
  echo -e "${CYAN}${BOLD}=== Magazyn Admin Cockpit ===${NC}"
  PS3="Select an option [1-9]: "
  select opt in "Deploy release tag" \
                "Rollback release" \
                "Run system diagnostics (doctor)" \
                "Run sanity check" \
                "Create database backup snapshot" \
                "Restore database from snapshot" \
                "View system status" \
                "Prune unused Docker images" \
                "Exit"; do
    case "$REPLY" in
      1) cmd_deploy; break ;;
      2) cmd_rollback; break ;;
      3) cmd_doctor; break ;;
      4) cmd_sanity; break ;;
      5) cmd_backup; break ;;
      6) cmd_restore; break ;;
      7) cmd_status; break ;;
      8) cmd_prune; break ;;
      9|q|Q) exit 0 ;;
      *) echo "Invalid option" ;;
    esac
  done
}

show_help() {
  cat << 'EOF'
Magazyn Admin Cockpit (admin.sh)

Usage:
  ./admin.sh [COMMAND] [OPTIONS]

Commands:
  deploy [TAG] [--force]    Deploy a git release tag (builds first, migrates DB, restarts)
  rollback [TAG] [SNAP]     Roll back to a previous tag and database snapshot
  doctor                    Run system environment, disk space, and connectivity diagnostics
  sanity                    Run automated health checks and authenticated read test
  backup [TAG]              Create a database snapshot
  restore [SNAP] [-y]       Restore database from a snapshot file
  status                    View repository version, container states, and recent backups
  prune                     Prune unused Docker images to free disk space

Interactive Mode:
  ./admin.sh                Run without arguments to launch the interactive menu
EOF
}

# Main routing
ACTION="${1:-}"
case "${ACTION}" in
  deploy)   shift; cmd_deploy "$@" ;;
  rollback) shift; cmd_rollback "$@" ;;
  doctor)   shift; cmd_doctor "$@" ;;
  sanity)   shift; cmd_sanity "$@" ;;
  backup)   shift; cmd_backup "$@" ;;
  restore)  shift; cmd_restore "$@" ;;
  status)   shift; cmd_status "$@" ;;
  prune)    shift; cmd_prune "$@" ;;
  -h|--help) show_help ;;
  "")
    if [ -t 0 ]; then
      show_menu
    else
      show_help
    fi
    ;;
  *)
    fail "Unknown command: ${ACTION}"
    show_help
    exit 1
    ;;
esac
