/**
 * スキャン関連の型定義
 */

// スキャンタイプ
export type ScanType = 'expense' | 'delivery_note'

// 経費カテゴリ
export type ExpenseCategory = 
  | 'material'        // 材料
  | 'consumable'      // 消耗品
  | 'transport'       // 交通費
  | 'highway'         // 高速代
  | 'parking'         // 駐車料金
  | 'misc'            // 雑費

// 経費レコード
export interface Expense {
  id: string
  project_id: string
  user_id: string
  category: ExpenseCategory
  amount: number
  description: string
  receipt_url?: string
  receipt_ocr_data?: OCRData
  date: string
  created_at: string
  updated_at: string
}

// 搬入伝票レコード  
export interface DeliveryNote {
  id: string
  project_id: string
  user_id: string
  supplier_name: string
  delivery_date: string
  items: DeliveryItem[]
  document_url?: string
  document_ocr_data?: OCRData
  total_amount?: number
  created_at: string
  updated_at: string
}

// 搬入アイテム
export interface DeliveryItem {
  id: string
  name: string
  quantity: number
  unit: string
  unit_price?: number
  total_price?: number
  category: MaterialCategory
}

// 材料カテゴリ
export type MaterialCategory = 
  | 'structural'      // 構造材
  | 'finishing'       // 仕上げ材
  | 'equipment'       // 設備材
  | 'tools'           // 工具・消耗品

// OCRデータ
export interface OCRData {
  detected_text: string
  confidence: number
  extracted_fields?: Record<string, any>
  processing_timestamp: string
}

// スキャン結果
export interface ScanResult {
  type: ScanType
  ocr_data: OCRData
  suggested_category?: ExpenseCategory | MaterialCategory
  extracted_amount?: number
  extracted_date?: string
  extracted_items?: Partial<DeliveryItem>[]
}