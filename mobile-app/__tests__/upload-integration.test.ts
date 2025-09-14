/**
 * アップロード機能統合テスト
 * 実装したドキュメント管理システムの基本的な動作確認
 */

import { 
  guessDocType, 
  classifyDocumentDetailed, 
  getDocTypeDisplayName,
  getDocTypeIcon,
  getDocTypeColor,
  getMimeTypeFromExtension,
  DocType
} from '../src/utils/classifyDoc'

describe('ドキュメント分類ユーティリティ', () => {
  describe('guessDocType', () => {
    test('レシートファイルを正しく分類する', () => {
      expect(guessDocType('レシート_20240127.jpg')).toBe('receipt')
      expect(guessDocType('receipt_001.pdf')).toBe('receipt')
      expect(guessDocType('領収書_ホームセンター.png')).toBe('receipt')
    })

    test('搬入・納品書ファイルを正しく分類する', () => {
      expect(guessDocType('搬入書_20240127.jpg')).toBe('delivery_slip')
      expect(guessDocType('delivery_slip_001.pdf')).toBe('delivery_slip')
      expect(guessDocType('納品書_建材商事.png')).toBe('delivery_slip')
    })

    test('図面ファイルを正しく分類する', () => {
      expect(guessDocType('平面図_A棟.dwg')).toBe('drawing')
      expect(guessDocType('設計図.pdf')).toBe('drawing')
      expect(guessDocType('blueprint_001.jpg')).toBe('drawing')
    })

    test('仕様書ファイルを正しく分類する', () => {
      expect(guessDocType('仕様書_ver1.pdf')).toBe('spec')
      expect(guessDocType('specification_001.docx')).toBe('spec')
      expect(guessDocType('要件定義.txt')).toBe('spec')
    })

    test('写真ファイルを正しく分類する', () => {
      expect(guessDocType('現場写真.jpg')).toBe('photo')
      expect(guessDocType('作業状況.png')).toBe('photo')
      expect(guessDocType('進捗状況.heic')).toBe('photo')
    })

    test('請求書ファイルを正しく分類する', () => {
      expect(guessDocType('請求書_202401.pdf')).toBe('invoice')
      expect(guessDocType('invoice_001.jpg')).toBe('invoice')
      expect(guessDocType('見積書.pdf')).toBe('invoice')
    })

    test('不明なファイルは unknown として分類する', () => {
      expect(guessDocType('不明なファイル.txt')).toBe('unknown')
      expect(guessDocType('random_file.zip')).toBe('unknown')
      expect(guessDocType('')).toBe('unknown')
    })
  })

  describe('classifyDocumentDetailed', () => {
    test('詳細分類で信頼度を返す', () => {
      const result = classifyDocumentDetailed('レシート_ホームセンター_20240127.jpg')
      
      expect(result.type).toBe('receipt')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.keywords).toContain('レシート')
      expect(result.keywords.length).toBeGreaterThan(0)
    })

    test('複数キーワードで信頼度が上がる', () => {
      const result1 = classifyDocumentDetailed('レシート.jpg')
      const result2 = classifyDocumentDetailed('レシート_receipt_領収書.jpg')
      
      expect(result2.confidence).toBeGreaterThan(result1.confidence)
    })
  })

  describe('表示用ヘルパー関数', () => {
    test('DocType の日本語表示名を取得', () => {
      expect(getDocTypeDisplayName('receipt')).toBe('レシート')
      expect(getDocTypeDisplayName('delivery_slip')).toBe('搬入・納品書')
      expect(getDocTypeDisplayName('drawing')).toBe('図面')
      expect(getDocTypeDisplayName('spec')).toBe('仕様書')
      expect(getDocTypeDisplayName('photo')).toBe('写真')
      expect(getDocTypeDisplayName('invoice')).toBe('請求書')
      expect(getDocTypeDisplayName('unknown')).toBe('不明')
    })

    test('DocType のアイコン名を取得', () => {
      expect(getDocTypeIcon('receipt')).toBe('receipt')
      expect(getDocTypeIcon('delivery_slip')).toBe('local-shipping')
      expect(getDocTypeIcon('photo')).toBe('photo')
      expect(typeof getDocTypeIcon('unknown')).toBe('string')
    })

    test('DocType のテーマカラーを取得', () => {
      expect(getDocTypeColor('receipt')).toMatch(/^#[0-9A-F]{6}$/i)
      expect(getDocTypeColor('delivery_slip')).toMatch(/^#[0-9A-F]{6}$/i)
      expect(getDocTypeColor('photo')).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })

  describe('MIMEタイプ取得', () => {
    test('画像ファイルのMIMEタイプ', () => {
      expect(getMimeTypeFromExtension('test.jpg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.jpeg')).toBe('image/jpeg')
      expect(getMimeTypeFromExtension('test.png')).toBe('image/png')
      expect(getMimeTypeFromExtension('test.heic')).toBe('image/heic')
    })

    test('PDFファイルのMIMEタイプ', () => {
      expect(getMimeTypeFromExtension('document.pdf')).toBe('application/pdf')
    })

    test('OfficeファイルのMIMEタイプ', () => {
      expect(getMimeTypeFromExtension('document.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(getMimeTypeFromExtension('spreadsheet.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    test('不明な拡張子はデフォルトMIMEタイプ', () => {
      expect(getMimeTypeFromExtension('unknown.xyz')).toBe('application/octet-stream')
      expect(getMimeTypeFromExtension('noextension')).toBe('application/octet-stream')
    })
  })
})

describe('ファイルアップロード統合シナリオ', () => {
  test('複数ファイルの分類と処理', () => {
    const files = [
      { name: 'レシート_20240127.jpg', size: 1024 },
      { name: '搬入書_建材.pdf', size: 2048 },
      { name: '現場写真001.png', size: 3072 },
      { name: '設計図_平面.dwg', size: 4096 },
      { name: '仕様書_v1.docx', size: 1536 }
    ]

    const classifications = files.map(file => ({
      ...file,
      classification: classifyDocumentDetailed(file.name),
      mimeType: getMimeTypeFromExtension(file.name)
    }))

    // すべてのファイルが適切に分類されていることを確認
    expect(classifications.every(c => c.classification.type !== 'unknown')).toBe(true)
    
    // ファイルタイプの分布を確認
    const typeDistribution = classifications.reduce((acc, file) => {
      acc[file.classification.type] = (acc[file.classification.type] || 0) + 1
      return acc
    }, {} as Record<DocType, number>)

    expect(typeDistribution['receipt']).toBe(1)
    expect(typeDistribution['delivery_slip']).toBe(1)
    expect(typeDistribution['photo']).toBe(1)
    expect(typeDistribution['drawing']).toBe(1)
    expect(typeDistribution['spec']).toBe(1)

    // MIMEタイプが正しく設定されていることを確認
    expect(classifications.every(c => c.mimeType.length > 0)).toBe(true)
  })

  test('見積ウィザードでの必須ファイルチェック', () => {
    const requiredTypes: DocType[] = ['drawing', 'spec']
    
    // 必須ファイルが不足している場合
    const incompleteFiles = [
      { docType: 'photo' as DocType, name: 'photo1.jpg' },
      { docType: 'receipt' as DocType, name: 'receipt1.jpg' }
    ]
    
    const presentTypes = [...new Set(incompleteFiles.map(f => f.docType))]
    const missingRequired = requiredTypes.filter(type => !presentTypes.includes(type))
    
    expect(missingRequired).toEqual(['drawing', 'spec'])
    expect(missingRequired.length > 0).toBe(true) // バリデーション失敗
    
    // 必須ファイルが揃っている場合
    const completeFiles = [
      { docType: 'drawing' as DocType, name: 'drawing1.dwg' },
      { docType: 'spec' as DocType, name: 'spec1.pdf' },
      { docType: 'photo' as DocType, name: 'photo1.jpg' }
    ]
    
    const completePresentTypes = [...new Set(completeFiles.map(f => f.docType))]
    const completeMissingRequired = requiredTypes.filter(type => !completePresentTypes.includes(type))
    
    expect(completeMissingRequired).toEqual([])
    expect(completeMissingRequired.length === 0).toBe(true) // バリデーション成功
  })

  test('日報添付ファイルのカテゴリ別分類', () => {
    const attachments = [
      { docType: 'photo' as DocType, name: '作業開始.jpg' },
      { docType: 'photo' as DocType, name: '作業完了.jpg' },
      { docType: 'receipt' as DocType, name: 'レシート_材料費.jpg' },
      { docType: 'delivery_slip' as DocType, name: '搬入書_20240127.pdf' }
    ]

    // カテゴリ別集計
    const summary = attachments.reduce((acc, file) => {
      acc[file.docType] = (acc[file.docType] || 0) + 1
      return acc
    }, {} as Record<DocType, number>)

    expect(summary['photo']).toBe(2)
    expect(summary['receipt']).toBe(1)
    expect(summary['delivery_slip']).toBe(1)

    // 表示用サマリー生成
    const displaySummary = Object.entries(summary)
      .map(([type, count]) => `${getDocTypeDisplayName(type as DocType)}: ${count}件`)
      .join(' / ')
    
    expect(displaySummary).toContain('写真: 2件')
    expect(displaySummary).toContain('レシート: 1件')
    expect(displaySummary).toContain('搬入・納品書: 1件')
  })
})

describe('エラーハンドリングとエッジケース', () => {
  test('空文字列や null の処理', () => {
    expect(guessDocType('')).toBe('unknown')
    expect(guessDocType('   ')).toBe('unknown')
    
    const emptyResult = classifyDocumentDetailed('')
    expect(emptyResult.type).toBe('unknown')
    expect(emptyResult.confidence).toBe(0)
    expect(emptyResult.keywords).toEqual([])
  })

  test('非常に長いファイル名の処理', () => {
    const longFileName = 'レシート_' + 'a'.repeat(1000) + '.jpg'
    expect(guessDocType(longFileName)).toBe('receipt')
  })

  test('特殊文字を含むファイル名の処理', () => {
    expect(guessDocType('レシート_@#$%^&*()_20240127.jpg')).toBe('receipt')
    expect(guessDocType('搬入書-№①②③.pdf')).toBe('delivery_slip')
  })

  test('大文字小文字の混在', () => {
    expect(guessDocType('RECEIPT_001.JPG')).toBe('receipt')
    expect(guessDocType('Drawing_Plan.DWG')).toBe('drawing')
    expect(guessDocType('Specification.PDF')).toBe('spec')
  })
})

// モックデータジェネレータ
export const generateMockUploadedFile = (overrides: Partial<any> = {}) => ({
  id: `mock_${Date.now()}_${Math.random()}`,
  name: 'テストファイル.jpg',
  uri: 'file:///test/path.jpg',
  type: 'image/jpeg',
  size: 1024,
  docType: 'photo' as DocType,
  confidence: 0.9,
  uploadProgress: 0,
  isUploading: false,
  ...overrides
})

export const generateMockFileSet = (count: number = 5) => {
  const types: DocType[] = ['photo', 'receipt', 'delivery_slip', 'drawing', 'spec']
  
  return Array.from({ length: count }, (_, index) => 
    generateMockUploadedFile({
      id: `mock_${index}`,
      name: `${getDocTypeDisplayName(types[index % types.length])}_${index + 1}.jpg`,
      docType: types[index % types.length]
    })
  )
}