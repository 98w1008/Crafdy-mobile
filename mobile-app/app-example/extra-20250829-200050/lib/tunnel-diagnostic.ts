// Tunnel接続用診断ツール - Error Diagnostic Agent
import Constants from 'expo-constants'

export class TunnelDiagnostic {
  static getTunnelInfo() {
    const manifest = Constants.expoConfig
    const debuggerHost = Constants.debuggerHost
    
    console.group('🔍 Tunnel Connection Analysis')
    console.log('Debugger Host:', debuggerHost)
    console.log('Is using tunnel:', debuggerHost?.includes('ngrok') || debuggerHost?.includes('tunnel'))
    console.log('Expo Config Name:', manifest?.name)
    console.log('Development Type:', __DEV__ ? 'Development' : 'Production')
    console.groupEnd()
    
    return {
      isTunnel: debuggerHost?.includes('ngrok') || debuggerHost?.includes('tunnel'),
      debuggerHost,
      isLocal: debuggerHost?.includes('localhost') || debuggerHost?.includes('127.0.0.1')
    }
  }
  
  static async testNetworkWithTunnel() {
    const tunnelInfo = this.getTunnelInfo()
    
    console.group('🌐 Network Test with Tunnel Configuration')
    
    // Test 1: Direct HTTPS connection
    console.log('Test 1: Direct HTTPS Connection')
    try {
      const directTest = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })
      console.log(`   Direct HTTPS: ✅ ${directTest.status}`)
    } catch (error) {
      console.log(`   Direct HTTPS: ❌ ${error.message}`)
    }
    
    // Test 2: Supabase direct connection
    console.log('Test 2: Supabase Direct Connection')
    try {
      const supabaseTest = await fetch('https://aerscsgzulqfsecltyjz.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I',
          'Cache-Control': 'no-cache'
        }
      })
      console.log(`   Supabase Direct: ✅ ${supabaseTest.status}`)
    } catch (error) {
      console.log(`   Supabase Direct: ❌ ${error.message}`)
    }
    
    // Test 3: XML HTTP Request (tunnel問題の検出)
    console.log('Test 3: XMLHttpRequest Test (Tunnel Issue Detection)')
    try {
      const xhr = new XMLHttpRequest()
      const xhrPromise = new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.status)
        xhr.onerror = () => reject(new Error('XMLHttpRequest failed'))
        xhr.timeout = 10000
        xhr.ontimeout = () => reject(new Error('XMLHttpRequest timeout'))
      })
      
      xhr.open('HEAD', 'https://httpbin.org/get')
      xhr.send()
      
      const xhrStatus = await xhrPromise
      console.log(`   XMLHttpRequest: ✅ ${xhrStatus}`)
    } catch (error) {
      console.log(`   XMLHttpRequest: ❌ ${error.message}`)
      console.log('   This indicates a tunnel/polyfill issue!')
    }
    
    console.groupEnd()
    
    // 推奨事項の提示
    if (tunnelInfo.isTunnel) {
      console.group('💡 Tunnel Mode Recommendations')
      console.log('1. Try running without --tunnel:')
      console.log('   npx expo start --clear')
      console.log('2. If on physical device, ensure same WiFi network')
      console.log('3. Check firewall settings on development machine')
      console.log('4. Consider using --lan instead of --tunnel')
      console.groupEnd()
    }
  }
  
  static async fixTunnelNetworkIssues() {
    console.log('🔧 Applying tunnel-specific network fixes...')
    
    // XMLHttpRequest polyfill の強制適用
    if (typeof global.XMLHttpRequest === 'undefined') {
      console.log('   Installing XMLHttpRequest polyfill...')
      global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest
    }
    
    // Fetch timeout の設定
    const originalFetch = global.fetch
    global.fetch = async (url: string, options: any = {}) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15秒タイムアウト
      
      try {
        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...options.headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        clearTimeout(timeoutId)
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        console.log(`🚨 Fetch failed for ${url}:`, error.message)
        throw error
      }
    }
    
    console.log('✅ Tunnel-specific network fixes applied')
  }
}

// 開発環境でのみ自動実行
if (__DEV__) {
  setTimeout(() => {
    TunnelDiagnostic.getTunnelInfo()
    TunnelDiagnostic.testNetworkWithTunnel()
    TunnelDiagnostic.fixTunnelNetworkIssues()
  }, 3000)
}