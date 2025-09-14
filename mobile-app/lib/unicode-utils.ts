/**
 * Unicode文字の安全な処理ユーティリティ
 */

/**
 * Unicode文字列を安全にJSONシリアライズ可能な形式に変換
 */
export function sanitizeUnicodeForJSON(text: string): string {
  if (!text) return text
  
  try {
    // サロゲートペアを含む文字を安全に処理
    return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, (match) => {
      // サロゲートペアを16進数エスケープに変換
      const codePoint = match.codePointAt(0)
      return codePoint ? `\\u{${codePoint.toString(16)}}` : match
    }).replace(/[\uD800-\uDFFF]/g, (match) => {
      // 不完全なサロゲートを除去
      console.warn('Incomplete surrogate found and removed:', match.charCodeAt(0).toString(16))
      return ''
    })
  } catch (error) {
    console.error('Unicode sanitization error:', error)
    // フォールバック: ASCII以外の文字を除去
    return text.replace(/[^\x00-\x7F]/g, '')
  }
}

/**
 * 文字列の長さを制限し、Unicode境界で安全に切り詰める
 */
export function safeTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text
  
  try {
    // Unicode境界を考慮して切り詰め
    const truncated = text.substring(0, maxLength)
    
    // 最後の文字がサロゲートペアの前半の場合は除去
    if (truncated.length > 0) {
      const lastChar = truncated.charCodeAt(truncated.length - 1)
      if (lastChar >= 0xD800 && lastChar <= 0xDBFF) {
        return truncated.substring(0, truncated.length - 1)
      }
    }
    
    return truncated
  } catch (error) {
    console.error('Safe truncate error:', error)
    return text.substring(0, Math.min(maxLength, text.length))
  }
}

/**
 * JSONシリアライズ前の安全な前処理
 */
export function prepareForJSON(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeUnicodeForJSON(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(prepareForJSON)
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[sanitizeUnicodeForJSON(key)] = prepareForJSON(value)
    }
    return result
  }
  
  return obj
}

/**
 * 安全なJSONシリアライズ
 */
export function safeJSONStringify(obj: any, space?: string | number): string {
  try {
    const sanitized = prepareForJSON(obj)
    return JSON.stringify(sanitized, null, space)
  } catch (error) {
    console.error('JSON stringify error:', error)
    
    // フォールバック: 基本的な文字列化
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'string') {
          return sanitizeUnicodeForJSON(value)
        }
        return value
      }, space)
    } catch (fallbackError) {
      console.error('Fallback JSON stringify also failed:', fallbackError)
      return '{}'
    }
  }
}

/**
 * 安全なJSONパース
 */
export function safeJSONParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('JSON parse error:', error)
    return null
  }
}