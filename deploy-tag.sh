#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
echo "Note: deploy-tag.sh is deprecated. Forwarding to './admin.sh deploy $@'..."
exec "${SCRIPT_DIR}/admin.sh" deploy "$@"
