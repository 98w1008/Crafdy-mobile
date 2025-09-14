#!/bin/bash

# Tunnel接続問題時の簡単再起動スクリプト
echo "🚇 Crafdy Mobile - Tunnel Restart Script"
echo "========================================"

# 現在のプロセスを確認
echo "🔍 Checking for running Expo processes..."
EXPO_PID=$(pgrep -f "expo start")

if [ ! -z "$EXPO_PID" ]; then
    echo "🛑 Stopping existing Expo process (PID: $EXPO_PID)"
    kill $EXPO_PID
    sleep 2
    
    # 強制終了が必要な場合
    if kill -0 $EXPO_PID 2>/dev/null; then
        echo "🔨 Force killing Expo process"
        kill -9 $EXPO_PID
        sleep 1
    fi
else
    echo "✅ No running Expo processes found"
fi

# Metro bundler キャッシュをクリア
echo "🧹 Clearing Metro bundler cache..."
npx expo start --clear --reset-cache --tunnel &

# 少し待ってからステータス確認
sleep 5

echo ""
echo "🎉 Tunnel restart completed!"
echo ""
echo "📱 Next steps:"
echo "1. Wait for 'Tunnel connected' message"
echo "2. Scan the QR code with Expo Go"
echo "3. Check logs for tunnel stability monitoring"
echo ""
echo "💡 If problems persist:"
echo "- Check Ngrok status: https://status.ngrok.com/"
echo "- Try different network connection"
echo "- Consider Expo Development Build for better stability"
echo ""