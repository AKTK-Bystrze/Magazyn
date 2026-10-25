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

ROOT_DIR="${MAGAZYN_ROOT_DIR:-$(dirname "$(realpath "$0")")}"
cd "${ROOT_DIR}"
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

restore_self() {
  if [ -n "${ADMIN_TMP_DIR:-}" ] && [ -f "${ADMIN_TMP_DIR}/admin.sh" ]; then
    cp -f "${ADMIN_TMP_DIR}/admin.sh" "${ROOT_DIR}/admin.sh"
    chmod +x "${ROOT_DIR}/admin.sh"
  fi
}

pick_tag() {
  git fetch --tags -f >/dev/null 2>&1 || true
  echo "Available release tags:" >&2
  PS3="Select tag [number or name]: "
  select tag in $(git tag -l --sort=-v:refname | head -n 10); do
    echo "${tag:-$REPLY}"
    return
  done
}

pick_target() {
  git fetch origin --tags -f >/dev/null 2>&1 || true

  local c1_hash c1_desc c2_hash c2_desc c3_hash c3_desc
  c1_hash=$(git log -1 --skip=0 --format="%h" 2>/dev/null || echo "")
  c1_desc=$(git log -1 --skip=0 --format="%h - %s (%cr)" 2>/dev/null || echo "")
  c2_hash=$(git log -1 --skip=1 --format="%h" 2>/dev/null || echo "")
  c2_desc=$(git log -1 --skip=1 --format="%h - %s (%cr)" 2>/dev/null || echo "")
  c3_hash=$(git log -1 --skip=2 --format="%h" 2>/dev/null || echo "")
  c3_desc=$(git log -1 --skip=2 --format="%h - %s (%cr)" 2>/dev/null || echo "")

  echo "Select commit or enter any commit ID / tag to deploy:" >&2
  PS3="Select target [1-4 or enter commit/tag]: "
  select opt in "${c1_desc:-Commit 1}" \
                "${c2_desc:-Commit 2}" \
                "${c3_desc:-Commit 3}" \
                "Enter custom commit ID or tag"; do
    case "$REPLY" in
      1) echo "${c1_hash}"; return ;;
      2) echo "${c2_hash}"; return ;;
      3) echo "${c3_hash}"; return ;;
      4)
        if [ -t 0 ]; then
          read -r -p "Enter commit ID or tag: " custom_target
        else
          read -r custom_target || true
        fi
        echo "${custom_target}"
        return
        ;;
      *)
        if [ -n "$REPLY" ]; then
          echo "${REPLY}"
          return
        fi
        ;;
    esac
  done
}

pick_snapshot() {
  echo "Available backup snapshots:" >&2
  PS3="Select snapshot to restore: "
  select snap in "${ROOT_DIR}/infra/backups/daily"/public-rollback-*.sql.gz; do
    echo "${snap:-$REPLY}"
    return
  done
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

cmd_doctor() { bash "${HELPER_DIR}/infra/doctor.sh" "$@"; }
cmd_sanity() { bash "${HELPER_DIR}/infra/sanity_check.sh" "$@"; }
cmd_backup() { bash "${HELPER_DIR}/infra/backups/backup_db.sh" "$@"; }

cmd_restore() {
  local snapshot="${1:-}"
  if [ -n "$snapshot" ]; then shift; else snapshot=$(pick_snapshot); fi
  bash "${HELPER_DIR}/infra/backups/restore_db.sh" "$@" "${snapshot}"
}

cmd_status() {
  info "Repository Status:"
  git log -1 --format="  Commit:       %h (%s)%n  Branch/Tag:   %D" 2>/dev/null || echo "  Git repository not found."
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
  local force=false
  [[ "$*" =~ --force ]] && force=true
  local target_ref="${1:-}"
  [ "$target_ref" = "--force" ] && target_ref="${2:-}"

  # Auto-discovery if commit/tag not provided
  if [ -z "$target_ref" ]; then
    target_ref=$(pick_target)
  fi

  [ -n "$target_ref" ] || { fail "Target commit/tag cannot be empty"; exit 1; }

  info "Starting deployment to: ${BOLD}${target_ref}${NC}"

  # Step 1: Pre-flight checks
  info "Step 1/6: Running pre-flight diagnostics..."
  git fetch origin --tags -f || { fail "git fetch failed"; exit 1; }

  if ! git rev-parse -q --verify "${target_ref}^{commit}" >/dev/null 2>&1; then
    fail "Target commit/tag '${target_ref}' does not exist in git."
    exit 1
  fi

  RESOLVED_COMMIT=$(git rev-parse --short "${target_ref}^{commit}")
  CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "")
  CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "")

  if ([ "${target_ref}" = "${CURRENT_TAG}" ] || [ "${RESOLVED_COMMIT}" = "${CURRENT_COMMIT}" ]) && [ "$force" = false ]; then
    echo ""
    warn "Repository is already at ${RESOLVED_COMMIT}${CURRENT_TAG:+ (tag: $CURRENT_TAG)}."
    read -p "Do you want to force redeploy? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Deployment cancelled."
      exit 0
    fi
  fi

  load_env

  # Step 2: Database snapshot
  info "Step 2/6: Creating pre-deployment database backup..."
  bash "${HELPER_DIR}/infra/backups/backup_db.sh" "${target_ref}" || {
    fail "Pre-deploy database backup failed"
    exit 1
  }

  # Step 3: Switch repository commit/tag
  info "Step 3/6: Checking out ${target_ref} (${RESOLVED_COMMIT})..."
  git checkout -f "${target_ref}" || { fail "git checkout ${target_ref} failed"; exit 1; }

  restore_self

  # Step 4: Build container images BEFORE migrating database
  info "Step 4/6: Building Docker container images (build-first safety)..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_ref}"
  if ! docker compose build; then
    fail "Docker build failed! Database was NOT modified."
    git checkout -f "${CURRENT_COMMIT}" 2>/dev/null || true
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
    echo "  ./admin.sh rollback ${CURRENT_COMMIT}"
    exit 1
  fi

  # Step 6: Bring up containers with healthcheck verification
  info "Step 6/6: Restarting containers and verifying health..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_ref}"
  docker compose up -d --wait || {
    fail "Containers failed to report healthy within timeout."
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
    echo -e "  ${BOLD}./admin.sh rollback ${CURRENT_COMMIT}${NC}"
  else
    echo ""
    echo -e "${GREEN}${BOLD}====================================================================${NC}"
    echo -e "${GREEN}${BOLD}  Deployment to ${target_ref} (${RESOLVED_COMMIT}) successfully completed and verified!  ${NC}"
    echo -e "${GREEN}${BOLD}====================================================================${NC}"
  fi
}

cmd_rollback() {
  local auto_yes=false
  [[ "$*" =~ -y|--yes ]] && auto_yes=true
  local target_tag="${1:-}"
  [ "$target_tag" = "-y" ] || [ "$target_tag" = "--yes" ] && target_tag=""
  local snapshot_file="${2:-}"
  [ "$snapshot_file" = "-y" ] || [ "$snapshot_file" = "--yes" ] && snapshot_file=""

  info "Initiating system rollback..."
  [ -z "$target_tag" ] && target_tag=$(pick_tag)
  [ -z "$snapshot_file" ] && snapshot_file=$(pick_snapshot)

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
  git checkout -f "${target_tag}"

  restore_self

  # Step 3: Rebuild and Restart Containers
  info "Step 3/3: Rebuilding and restarting containers..."
  cd "${ROOT_DIR}/infra"
  export MAGAZYN_VERSION="${target_tag}"
  docker compose up -d --build --wait

  # Verify with sanity
  if ! bash "${HELPER_DIR}/infra/sanity_check.sh"; then
    echo ""
    warn "Post-rollback sanity check failed. The rollback completed but the system may not be fully healthy."
    warn "Run './admin.sh doctor' to investigate, or check container logs for details."
  fi

  echo ""
  echo -e "${GREEN}${BOLD}Rollback to ${target_tag} complete!${NC}"
}

show_menu() {
  echo -e "${CYAN}${BOLD}=== Magazyn Admin Cockpit ===${NC}"
  PS3="Select an option [1-9]: "
  select opt in "Deploy commit ID or release tag" \
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
  deploy [COMMIT_OR_TAG] [--force]    Deploy any commit ID or git release tag (builds first, migrates DB, restarts)
  rollback [TAG] [SNAP]               Roll back to a previous tag and database snapshot
  doctor                              Run system environment, disk space, and connectivity diagnostics
  sanity                              Run automated health checks and authenticated read test
  backup [TAG]                        Create a database snapshot
  restore [SNAP] [-y]                 Restore database from a snapshot file
  status                              View repository version, container states, and recent backups
  prune                               Prune unused Docker images to free disk space

Interactive Mode:
  ./admin.sh                          Run without arguments to launch the interactive menu
EOF
}

# Main routing
ACTION="${1:-}"
case "${ACTION}" in
  -h|--help) show_help ;;
  "") [ -t 0 ] && show_menu || show_help ;;
  *)
    if declare -f "cmd_${ACTION}" >/dev/null; then
      shift; "cmd_${ACTION}" "$@"
    else
      fail "Unknown command: ${ACTION}"
      show_help
      exit 1
    fi
    ;;
esac
