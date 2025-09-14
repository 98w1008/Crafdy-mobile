// Tunnel環境専用ネットワーク最適化 - Error Diagnostic Agent
import Constants from 'expo-constants'

// グローバルfetchをTunnel環境用に最適化
export function applyTunnelNetworkFixes() {
  console.log('🚇 Applying tunnel-specific network optimizations...')
  
  // 元のfetchを保存
  const originalFetch = global.fetch
  
  // Tunnel環境専用のfetch実装
  global.fetch = async (url: string | Request, init?: RequestInit) => {
    const startTime = Date.now()
    
    // リクエスト情報をログ
    const urlStr = typeof url === 'string' ? url : url.url
    console.log(`🚇 Tunnel Request: ${init?.method || 'GET'} ${urlStr}`)
    
    // Tunnel環境用の最適化オプション
    const tunnelOptimizedInit: RequestInit = {
      ...init,
      headers: {
        'User-Agent': 'Crafdy-Mobile-Tunnel/1.0 (Expo)',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'X-Tunnel-Client': 'expo-development',
        'X-Requested-With': 'XMLHttpRequest',
        // 既存のヘッダーを最後に適用（APIキーなど重要なヘッダーを上書きしないように）
        ...init?.headers,
      },
      // Tunnel環境では非常に長いタイムアウトが必要
      // @ts-ignore - React Nativeのfetchは独自のtimeout実装
      timeout: 90000,
      // Keep-aliveを有効にしてTCP接続を再利用
      keepalive: true,
    }
    
    // 最大5回まで指数バックオフでリトライ
    const maxRetries = 5
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   🔄 Attempt ${attempt}/${maxRetries}`)
        
        const response = await originalFetch(url, tunnelOptimizedInit)
        const duration = Date.now() - startTime
        
        console.log(`   ✅ Success: ${response.status} in ${duration}ms`)
        
        // レスポンスをログ（開発環境のみ）
        if (__DEV__ && !response.ok) {
          console.log(`   ⚠️ HTTP Error: ${response.status} ${response.statusText}`)
        }
        
        return response
        
      } catch (error) {
        lastError = error as Error
        const duration = Date.now() - startTime
        
        console.log(`   ❌ Attempt ${attempt} failed after ${duration}ms: ${error.message}`)
        
        // 特定のエラーパターンに対する対処
        if (error.message.includes('Network request failed')) {
          console.log(`   🔧 Network request failed - tunnel latency issue detected`)
        } else if (error.message.includes('timeout')) {
          console.log(`   ⏰ Timeout detected - extending wait time`)
        }
        
        // 最後の試行でない場合はリトライ
        if (attempt < maxRetries) {
          // 指数バックオフ + ジッター
          const baseDelay = Math.pow(2, attempt) * 1000
          const jitter = Math.random() * 1000
          const delay = baseDelay + jitter
          
          console.log(`   ⏳ Retrying in ${Math.round(delay)}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // 全ての試行が失敗した場合
    const totalDuration = Date.now() - startTime
    console.log(`💥 All ${maxRetries} attempts failed for ${urlStr} after ${totalDuration}ms`)
    
    if (lastError) {
      // エラーメッセージを強化
      const enhancedError = new Error(
        `Tunnel network error after ${maxRetries} attempts: ${lastError.message}`
      )
      enhancedError.name = 'TunnelNetworkError'
      throw enhancedError
    }
    
    throw new Error('Unknown tunnel network error')
  }
  
  console.log('✅ Tunnel-optimized fetch installed')
}

// XMLHttpRequestもTunnel環境用に最適化
export function optimizeXMLHttpRequestForTunnel() {
  console.log('🚇 Optimizing XMLHttpRequest for tunnel...')
  
  const OriginalXHR = global.XMLHttpRequest
  
  class TunnelOptimizedXHR extends OriginalXHR {
    constructor() {
      super()
      
      // Tunnel環境用のデフォルト設定
      this.timeout = 90000 // 90秒タイムアウト
      
      // エラーハンドリングの強化
      this.addEventListener('error', (event) => {
        console.log('🚇 XHR Error in tunnel environment:', event)
      })
      
      this.addEventListener('timeout', (event) => {
        console.log('🚇 XHR Timeout in tunnel environment:', event)
      })
      
      this.addEventListener('loadstart', () => {
        console.log('🚇 XHR Request started via tunnel')
      })
      
      this.addEventListener('loadend', () => {
        console.log('🚇 XHR Request completed via tunnel')
      })
    }
    
    open(method: string, url: string, async?: boolean, user?: string, password?: string) {
      console.log(`🚇 XHR Open: ${method} ${url}`)
      return super.open(method, url, async, user, password)
    }
    
    setRequestHeader(name: string, value: string) {
      // Tunnel環境用のヘッダーを自動追加
      if (name.toLowerCase() === 'user-agent') {
        value = 'Crafdy-Mobile-Tunnel/1.0 (XHR)'
      }
      return super.setRequestHeader(name, value)
    }
    
    send(body?: Document | BodyInit | null) {
      // Tunnel環境用のヘッダーを追加
      this.setRequestHeader('X-Tunnel-Client', 'expo-xhr')
      this.setRequestHeader('X-Tunnel-Optimized', 'true')
      
      return super.send(body)
    }
  }
  
  global.XMLHttpRequest = TunnelOptimizedXHR as any
  console.log('✅ Tunnel-optimized XMLHttpRequest installed')
}

// Tunnel環境の詳細診断
export async function diagnoseTunnelEnvironment() {
  console.group('🚇 Tunnel Environment Diagnosis')
  
  try {
    // Expo Constants から tunnel 情報を取得
    const debuggerHost = Constants.debuggerHost
    const isTunnel = debuggerHost?.includes('ngrok') || 
                     debuggerHost?.includes('.tunnel.') ||
                     debuggerHost?.includes('.expo.io') ||
                     debuggerHost?.includes('.exp.direct')
    
    console.log('Debugger Host:', debuggerHost)
    console.log('Is Tunnel Mode:', isTunnel)
    console.log('Platform:', Constants.platform)
    console.log('Expo Version:', Constants.expoVersion)
    
    if (isTunnel) {
      console.log('🚇 Tunnel detected - applying optimizations...')
      
      // Tunnel接続テスト
      console.log('Testing tunnel connectivity...')
      
      const testUrls = [
        'https://httpbin.org/get',
        'https://api.github.com',
        'https://jsonplaceholder.typicode.com/posts/1'
      ]
      
      for (const testUrl of testUrls) {
        try {
          const start = Date.now()
          const response = await fetch(testUrl, { 
            method: 'HEAD',
            headers: {
              'X-Test': 'tunnel-connectivity'
            }
          })
          const duration = Date.now() - start
          console.log(`   ${testUrl}: ✅ ${response.status} (${duration}ms)`)
        } catch (error) {
          console.log(`   ${testUrl}: ❌ ${error.message}`)
        }
      }
    } else {
      console.log('📱 Local development mode detected')
    }
    
  } catch (error) {
    console.log('❌ Tunnel diagnosis failed:', error.message)
  }
  
  console.groupEnd()
}

// 開発環境での自動実行
if (__DEV__) {
  // アプリ起動時に自動で最適化を適用
  setTimeout(async () => {
    await diagnoseTunnelEnvironment()
    applyTunnelNetworkFixes()
    optimizeXMLHttpRequestForTunnel()
    
    console.log('🎉 Tunnel network optimizations applied successfully!')
  }, 500)
}

export default {
  applyTunnelNetworkFixes,
  optimizeXMLHttpRequestForTunnel,
  diagnoseTunnelEnvironment
}