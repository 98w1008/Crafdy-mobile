// Chat Intent Router - rule + regex + negative dictionary

export type IntentType =
  | 'create_report'
  | 'upload_doc'
  | 'create_invoice'
  | 'optimize_estimate'
  | 'update_progress'
  | 'open_site_manager'
  | 'set_billing_mode'
  | 'unknown'

export interface ParsedIntent {
  intent: IntentType
  confidence: number
  matched: string | null
  needsConfirmation?: boolean
  reason?: string
}

const DICT = {
  create_report: [/\b(日報|今日の分|作業記録|報告)\b/],
  upload_doc: [/\b(レシート|搬入|納品書|写真登録|書類)\b/],
  create_invoice: [/\b(請求(つくって|発行|ドラフト)?|請求書|月次|締め|請求出す|[0-9]{1,2}月分請求)\b/],
  optimize_estimate: [/\b(見積(つくって|更新|直して)?|見積書|概算|金額案)\b/],
  set_billing_mode: [/\b(請求設定|税抜にして|税込にして|締日を?15日)\b/],
  update_progress: [/\b(進捗|出来高|%更新|％に)\b/],
  open_site_manager: [/\b(現場管理|現場一覧|現場切替|現場変えて)\b/],
}

// negative rules to avoid misfires
const NEGATIVE = {
  create_invoice: [/見積請求|請求書っぽい/],
  optimize_estimate: [/請求.*見積.*比較/],
  create_report: [/明日の段取り/],
  upload_doc: [/図面を見て/],
}

export function parseIntent(text: string): ParsedIntent {
  const t = (text || '').trim()
  if (!t) return { intent: 'unknown', confidence: 0, matched: null }

  // try positives
  for (const [intent, regs] of Object.entries(DICT) as Array<[IntentType, RegExp[]]>) {
    for (const r of regs) {
      if (r.test(t)) {
        // check negative
        const negs = (NEGATIVE as any)[intent] as RegExp[] | undefined
        if (negs && negs.some((nr) => nr.test(t))) {
          return { intent, confidence: 0.6, matched: r.source, needsConfirmation: true, reason: 'negative-hit' }
        }
        return { intent, confidence: 0.9, matched: r.source }
      }
    }
  }
  return { intent: 'unknown', confidence: 0.2, matched: null }
}

// High-level router (placeholder)
export function routeIntent(text: string) {
  const res = parseIntent(text)
  return res
}
