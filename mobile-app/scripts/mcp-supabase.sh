#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (this script lives in mobile-app/scripts)
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"

# Load Supabase credentials from mobile-app/.env if present
if [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ROOT_DIR/.env"; set +a
fi

# Validate required env vars
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "[mcp-supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY."
  echo "Please set them in mobile-app/.env or export them in your shell."
  exit 1
fi

# Launch the filesystem MCP server for file operations
# This provides file system access to the MCP client
exec npx -y @modelcontextprotocol/server-filesystem

[[mcpServers]]
name = "supabase"
transport = "stdio"
command = "bash"
args = ["-lc", "/Users/watanabekuuya/Crafdy-mobile/mobile-app/scripts/mcp-supabase.sh"]
