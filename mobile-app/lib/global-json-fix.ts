/**
 * グローバルなJSON処理の強化
 * React Nativeの起動時に一度だけ呼び出す
 */

import { sanitizeUnicodeForJSON, safeJSONStringify } from './unicode-utils'

let isPatched = false

export function patchGlobalJSON() {
  if (isPatched) return
  
  console.log('🔧 Patching global JSON methods for Unicode safety...')
  
  // 元のJSON.stringifyを保存
  const originalStringify = JSON.stringify
  
  // JSON.stringifyをパッチ
  JSON.stringify = function(value: any, replacer?: any, space?: any): string {
    try {
      // まず安全な処理を試行
      if (typeof value === 'string') {
        value = sanitizeUnicodeForJSON(value)
      } else if (value && typeof value === 'object') {
        value = deepSanitizeObject(value)
      }
      
      return originalStringify.call(this, value, replacer, space)
    } catch (error) {
      console.warn('JSON.stringify failed, using safe fallback:', error)
      return safeJSONStringify(value, space)
    }
  }
  
  // fetchのパッチ（リクエストボディのUnicode処理）
  const originalFetch = global.fetch
  global.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (init?.body && typeof init.body === 'string') {
      try {
        // JSONかどうかチェック
        const parsed = JSON.parse(init.body)
        init.body = safeJSONStringify(parsed)
      } catch {
        // JSONでない場合は文字列として処理
        init.body = sanitizeUnicodeForJSON(init.body)
      }
    }
    
    return originalFetch.call(this, input, init)
  }
  
  isPatched = true
  console.log('✅ Global JSON methods patched successfully')
}

function deepSanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeUnicodeForJSON(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepSanitizeObject)
  }
  
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const safeKey = sanitizeUnicodeForJSON(key)
      result[safeKey] = deepSanitizeObject(value)
    }
    return result
  }
  
  return obj
}

// デバッグ用：問題のある文字を検出
export function detectProblematicChars(text: string): string[] {
  const problems: string[] = []
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const code = char.charCodeAt(0)
    
    // サロゲートペアの検出
    if (code >= 0xD800 && code <= 0xDBFF) {
      if (i + 1 >= text.length) {
        problems.push(`Incomplete high surrogate at position ${i}: ${code.toString(16)}`)
      } else {
        const nextCode = text.charCodeAt(i + 1)
        if (nextCode < 0xDC00 || nextCode > 0xDFFF) {
          problems.push(`Invalid surrogate pair at position ${i}: ${code.toString(16)} ${nextCode.toString(16)}`)
        } else {
          i++ // 正常なサロゲートペアの場合は次の文字をスキップ
        }
      }
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      problems.push(`Unexpected low surrogate at position ${i}: ${code.toString(16)}`)
    }
  }
  
  return problems
}