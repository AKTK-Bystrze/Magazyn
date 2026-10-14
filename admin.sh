#!/bin/bash
set -euo pipefail

# ==============================================================================
# Magazyn Admin Cockpit
# Single entry point for deployment, diagnostics, disaster recovery, and backups
# ==============================================================================

# Self-isolation mechanism: copy executing script to /tmp to prevent
# corruption when switching git tags/branches.
if [ "${ADMIN_ISOLATED:-false}" != "true" ] && [ -n "${TMPDIR:-/tmp}" ]; then
  TMP_SCRIPT=$(mktemp /tmp/magazyn-admin-XXXXXX.sh)
  cp "$0" "$TMP_SCRIPT"
  chmod +x "$TMP_SCRIPT"
  export ADMIN_ISOLATED=true
  export ORIGINAL_SCRIPT_DIR="$(dirname "$(realpath "$0")")"
  exec "$TMP_SCRIPT" "$@"
fi

SCRIPT_DIR="${ORIGINAL_SCRIPT_DIR:-$(dirname "$(realpath "$0")")}"
cd "${SCRIPT_DIR}"
ROOT_DIR="${SCRIPT_DIR}"

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
  local failed_step="$1"
  echo ""
  echo -e "${RED}${BOLD}====================================================================${NC}"
  echo -e "${RED}${BOLD} [ERROR] Action failed at: ${failed_step}${NC}"
  echo -e "${RED}${BOLD}====================================================================${NC}"
  echo "Suggested recovery steps:"
  echo "  1. Check system diagnostics:    ./admin.sh doctor"
  echo "  2. Inspect container logs:      cd infra && docker compose logs --tail=50"
  echo "  3. Roll back to safe state:     ./admin.sh rollback"
  echo ""
  echo -e "Refer to the Disaster Recovery Playbook:"
  echo -e "  ${CYAN}documentation/operations/recovery_playbook.md${NC}"
  echo -e "${RED}${BOLD}====================================================================${NC}"
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
  bash "${ROOT_DIR}/infra/doctor.sh"
}

cmd_sanity() {
  bash "${ROOT_DIR}/infra/sanity_check.sh"
}

cmd_backup() {
  local tag="${1:-}"
  bash "${ROOT_DIR}/infra/backups/backup_db.sh" "${tag}"
}

cmd_restore() {
  local snapshot="${1:-}"
  shift || true
  if [ -z "$snapshot" ]; then
    echo "Available snapshots in infra/backups/daily:"
    ls -1t "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz 2>/dev/null || echo "No daily snapshots found."
    read -p "Enter snapshot file path to restore: " snapshot
  fi
  bash "${ROOT_DIR}/infra/backups/restore_db.sh" "$@" "${snapshot}"
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
    echo "Fetching tags from remote..."
    git fetch --tags -f >/dev/null 2>&1 || true
    echo ""
    echo "Available release tags:"
    local tags
    tags=($(git tag -l --sort=-v:refname | head -n 10))
    if [ ${#tags[@]} -eq 0 ]; then
      fail "No git tags found in repository. Push tags or specify a commit/branch."
      exit 1
    fi
    for i in "${!tags[@]}"; do
      echo "  $((i+1))) ${tags[$i]}"
    done
    echo ""
    read -p "Select a tag number or type a tag name: " selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#tags[@]} ]; then
      target_tag="${tags[$((selection-1))]}"
    else
      target_tag="${selection}"
    fi
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
  bash "${ROOT_DIR}/infra/backups/backup_db.sh" "${target_tag}" || {
    show_error_guidance "pre-deploy database backup"
    exit 1
  }

  # Step 3: Switch repository tag
  info "Step 3/6: Checking out ${target_tag}..."
  git checkout "${target_tag}" || {
    show_error_guidance "git checkout ${target_tag}"
    exit 1
  }

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
  if ! bash "${ROOT_DIR}/infra/sanity_check.sh"; then
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
    local tags
    tags=($(git tag -l --sort=-v:refname | head -n 10))
    for i in "${!tags[@]}"; do
      echo "  $((i+1))) ${tags[$i]}"
    done
    read -p "Select tag to roll back to: " selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#tags[@]} ]; then
      target_tag="${tags[$((selection-1))]}"
    else
      target_tag="${selection}"
    fi
  fi

  # Discover snapshots if not given
  if [ -z "$snapshot_file" ] || [ "$snapshot_file" = "-y" ] || [ "$snapshot_file" = "--yes" ]; then
    echo ""
    echo "Available backup snapshots:"
    local snaps
    snaps=($(ls -1t "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz 2>/dev/null || true))
    if [ ${#snaps[@]} -eq 0 ]; then
      fail "No snapshots found in ${ROOT_DIR}/infra/backups/daily."
      exit 1
    fi
    for i in "${!snaps[@]}"; do
      echo "  $((i+1))) $(basename "${snaps[$i]}")"
    done
    read -p "Select snapshot to restore: " s_sel
    if [[ "$s_sel" =~ ^[0-9]+$ ]] && [ "$s_sel" -ge 1 ] && [ "$s_sel" -le ${#snaps[@]} ]; then
      snapshot_file="${snaps[$((s_sel-1))]}"
    else
      snapshot_file="${s_sel}"
    fi
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
  bash "${ROOT_DIR}/infra/backups/restore_db.sh" --yes --no-restart "${snapshot_file}"

  # Step 2: Checkout Git Tag
  info "Step 2/3: Checking out git tag: ${target_tag}..."
  git checkout "${target_tag}"

  # Step 3: Rebuild and Restart Containers
  info "Step 3/3: Rebuilding and restarting containers..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_tag}"
  docker compose up -d --build --wait

  # Verify with sanity
  bash "${ROOT_DIR}/infra/sanity_check.sh" || true

  echo ""
  echo -e "${GREEN}${BOLD}Rollback to ${target_tag} complete!${NC}"
}

show_menu() {
  clear 2>/dev/null || true
  echo -e "${CYAN}${BOLD}==============================================${NC}"
  echo -e "${CYAN}${BOLD}           Magazyn Admin Cockpit              ${NC}"
  echo -e "${CYAN}${BOLD}==============================================${NC}"
  echo "  1) Deploy release tag"
  echo "  2) Rollback release (revert tag & restore DB)"
  echo "  3) Run system diagnostics (doctor)"
  echo "  4) Run sanity check"
  echo "  5) Create database backup snapshot"
  echo "  6) Restore database from snapshot"
  echo "  7) View system status & container health"
  echo "  8) Prune unused Docker images (free disk)"
  echo "  q) Exit"
  echo "----------------------------------------------"
  read -p "Select an option [1-8, q]: " choice
  case "$choice" in
    1) cmd_deploy ;;
    2) cmd_rollback ;;
    3) cmd_doctor ;;
    4) cmd_sanity ;;
    5) cmd_backup ;;
    6) cmd_restore ;;
    7) cmd_status ;;
    8) cmd_prune ;;
    q|Q) exit 0 ;;
    *) echo "Invalid option"; sleep 1; show_menu ;;
  esac
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
