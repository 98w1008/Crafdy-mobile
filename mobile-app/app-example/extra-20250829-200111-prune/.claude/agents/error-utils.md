# Error Diagnostic Utilities

## Quick Error Analysis Commands

### 🔍 **環境診断コマンド**
```typescript
// 環境変数チェック
const checkEnvironment = () => {
  console.group('🔧 Environment Check')
  
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLIC_KEY'
  ]
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    console.log(`${varName}: ${value ? '✅ SET' : '❌ NOT SET'}`)
    if (value) {
      console.log(`  Length: ${value.length}`)
      console.log(`  Preview: ${value.substring(0, 20)}...`)
    }
  })
  
  console.groupEnd()
}
```

### 🌐 **ネットワーク診断コマンド**
```typescript
const diagnoseNetwork = async () => {
  console.group('🌐 Network Diagnostic')
  
  const endpoints = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Supabase Health', url: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/` },
    { name: 'Supabase Auth', url: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/` }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now()
      const response = await fetch(endpoint.url, { method: 'HEAD' })
      const duration = Date.now() - start
      
      console.log(`✅ ${endpoint.name}: ${response.status} (${duration}ms)`)
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`)
    }
  }
  
  console.groupEnd()
}
```

### 📱 **デバイス情報診断**
```typescript
const getDeviceInfo = () => {
  console.group('📱 Device Information')
  
  console.log('Platform:', Platform.OS)
  console.log('Version:', Platform.Version)
  console.log('App State:', AppState.currentState)
  console.log('Network State:', NetInfo.fetch())
  
  if (Platform.OS === 'ios') {
    console.log('iOS Version:', Platform.constants.systemVersion)
  }
  
  console.groupEnd()
}
```

## Error Pattern Matcher

### 🔍 **エラーパターン自動検出**
```typescript
const errorPatterns = {
  'Network request failed': {
    category: 'network',
    commonCauses: [
      'No internet connection',
      'Server unavailable',
      'Invalid URL',
      'CORS issues',
      'Authentication failure'
    ],
    diagnosticSteps: [
      'Check internet connectivity',
      'Verify server status',
      'Check environment variables',
      'Test with curl/Postman',
      'Review CORS settings'
    ]
  },
  
  'Unable to resolve module': {
    category: 'bundler',
    commonCauses: [
      'Missing package installation',
      'Incorrect import path',
      'Metro cache issues',
      'TypeScript path mapping'
    ],
    diagnosticSteps: [
      'npm install',
      'Check import syntax',
      'Clear Metro cache',
      'Verify tsconfig.json'
    ]
  },
  
  'Element type is invalid': {
    category: 'react',
    commonCauses: [
      'Incorrect component import',
      'Default vs named export',
      'Component not exported'
    ],
    diagnosticSteps: [
      'Check import/export syntax',
      'Verify component definition',
      'Use React DevTools'
    ]
  }
}

const matchErrorPattern = (errorMessage: string) => {
  for (const [pattern, info] of Object.entries(errorPatterns)) {
    if (errorMessage.includes(pattern)) {
      return info
    }
  }
  return null
}
```

## Real-time Error Monitor

### 📊 **リアルタイムエラー監視**
```typescript
class ErrorMonitor {
  private errors: ErrorLog[] = []
  private listeners: ((error: ErrorLog) => void)[] = []
  
  logError(error: Error, context: any) {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      pattern: matchErrorPattern(error.message)
    }
    
    this.errors.push(errorLog)
    this.notifyListeners(errorLog)
    
    // Auto-suggest solutions
    if (errorLog.pattern) {
      console.group(`🔍 Error Pattern Detected: ${errorLog.pattern.category}`)
      console.log('Common Causes:', errorLog.pattern.commonCauses)
      console.log('Diagnostic Steps:', errorLog.pattern.diagnosticSteps)
      console.groupEnd()
    }
  }
  
  private notifyListeners(error: ErrorLog) {
    this.listeners.forEach(listener => listener(error))
  }
  
  getErrorSummary() {
    const summary = this.errors.reduce((acc, error) => {
      const key = error.error.name
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return Object.entries(summary)
      .sort(([,a], [,b]) => b - a)
      .map(([name, count]) => ({ name, count }))
  }
}

export const errorMonitor = new ErrorMonitor()
```

## Interactive Debugging Console

### 🛠️ **インタラクティブデバッグコンソール**
```typescript
// Development mode only
if (__DEV__) {
  global.debug = {
    // Environment
    env: checkEnvironment,
    
    // Network
    network: diagnoseNetwork,
    testSupabase: async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1)
        console.log('Supabase test:', error ? `❌ ${error.message}` : '✅ Success')
      } catch (e) {
        console.log('Supabase test:', `❌ ${e.message}`)
      }
    },
    
    // Auth
    auth: {
      getSession: async () => {
        const { data, error } = await supabase.auth.getSession()
        console.log('Current session:', data.session ? '✅ Active' : '❌ None')
        if (error) console.log('Session error:', error.message)
      },
      
      getUser: async () => {
        const { data, error } = await supabase.auth.getUser()
        console.log('Current user:', data.user ? `✅ ${data.user.email}` : '❌ None')
        if (error) console.log('User error:', error.message)
      }
    },
    
    // Error analysis
    errors: {
      list: () => errorMonitor.getErrorSummary(),
      clear: () => {
        errorMonitor.errors = []
        console.log('✅ Error log cleared')
      },
      analyze: (errorMessage: string) => {
        const pattern = matchErrorPattern(errorMessage)
        if (pattern) {
          console.group(`🔍 Error Analysis: ${errorMessage}`)
          console.log('Category:', pattern.category)
          console.log('Common Causes:', pattern.commonCauses)
          console.log('Diagnostic Steps:', pattern.diagnosticSteps)
          console.groupEnd()
        } else {
          console.log('❓ No pattern match found for:', errorMessage)
        }
      }
    },
    
    // App state
    app: {
      info: getDeviceInfo,
      routes: () => {
        // Get current navigation state
        console.log('Current route information...')
      }
    }
  }
  
  console.log('🛠️ Debug utilities loaded. Type `debug` to see available commands.')
}
```

## Error Recovery Strategies

### 🔄 **自動エラー回復**
```typescript
class ErrorRecovery {
  static async attemptRecovery(error: Error, context: any) {
    const pattern = matchErrorPattern(error.message)
    
    if (!pattern) return false
    
    switch (pattern.category) {
      case 'network':
        return await this.recoverNetwork(error)
      
      case 'auth':
        return await this.recoverAuth(error)
      
      case 'bundler':
        return await this.recoverBundler(error)
      
      default:
        return false
    }
  }
  
  private static async recoverNetwork(error: Error) {
    // Retry with exponential backoff
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      
      try {
        // Retry the failed operation
        return true
      } catch (retryError) {
        console.log(`Retry ${i + 1} failed:`, retryError.message)
      }
    }
    
    return false
  }
  
  private static async recoverAuth(error: Error) {
    try {
      // Attempt to refresh session
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!refreshError && data.session) {
        console.log('✅ Session refreshed successfully')
        return true
      }
    } catch (e) {
      console.log('❌ Session refresh failed:', e.message)
    }
    
    return false
  }
  
  private static async recoverBundler(error: Error) {
    console.log('🔄 Bundle error detected. Suggesting cache clear...')
    console.log('Run: npx expo start --clear')
    return false // Manual intervention required
  }
}
```

これらのユーティリティを使用することで、Error Diagnostic Agentはより効率的にエラーを診断し、解決策を提供できます。