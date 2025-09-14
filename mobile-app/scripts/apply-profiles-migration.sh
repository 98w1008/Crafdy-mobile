#!/usr/bin/env bash
set -euo pipefail

# =============================================
# Crafdy Mobile - Apply Profiles Migration
# =============================================
# このスクリプトは、profiles view と user_profiles テーブルを
# 作成するマイグレーションを実行します。
# =============================================

# Resolve repo root (this script lives in mobile-app/scripts)
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
MIGRATION_FILE="$ROOT_DIR/supabase/migrations/009_create_profiles_view_and_user_profiles.sql"

# Load Supabase credentials from mobile-app/.env if present
if [ -f "$ROOT_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ROOT_DIR/.env"; set +a
fi

# Validate required env vars
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "[apply-profiles-migration] Missing SUPABASE_URL or SUPABASE_ANON_KEY."
  echo "Please set them in mobile-app/.env or export them in your shell."
  exit 1
fi

echo "======================================"
echo "Crafdy Mobile - Profiles Migration"
echo "======================================"
echo "Migration file: $MIGRATION_FILE"
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "🔍 Migration file found: $(basename "$MIGRATION_FILE")"
echo ""

# Option 1: Using supabase CLI (if available)
if command -v supabase &> /dev/null; then
  echo "📋 Option 1: Using Supabase CLI"
  echo "Run the following command to apply the migration:"
  echo ""
  echo "  cd $ROOT_DIR && supabase db push"
  echo ""
  echo "Or manually execute:"
  echo "  supabase db reset"
  echo ""
fi

# Option 2: Manual execution instructions
echo "📋 Option 2: Manual execution via Supabase Dashboard"
echo "1. Go to https://supabase.com/dashboard/project/aerscsgzulqfsecltyjz/sql/new"
echo "2. Copy and paste the contents of the migration file:"
echo "   $MIGRATION_FILE"
echo "3. Click 'Run' to execute the migration"
echo ""

# Option 3: Using psql (if connection string is available)
echo "📋 Option 3: Using psql (requires service role key)"
echo "If you have the service role key, you can run:"
echo ""
echo '  export PGPASSWORD="[YOUR_SERVICE_ROLE_KEY]"'
echo '  psql -h db.aerscsgzulqfsecltyjz.supabase.co -U postgres -d postgres -p 5432 -f "$MIGRATION_FILE"'
echo ""

echo "======================================"
echo "Migration Content Summary:"
echo "======================================"
echo "✅ Creates user_profiles table with proper structure for AuthContext"
echo "✅ Migrates existing profiles data to user_profiles"
echo "✅ Creates profiles view (auth.users + user_profiles join)"
echo "✅ Sets up RLS policies for security"
echo "✅ Grants proper permissions to authenticated users"
echo "✅ Updates user creation trigger"
echo ""

echo "🚀 Choose one of the above options to apply the migration!"
echo "After applying, the AuthContext should work correctly with the new structure."