// Supabase Agent による包括的ネットワーク診断ツール
import 'react-native-get-random-values'
import 'react-native-url-polyfill/auto'

export class NetworkDiagnostic {
  static async runComprehensiveTest() {
    console.group('🌐 Supabase Agent - Comprehensive Network Test')
    
    // Test 1: Basic fetch availability
    console.log('Test 1: Fetch function availability')
    console.log('  global.fetch exists:', typeof global.fetch !== 'undefined')
    console.log('  fetch type:', typeof fetch)
    
    // Test 2: Simple connectivity test
    console.log('\nTest 2: Basic connectivity')
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 5000
      })
      console.log('  httpbin.org status:', response.status)
    } catch (error) {
      console.log('  httpbin.org error:', error.message)
    }
    
    // Test 3: Supabase domain test
    console.log('\nTest 3: Supabase domain connectivity')
    try {
      const response = await fetch('https://supabase.com', {
        method: 'HEAD',
        timeout: 5000
      })
      console.log('  supabase.com status:', response.status)
    } catch (error) {
      console.log('  supabase.com error:', error.message)
    }
    
    // Test 4: Specific Supabase project test
    const supabaseUrl = 'https://aerscsgzulqfsecltyjz.supabase.co'
    console.log('\nTest 4: Project-specific Supabase test')
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlcnNjc2d6dWxxZnNlY2x0eWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDk1NjQsImV4cCI6MjA2NjA4NTU2NH0.uNl3O7WzSQm-ud2OIjs7SV6jrqVdDSmeG6cvFoKA94I'
        },
        timeout: 5000
      })
      console.log('  Project REST API status:', response.status)
    } catch (error) {
      console.log('  Project REST API error:', error.message)
    }
    
    // Test 5: Environment variables test
    console.log('\nTest 5: Environment variables')
    console.log('  EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'NOT SET')
    console.log('  EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
    
    console.groupEnd()
  }
  
  static async testWithRetry(url: string, maxRetries: number = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Retry ${i + 1}/${maxRetries} for ${url}`)
        const response = await fetch(url, {
          method: 'HEAD',
          timeout: 10000
        })
        console.log(`✅ Success on retry ${i + 1}: ${response.status}`)
        return response
      } catch (error) {
        console.log(`❌ Retry ${i + 1} failed: ${error.message}`)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
        }
      }
    }
    throw new Error(`All ${maxRetries} retries failed`)
  }
}

// 開発環境で自動実行
if (__DEV__) {
  setTimeout(() => {
    NetworkDiagnostic.runComprehensiveTest()
  }, 1000)
}