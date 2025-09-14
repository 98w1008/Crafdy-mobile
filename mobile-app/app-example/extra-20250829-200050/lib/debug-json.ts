/**
 * JSON エラーデバッグユーティリティ
 */

import { detectProblematicChars } from './global-json-fix'

export function debugJSONError(data: any, context: string = '') {
  console.group(`🔍 JSON Debug Analysis${context ? ` - ${context}` : ''}`)
  
  try {
    const jsonString = JSON.stringify(data)
    console.log('✅ JSON.stringify succeeded')
    console.log('📊 Data size:', jsonString.length, 'characters')
    
    // 文字103133周辺をチェック
    if (jsonString.length > 103130) {
      const start = Math.max(0, 103130 - 50)
      const end = Math.min(jsonString.length, 103130 + 50)
      const excerpt = jsonString.substring(start, end)
      console.log('🎯 Content around position 103133:', excerpt)
      
      const problems = detectProblematicChars(excerpt)
      if (problems.length > 0) {
        console.warn('⚠️ Problematic characters found:', problems)
      }
    }
    
  } catch (error) {
    console.error('❌ JSON.stringify failed:', error)
    
    // 詳細分析
    if (typeof data === 'object' && data !== null) {
      analyzeObjectProperties(data)
    } else if (typeof data === 'string') {
      analyzeString(data)
    }
  }
  
  console.groupEnd()
}

function analyzeObjectProperties(obj: any, path: string = '') {
  console.log('🔍 Analyzing object properties...')
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key
    
    try {
      JSON.stringify(value)
    } catch (error) {
      console.error(`❌ Property "${currentPath}" caused JSON error:`, error)
      
      if (typeof value === 'string') {
        analyzeString(value, currentPath)
      } else if (typeof value === 'object' && value !== null) {
        analyzeObjectProperties(value, currentPath)
      }
    }
  }
}

function analyzeString(str: string, path: string = '') {
  console.log(`🔍 Analyzing string${path ? ` at ${path}` : ''}...`)
  console.log('📏 Length:', str.length)
  
  const problems = detectProblematicChars(str)
  if (problems.length > 0) {
    console.warn('⚠️ Unicode problems:', problems)
  }
  
  // 絵文字や特殊文字をカウント
  const emojiCount = (str.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length
  if (emojiCount > 0) {
    console.log('😀 Emoji count:', emojiCount)
  }
  
  // サロゲートペアをカウント
  const surrogateCount = (str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length
  if (surrogateCount > 0) {
    console.log('🔗 Surrogate pairs:', surrogateCount)
  }
  
  // 最初の100文字をプレビュー
  if (str.length > 100) {
    console.log('👀 Preview:', str.substring(0, 100) + '...')
  } else {
    console.log('👀 Content:', str)
  }
}

// コンソールで使用するためのグローバル関数
if (__DEV__) {
  (global as any).debugJSON = debugJSONError
}