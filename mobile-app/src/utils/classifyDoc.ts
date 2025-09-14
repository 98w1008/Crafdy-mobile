/**
 * ドキュメント分類ユーティリティ
 * ファイル名から文書タイプを自動判定します
 */

export type DocType = 
  | 'receipt'       // レシート
  | 'delivery_slip' // 搬入・納品書
  | 'contract'      // 契約書
  | 'drawing'       // 図面・CAD
  | 'spec'          // 仕様書
  | 'photo'         // 写真
  | 'invoice'       // 請求書
  | 'unknown';      // 不明

export interface DocClassification {
  type: DocType;
  confidence: number; // 0-1の信頼度
  keywords: string[]; // 判定に使用されたキーワード
}

/**
 * ファイル名からドキュメントタイプを推測
 */
export const guessDocType = (name: string): DocType => {
  const n = name.toLowerCase();
  
  // レシート関連
  if (n.includes('レシート') || n.includes('receipt') || n.includes('領収書')) {
    return 'receipt';
  }
  
  // 搬入・納品関連
  if (n.includes('搬入') || n.includes('納品') || n.includes('delivery') || n.includes('納期')) {
    return 'delivery_slip';
  }
  
  // 契約関連
  if (n.includes('契約') || n.includes('contract') || n.includes('合意')) {
    return 'contract';
  }
  
  // 図面・CAD関連
  if (n.includes('図') || n.includes('cad') || n.includes('drawing') || 
      n.includes('設計') || n.includes('dwg') || n.includes('blueprint')) {
    return 'drawing';
  }
  
  // 仕様書関連
  if (n.includes('仕様') || n.includes('spec') || n.includes('specification') || 
      n.includes('要件') || n.includes('requirement')) {
    return 'spec';
  }
  
  // 請求書関連
  if (n.includes('請求') || n.includes('invoice') || n.includes('bill')) {
    return 'invoice';
  }
  
  // 写真・画像関連（拡張子ベース）
  const photoExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.bmp'];
  if (photoExtensions.some(ext => n.endsWith(ext))) {
    return 'photo';
  }
  
  return 'unknown';
};

/**
 * より詳細な分類（信頼度付き）
 */
export const classifyDocumentDetailed = (name: string): DocClassification => {
  const n = name.toLowerCase();
  const foundKeywords: string[] = [];
  
  // キーワード辞書（重みつき）
  const keywords = {
    receipt: {
      words: ['レシート', 'receipt', '領収書', '領収', 'レシート'],
      weight: 1.0
    },
    delivery_slip: {
      words: ['搬入', '納品', 'delivery', '納期', '配送', '出荷'],
      weight: 0.9
    },
    contract: {
      words: ['契約', 'contract', '合意', '協定', '約款'],
      weight: 0.95
    },
    drawing: {
      words: ['図', 'cad', 'drawing', '設計', 'dwg', 'blueprint', '図面', '平面図'],
      weight: 0.85
    },
    spec: {
      words: ['仕様', 'spec', 'specification', '要件', 'requirement', '仕様書'],
      weight: 0.8
    },
    invoice: {
      words: ['請求', 'invoice', 'bill', '請求書', '見積'],
      weight: 0.9
    },
    photo: {
      words: ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.bmp', 'photo', '写真'],
      weight: 0.7
    }
  };
  
  let bestMatch: { type: DocType; confidence: number } = {
    type: 'unknown',
    confidence: 0
  };
  
  // 各タイプをチェック
  Object.entries(keywords).forEach(([type, config]) => {
    const matchCount = config.words.filter(word => {
      if (n.includes(word)) {
        foundKeywords.push(word);
        return true;
      }
      return false;
    }).length;
    
    if (matchCount > 0) {
      const confidence = Math.min(matchCount * config.weight / config.words.length, 1.0);
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type: type as DocType,
          confidence
        };
      }
    }
  });
  
  return {
    type: bestMatch.type,
    confidence: bestMatch.confidence,
    keywords: foundKeywords
  };
};

/**
 * ドキュメントタイプの日本語表示名を取得
 */
export const getDocTypeDisplayName = (type: DocType): string => {
  const displayNames: Record<DocType, string> = {
    receipt: 'レシート',
    delivery_slip: '搬入・納品書',
    contract: '契約書',
    drawing: '図面',
    spec: '仕様書',
    photo: '写真',
    invoice: '請求書',
    unknown: '不明'
  };
  
  return displayNames[type];
};

/**
 * ドキュメントタイプのアイコン名を取得（Material Icons）
 */
export const getDocTypeIcon = (type: DocType): string => {
  const iconNames: Record<DocType, string> = {
    receipt: 'receipt',
    delivery_slip: 'local-shipping',
    contract: 'gavel',
    drawing: 'architecture',
    spec: 'description',
    photo: 'photo',
    invoice: 'request-quote',
    unknown: 'help-outline'
  };
  
  return iconNames[type];
};

/**
 * ドキュメントタイプのテーマカラーを取得
 */
export const getDocTypeColor = (type: DocType): string => {
  const colors: Record<DocType, string> = {
    receipt: '#4CAF50',      // Green
    delivery_slip: '#2196F3', // Blue
    contract: '#9C27B0',     // Purple
    drawing: '#FF9800',      // Orange
    spec: '#607D8B',         // Blue Grey
    photo: '#E91E63',        // Pink
    invoice: '#F44336',      // Red
    unknown: '#9E9E9E'       // Grey
  };
  
  return colors[type];
};

/**
 * ファイル拡張子からMIMEタイプを取得
 */
export const getMimeTypeFromExtension = (filename: string): string => {
  const extension = filename.toLowerCase().split('.').pop();
  
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain'
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
};