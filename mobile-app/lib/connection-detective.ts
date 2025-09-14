// 接続環境診断ツール - Error Diagnostic Agent
import Constants from 'expo-constants'
import * as Network from 'expo-network'

export class ConnectionDetective {
  static async fullNetworkDiagnosis() {
    console.group('🔍 Complete Network Environment Diagnosis')
    
    // 1. デバイス情報
    console.log('📱 Device Information:')
    console.log('   Platform:', Constants.platform)
    console.log('   Expo Version:', Constants.expoVersion)
    console.log('   Is Device:', Constants.isDevice)
    console.log('   Debugger Host:', Constants.debuggerHost)
    
    // 2. ネットワーク状態
    try {
      const networkState = await Network.getNetworkStateAsync()
      console.log('🌐 Network State:')
      console.log('   Type:', networkState.type)
      console.log('   Is Connected:', networkState.isConnected)
      console.log('   Is Internet Reachable:', networkState.isInternetReachable)
    } catch (error) {
      console.log('⚠️ Network state check failed:', error.message)
    }
    
    // 3. 接続タイプ判定
    const isTunnel = Constants.debuggerHost?.includes('ngrok') || 
                     Constants.debuggerHost?.includes('tunnel') ||
                     Constants.debuggerHost?.includes('.expo.io')
    
    const isLocal = Constants.debuggerHost?.includes('localhost') || 
                    Constants.debuggerHost?.includes('127.0.0.1') ||
                    Constants.debuggerHost?.includes('192.168.')
    
    console.log('🔗 Connection Type:')
    console.log('   Using Tunnel:', isTunnel)
    console.log('   Using Local:', isLocal)
    console.log('   Connection Method:', isTunnel ? 'TUNNEL' : isLocal ? 'LOCAL' : 'UNKNOWN')
    
    console.groupEnd()
    
    return {
      isTunnel,
      isLocal,
      debuggerHost: Constants.debuggerHost,
      isDevice: Constants.isDevice,
      platform: Constants.platform
    }
  }
  
  static async testBasicConnectivity() {
    console.group('🌐 Basic Connectivity Test')
    
    const tests = [
      { name: 'Google DNS', url: 'https://8.8.8.8' },
      { name: 'Cloudflare', url: 'https://1.1.1.1' },
      { name: 'HTTPBin', url: 'https://httpbin.org/get' },
      { name: 'Supabase Main', url: 'https://supabase.com' }
    ]
    
    for (const test of tests) {
      try {
        const start = Date.now()
        const response = await fetch(test.url, {
          method: 'HEAD',
          timeout: 10000
        })
        const duration = Date.now() - start
        console.log(`   ${test.name}: ✅ ${response.status} (${duration}ms)`)
      } catch (error) {
        console.log(`   ${test.name}: ❌ ${error.message}`)
      }
    }
    
    console.groupEnd()
  }
  
  static createTunnelOptimizedFetch() {
    console.log('🔧 Installing tunnel-optimized fetch...')
    
    const originalFetch = global.fetch
    
    global.fetch = async (url: string, options: any = {}) => {
      // Tunnel環境用の最適化オプション
      const optimizedOptions = {
        ...options,
        headers: {
          'User-Agent': 'ExpoApp/1.0',
          'Accept': 'application/json, text/plain, */*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...options.headers,
        },
        // タイムアウトを長めに設定
        timeout: 30000,
      }
      
      console.log(`🔗 Tunnel-optimized fetch: ${url}`)
      
      try {
        const response = await originalFetch(url, optimizedOptions)
        console.log(`✅ Fetch success: ${url} -> ${response.status}`)
        return response
      } catch (error) {
        console.log(`❌ Fetch failed: ${url} -> ${error.message}`)
        
        // リトライロジック（tunnel環境では重要）
        if (error.message.includes('Network request failed')) {
          console.log(`🔄 Retrying fetch for: ${url}`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          try {
            const retryResponse = await originalFetch(url, optimizedOptions)
            console.log(`✅ Retry success: ${url} -> ${retryResponse.status}`)
            return retryResponse
          } catch (retryError) {
            console.log(`❌ Retry failed: ${url} -> ${retryError.message}`)
            throw retryError
          }
        }
        
        throw error
      }
    }
    
    console.log('✅ Tunnel-optimized fetch installed')
  }
}

// 開発環境で自動実行
if (__DEV__) {
  setTimeout(async () => {
    await ConnectionDetective.fullNetworkDiagnosis()
    await ConnectionDetective.testBasicConnectivity()
    ConnectionDetective.createTunnelOptimizedFetch()
  }, 1000)
}