#!/bin/bash
set -euo pipefail

# mobile-app ディレクトリに移動
cd "$(dirname "$0")/.."

echo "Starting token refresh process..."

# .env の存在確認
if [ ! -f .env ]; then
  echo "Error: .env file not found."
  exit 1
fi

# .env のバックアップ
cp .env .env.bak
echo "Backup created: .env.bak"

# エラー時のクリーンアップ関数
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "--------------------------------------------------"
    echo "ERROR: Process failed with exit code $exit_code."
    echo "Rolling back to .env.bak..."
    mv .env.bak .env
    echo "Rollback complete."
    echo "--------------------------------------------------"
  else
    rm .env.bak
    echo "Cleanup: Temporary backup removed."
  fi
}
trap cleanup EXIT

# .env から環境変数を安全に読み込む (ダブルクォート除去)
load_env() {
  local key=$1
  grep "^${key}=" .env | cut -d'=' -f2- | sed 's/^"//;s/"$//'
}

URL=$(load_env "EXPO_PUBLIC_SUPABASE_URL")
ANON=$(load_env "EXPO_PUBLIC_SUPABASE_ANON_KEY")

if [ -z "$URL" ] || [ -z "$ANON" ]; then
  echo "Error: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not found in .env"
  exit 1
fi

echo "Fetching new anonymous token from ${URL}..."

# 匿名サインアップを実行してトークンを取得
# HTTPステータスコードも取得
RESPONSE=$(curl -s -w "\n%{http_code}" "${URL}/auth/v1/signup?provider=anonymous" \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" != "200" ]; then
  echo "Error: Auth signup failed with status ${HTTP_STATUS}"
  echo "Response: ${BODY}"
  exit 1
fi

TOKEN=$(echo "$BODY" | python3 -c 'import sys,json; data=json.load(sys.stdin); print(data.get("access_token", ""))')

if [ -z "$TOKEN" ]; then
  echo "Error: access_token not found in response"
  exit 1
fi

# .env の EXPO_PUBLIC_TOKEN を安全に置換 (macOS sed 対応)
if grep -q "^EXPO_PUBLIC_TOKEN=" .env; then
  sed -i '' "s|^EXPO_PUBLIC_TOKEN=.*|EXPO_PUBLIC_TOKEN=\"$TOKEN\"|" .env
else
  echo "EXPO_PUBLIC_TOKEN=\"$TOKEN\"" >> .env
fi

echo "Verifying new token with health check..."

# ヘルスチェックで検証
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/functions/v1/estimates/__health" \
  -H "apikey: ${ANON}" \
  -H "Authorization: Bearer ${TOKEN}")

if [ "$HEALTH_STATUS" != "200" ]; then
  echo "Error: Health check failed with status ${HEALTH_STATUS}. New token might be invalid."
  exit 1
fi

echo "--------------------------------------------------"
echo "SUCCESS: EXPO_PUBLIC_TOKEN has been updated and verified."
echo "Token (first 20 chars): ${TOKEN:0:20}..."
echo "--------------------------------------------------"
