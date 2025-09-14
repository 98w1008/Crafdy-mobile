// Tunnel接続安定化システム - Error Diagnostic Agent
import Constants from 'expo-constants'
import { supabase } from './supabase'

class TunnelStabilityManager {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private isReconnecting = false
  private lastConnectionTime = Date.now()
  private connectionCheckInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startConnectionMonitoring()
  }
  
  // 接続状態の継続監視
  private startConnectionMonitoring() {
    console.log('🚇 Starting tunnel stability monitoring...')
    
    // 30秒ごとに接続状態をチェック
    this.connectionCheckInterval = setInterval(() => {
      this.checkTunnelHealth()
    }, 30000)
  }
  
  // Tunnel接続の健全性チェック
  private async checkTunnelHealth() {
    try {
      console.log('🔍 Checking tunnel health...')
      
      const start = Date.now()
      const { data, error } = await supabase.auth.getSession()
      const duration = Date.now() - start
      
      if (error) {
        console.log(`⚠️ Tunnel health check failed: ${error.message}`)
        this.handleConnectionIssue()
      } else if (duration > 10000) {
        console.log(`⚠️ Tunnel response slow: ${duration}ms`)
        this.handleSlowConnection()
      } else {
        console.log(`✅ Tunnel healthy: ${duration}ms`)
        this.resetReconnectCounter()
      }
      
    } catch (error) {
      console.log(`❌ Tunnel health check error: ${error.message}`)
      this.handleConnectionIssue()
    }
  }
  
  // 接続問題の処理
  private handleConnectionIssue() {
    if (this.isReconnecting) {
      console.log('🔄 Already attempting reconnection...')
      return
    }
    
    console.log('🚨 Tunnel connection issue detected')
    this.attemptReconnection()
  }
  
  // 遅い接続の処理
  private handleSlowConnection() {
    console.log('🐌 Slow tunnel connection detected')
    // 遅い接続の場合は警告のみ、再接続は行わない
    this.showSlowConnectionAdvice()
  }
  
  // 再接続の試行
  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached')
      this.showManualRestartAdvice()
      return
    }
    
    this.isReconnecting = true
    this.reconnectAttempts++
    
    console.log(`🔄 Attempting tunnel reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)
    
    try {
      // 指数バックオフで待機
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`⏳ Waiting ${delay}ms before reconnection...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // 接続テスト
      const testResult = await this.testConnection()
      
      if (testResult) {
        console.log('✅ Tunnel reconnection successful!')
        this.resetReconnectCounter()
        this.showReconnectionSuccess()
      } else {
        console.log('❌ Tunnel reconnection failed')
        setTimeout(() => this.attemptReconnection(), 1000)
      }
      
    } catch (error) {
      console.log(`❌ Reconnection error: ${error.message}`)
      setTimeout(() => this.attemptReconnection(), 1000)
    } finally {
      this.isReconnecting = false
    }
  }
  
  // 接続テスト
  private async testConnection(): Promise<boolean> {
    try {
      const start = Date.now()
      
      // 軽量なAPIコールでテスト
      const response = await fetch('https://httpbin.org/get', {
        method: 'HEAD',
        timeout: 5000
      })
      
      const duration = Date.now() - start
      console.log(`🧪 Connection test: ${response.status} in ${duration}ms`)
      
      return response.ok && duration < 8000
      
    } catch (error) {
      console.log(`❌ Connection test failed: ${error.message}`)
      return false
    }
  }
  
  // 再接続カウンターリセット
  private resetReconnectCounter() {
    this.reconnectAttempts = 0
    this.lastConnectionTime = Date.now()
  }
  
  // 遅い接続時のアドバイス
  private showSlowConnectionAdvice() {
    console.group('🐌 Slow Tunnel Connection Advice')
    console.log('1. Check your internet connection stability')
    console.log('2. Try moving closer to your WiFi router')
    console.log('3. Consider switching to a different network')
    console.log('4. Ngrok free tier has limited bandwidth')
    console.groupEnd()
  }
  
  // 手動再起動のアドバイス
  private showManualRestartAdvice() {
    console.group('🔧 Manual Restart Required')
    console.log('Tunnel connection could not be automatically restored.')
    console.log('Please restart the development server:')
    console.log('')
    console.log('1. Stop the current server (Ctrl+C)')
    console.log('2. Run: npm start')
    console.log('3. Or try: npx expo start --tunnel --clear')
    console.log('')
    console.log('Check Ngrok status: https://status.ngrok.com/')
    console.groupEnd()
  }
  
  // 再接続成功通知
  private showReconnectionSuccess() {
    console.group('✅ Tunnel Reconnection Successful')
    console.log('Connection has been restored automatically.')
    console.log('You can continue development without restarting.')
    console.log(`Reconnection took ${this.reconnectAttempts} attempts.`)
    console.groupEnd()
  }
  
  // 統計情報
  public getConnectionStats() {
    const uptime = Date.now() - this.lastConnectionTime
    return {
      uptime: Math.floor(uptime / 1000),
      reconnectAttempts: this.reconnectAttempts,
      isHealthy: this.reconnectAttempts === 0,
      lastConnectionTime: new Date(this.lastConnectionTime).toISOString()
    }
  }
  
  // クリーンアップ
  public destroy() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }
    console.log('🚇 Tunnel stability monitoring stopped')
  }
}

// グローバル Tunnel Stability Manager
let tunnelManager: TunnelStabilityManager | null = null

// 開発環境でのみ起動
if (__DEV__) {
  // 少し遅延させてから開始（他の初期化完了を待つ）
  setTimeout(() => {
    tunnelManager = new TunnelStabilityManager()
    
    // デバッグ用グローバル関数
    global.getTunnelStats = () => tunnelManager?.getConnectionStats()
    
    console.log('🎉 Tunnel stability system initialized!')
    console.log('💡 Type "getTunnelStats()" in console for connection info')
    
  }, 5000)
}

// アプリ終了時のクリーンアップ
if (typeof global !== 'undefined') {
  const originalExit = process?.exit
  if (originalExit) {
    process.exit = (code?: number) => {
      tunnelManager?.destroy()
      return originalExit(code)
    }
  }
}

export default TunnelStabilityManager