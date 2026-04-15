import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  useColorScheme,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import { supabase, supabaseReady } from '@/lib/supabase'

// NOTE: 初期MVPでは「明日の予定」は必須にしない（docs/skills/main-chat-ux.md）
const ASK_NEXT_PLAN_IN_MVP = false
import { Colors, Spacing, Typography, BorderRadius, Shadows, getThemeColors, type ColorScheme } from '@/constants/Colors'
import { getProjectById, getSelectedProject, setSelectedProject, updateProject } from '@/lib/project-store'
import { createExpense, ExpenseKind, submitExpense } from '@/lib/expense-store'
import {
  createDailyReport,
  markDailyReportNoExpense,
  submitDailyReport,
  type PartnerWorkerEntry,
} from '@/lib/daily-report-store'
import { createWorker, findWorkerByName, listWorkers } from '@/lib/worker-store'
import {
  createPartnerCompany,
  findPartnerCompanyByName,
  listPartnerCompanies,
} from '@/lib/partner-company-store'
import { listSupportRates, upsertSupportRate } from '@/lib/support-rate-store'
import { listDailyReports } from '@/lib/daily-report-store'
import { createOrReplaceSupportBillingDraft, listSupportBillingDrafts } from '@/lib/support-billing-draft-store'
import { createOrReplaceSupportInvoiceDraft } from '@/lib/support-invoice-draft-store'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

type SelectedProject = { id: string; name: string } | null

type EmptyQuickAction = {
  id: 'invoice' | 'estimate' | 'daily_report' | 'expense'
  label: string
  hint: string
  prompt: string
}

type IntentCategory = 'invoice' | 'estimate' | 'daily_report' | 'expense'

const parseWorkerRegistration = (text: string): { name: string; dailyRate?: number } | null => {
  // NOTE: 最小実装（曖昧な文では反応しない）
  // 通す最小パターン:
  // - 職人/職長 + 登録/追加
  // - 登録/追加 + 日当
  // - 名前 + 日当
  // 想定: 「田中を職人登録」「職人に田中を追加」「佐々木を日当18000円で登録」「田中、日当20000円」
  const hasWorkerWord = /(職人|職長)/.test(text)
  const hasRegisterWord = /(登録|追加)/.test(text)

  const rate = (() => {
    const m = text.match(/日当\s*(\d{4,6})\s*(?:円)?/)
    if (!m?.[1]) return undefined
    const n = Number(m[1])
    if (!Number.isFinite(n) || n <= 0) return undefined
    return Math.round(n)
  })()

  const name = (() => {
    // 「職人に田中を追加」「田中を職人登録」
    const m1 = text.match(/職人(?:に|を)?\s*([^\s、，,を]+)\s*(?:を)?\s*(?:追加|登録)/)
    if (m1?.[1]) return m1[1]

    // 「佐々木を日当18000円で登録」「田中を登録」
    const m2 = text.match(/^([^\s、，,を]+)\s*(?:を)?\s*(?:.*?)(?:職人登録|登録|追加)/)
    if (m2?.[1]) return m2[1]

    // 「田中、日当20000円」
    const m3 = text.match(/^([^\s、，,を]+)[、，,\s]*日当\s*\d{4,6}/)
    if (m3?.[1]) return m3[1]

    return ''
  })().trim()

  const shouldHandle =
    (hasWorkerWord && hasRegisterWord) ||
    (hasRegisterWord && typeof rate === 'number') ||
    (!!name && typeof rate === 'number')

  if (!shouldHandle) return null
  if (!name) return null

  // 過剰に拾わない（長文・文章は弾く）
  if (name.length > 12) return null

  return { name, dailyRate: rate }
}

const parsePartnerCompanyRegistration = (text: string): { name: string; workerDailyRate?: number } | null => {
  // NOTE: 最小実装（曖昧な文では反応しない）
  // 通す最小パターン:
  // - 協力会社 + 登録/追加
  // - 登録/追加 + 人工単価
  // - 名前 + 人工単価
  // 想定: 「〇〇工業を協力会社登録」「〇〇工業を協力会社に追加」「〇〇工業、人工単価25000円で登録」「△△防水を人工単価23000円で追加」
  const hasPartnerWord = /(協力会社)/.test(text)
  const hasRegisterWord = /(登録|追加)/.test(text)

  const rate = (() => {
    const m = text.match(/(?:人工単価|単価)\s*(\d{4,6})\s*(?:円)?/)
    if (!m?.[1]) return undefined
    const n = Number(m[1])
    if (!Number.isFinite(n) || n <= 0) return undefined
    return Math.round(n)
  })()

  const name = (() => {
    // 「〇〇工業を協力会社登録」「〇〇工業を協力会社に追加」
    const m1 = text.match(/^([^\s、，,を]+)\s*(?:を)?\s*協力会社(?:に)?\s*(?:追加|登録)/)
    if (m1?.[1]) return m1[1]

    // 「協力会社 〇〇工業 追加」
    const m2 = text.match(/協力会社(?:に|を)?\s*([^\s、，,を]+)\s*(?:を)?\s*(?:追加|登録)/)
    if (m2?.[1]) return m2[1]

    // 「〇〇工業、人工単価25000円で登録」「△△防水を人工単価23000円で追加」
    const m3 = text.match(/^([^\s、，,を]+)[、，,\s]*(?:を)?\s*(?:人工単価|単価)\s*\d{4,6}/)
    if (m3?.[1]) return m3[1]

    // 「〇〇工業を登録」「〇〇工業を追加」
    const m4 = text.match(/^([^\s、，,を]+)\s*(?:を)?\s*(?:.*?)(?:登録|追加)/)
    if (m4?.[1]) return m4[1]

    return ''
  })().trim()

  const shouldHandle =
    (hasPartnerWord && hasRegisterWord) ||
    (hasRegisterWord && typeof rate === 'number') ||
    (!!name && typeof rate === 'number')

  if (!shouldHandle) return null
  if (!name) return null
  if (name.length > 24) return null

  return { name, workerDailyRate: rate }
}

const parseSupportDailyReportMeta = (
  text: string
): { companyName: string; supportType: 'jyouyou' | 'ouen' } | null => {
  // NOTE: 最小実装（曖昧なら既存導線へ流す）
  // 想定:
  // - 「今日は△△建設の応援」
  // - 「〇〇工務店 常用」
  // - 「△△建設に応援」
  // - 「〇〇工務店の常用で田中」
  const hasOuen = /(応援)/.test(text)
  const hasJyouyou = /(常用)/.test(text)
  if (!hasOuen && !hasJyouyou) return null

  const supportType: 'jyouyou' | 'ouen' = hasOuen ? 'ouen' : 'jyouyou'

  const companyName = (() => {
    // 「今日は△△建設の応援」「〇〇工務店の常用」
    const m1 = text.match(/(?:今日は)?\s*([^\s、，,をにの]+)\s*(?:の)?\s*(?:応援|常用)/)
    if (m1?.[1]) return m1[1]

    // 「△△建設に応援」
    const m2 = text.match(/([^\s、，,をにの]+)\s*に\s*(?:応援|常用)/)
    if (m2?.[1]) return m2[1]

    // 「〇〇工務店 常用」
    const m3 = text.match(/^([^\s、，,をにの]+)\s+(?:応援|常用)/)
    if (m3?.[1]) return m3[1]

    return ''
  })().trim()

  if (!companyName) return null
  if (companyName.length > 24) return null

  return { companyName, supportType }
}

const parseTollExpense = (text: string): { label: string; totalAmount: number } | null => {
  // NOTE: 最小実装（高速代/ETCのテキスト経費）。曖昧なら既存導線へ流す。
  // 想定:
  // - 「高速代 行き1320円 帰り1320円」
  // - 「高速 行き980円、帰り980円」
  // - 「ETC 2600円」
  // - 「高速代2500円」
  // - 「高速料金 1800円」
  const hasKeyword = /(高速代|高速料金|高速|ETC)/i.test(text)
  if (!hasKeyword) return null

  const label = /(ETC)/i.test(text) ? 'ETC' : '高速代'

  const parseMoney = (s: string): number | undefined => {
    const m = s.match(/(\d{3,7})\s*(?:円|¥|￥)?/)
    if (!m?.[1]) return undefined
    const n = Number(m[1])
    if (!Number.isFinite(n) || n <= 0) return undefined
    return Math.round(n)
  }

  const outgoing = (() => {
    const m = text.match(/(?:行き|往路)\s*(\d{3,7})\s*(?:円|¥|￥)?/)
    return m?.[1] ? parseMoney(m[1]) : undefined
  })()

  const returning = (() => {
    const m = text.match(/(?:帰り|復路)\s*(\d{3,7})\s*(?:円|¥|￥)?/)
    return m?.[1] ? parseMoney(m[1]) : undefined
  })()

  const single = (() => {
    // 「ETC 2600円」「高速代2500円」「高速料金 1800円」
    const m = text.match(/(?:高速代|高速料金|高速|ETC)\s*(\d{3,7})\s*(?:円|¥|￥)?/i)
    if (m?.[1]) return parseMoney(m[1])

    // fallback: キーワードがあって円/¥が含まれるなら最初の金額を使う
    if (/(円|¥|￥)/.test(text)) return parseMoney(text)

    return undefined
  })()

  const totalAmount =
    typeof outgoing === 'number' && typeof returning === 'number'
      ? outgoing + returning
      : typeof outgoing === 'number'
        ? outgoing
        : typeof returning === 'number'
          ? returning
          : typeof single === 'number'
            ? single
            : undefined

  if (typeof totalAmount !== 'number') return null

  return { label, totalAmount }
}

const parseSupportRateRegistration = (
  text: string
): { companyName: string; jyouyouDailyRate?: number; ouenDailyRate?: number } | null => {
  // NOTE: 最小実装（曖昧なら既存導線へ流す）
  // 通す例:
  // - 「△△建設 常用単価22000円で登録」
  // - 「△△建設 応援単価25000円で登録」
  // - 「△△建設の常用は22000円」
  // - 「△△建設の応援は25000円」
  // - 「△△建設 常用22000円 応援25000円」
  const hasAnyRateWord = /(単価|常用|応援)/.test(text)
  if (!hasAnyRateWord) return null

  const parseRate = (s: string): number | undefined => {
    const m = s.match(/(\d{4,7})\s*(?:円)?/)
    if (!m?.[1]) return undefined
    const n = Number(m[1])
    if (!Number.isFinite(n) || n <= 0) return undefined
    return Math.round(n)
  }

  const jyouyou = (() => {
    const m = text.match(/常用(?:単価)?\s*(\d{4,7})\s*(?:円)?/)
    if (m?.[1]) return parseRate(m[1])
    const m2 = text.match(/常用(?:は|＝|=|:)?\s*(\d{4,7})\s*(?:円)?/)
    if (m2?.[1]) return parseRate(m2[1])
    return undefined
  })()

  const ouen = (() => {
    const m = text.match(/応援(?:単価)?\s*(\d{4,7})\s*(?:円)?/)
    if (m?.[1]) return parseRate(m[1])
    const m2 = text.match(/応援(?:は|＝|=|:)?\s*(\d{4,7})\s*(?:円)?/)
    if (m2?.[1]) return parseRate(m2[1])
    return undefined
  })()

  const shouldHandle =
    (typeof jyouyou === 'number' || typeof ouen === 'number') &&
    /(常用|応援)/.test(text)
  if (!shouldHandle) return null

  const companyName = (() => {
    // 「△△建設 常用...」「△△建設の常用は...」「△△建設 常用... 応援...」
    const m1 = text.match(/^([^\s、，,をにの]+)\s*(?:の)?\s*(?:常用|応援)/)
    if (m1?.[1]) return m1[1]

    // 「△△建設 応援単価...」「△△建設 常用単価...」
    const m2 = text.match(/^([^\s、，,をにの]+)\s*(?:常用単価|応援単価)/)
    if (m2?.[1]) return m2[1]

    return ''
  })().trim()

  if (!companyName) return null
  if (companyName.length > 24) return null

  return { companyName, jyouyouDailyRate: jyouyou, ouenDailyRate: ouen }
}

const parseSupportBillingDraftCommand = (text: string): { companyName: string; ym?: string } | null => {
  // NOTE: 最小実装（曖昧なら既存導線へ流す）
  // 想定:
  // - 「△△建設の今月請求候補を作成」
  // - 「△△建設の請求候補を作って」
  // - 「△△建設 今月請求候補」
  // - 「〇〇工務店の常用・応援請求候補を作成」
  if (!/(請求候補)/.test(text)) return null

  const companyName = (() => {
    const m1 = text.match(/^([^\s、，,をにの]+)\s*(?:の)?\s*(?:今月)?\s*請求候補/)
    if (m1?.[1]) return m1[1]

    const m2 = text.match(/^([^\s、，,をにの]+)\s+(?:今月)?\s*請求候補/)
    if (m2?.[1]) return m2[1]

    return ''
  })().trim()

  if (!companyName) return null
  if (companyName.length > 24) return null

  // NOTE: ym指定は将来。今回は「今月」のみ。
  return { companyName }
}

const parseSupportInvoiceDraftCommand = (text: string): { companyName: string; ym?: string } | null => {
  // NOTE: 最小実装（曖昧なら既存導線へ流す）
  // 想定:
  // - 「△△建設の今月請求書下書きを作成」
  // - 「△△建設の請求書下書きを作って」
  // - 「△△建設 今月請求書下書き」
  // - 「〇〇工務店の請求書下書きを作成」
  if (!/(請求書下書き)/.test(text)) return null

  const companyName = (() => {
    const m1 = text.match(/^([^\s、，,をにの]+)\s*(?:の)?\s*(?:今月)?\s*請求書下書き/)
    if (m1?.[1]) return m1[1]

    const m2 = text.match(/^([^\s、，,をにの]+)\s+(?:今月)?\s*請求書下書き/)
    if (m2?.[1]) return m2[1]

    return ''
  })().trim()

  if (!companyName) return null
  if (companyName.length > 24) return null

  // NOTE: ym指定は将来。今回は「今月」のみ。
  return { companyName }
}

type ExpenseCollected = {
  receiptConfirmed: boolean
  whenWhereWhatConfirmed: boolean
  amountConfirmed: boolean
  paymentMethodConfirmed: boolean
}

type ExpenseDraft = {
  kind?: ExpenseKind
  amount?: number
  memo?: string
  date?: string // YYYY-MM-DD
}

type DailyReportDraft = {
  date?: string // YYYY-MM-DD
  work?: string
  workforceTime?: string
  nextPlan?: string
  selfWorkersCount?: number
  partnerWorkers?: PartnerWorkerEntry[]
}

type EstimateCollected = {
  workConfirmed: boolean
  quantityUnitConfirmed: boolean
  dueDateConfirmed: boolean
  locationConfirmed: boolean
}

type EstimatePhase1Values = {
  work?: string
  quantityUnit?: string
  dueDate?: string
  location?: string
}

type EstimatePhase = 1 | 2

type EstimatePhase2Collected = {
  clientConfirmed: boolean
  pricingPolicyConfirmed: boolean
  marginConfirmed: boolean
}

type EstimatePhase2Values = {
  client?: string
  pricingPolicy?: string
  margin?: string
}

type EstimateOverrides = {
  client?: string
  pricingPolicy?: string
  margin?: string
  dueDate?: string
  quantityUnit?: string
}

type DailyReportCollected = {
  dateConfirmed: boolean
  workConfirmed: boolean
  workforceTimeConfirmed: boolean
  nextPlanConfirmed: boolean
}

type InvoiceCollected = {
  clientConfirmed: boolean
  billingTargetConfirmed: boolean
  amountConfirmed: boolean
  dueDateConfirmed: boolean
}

const classifyIntentCategory = (text: string): IntentCategory | null => {
  const t = text.toLowerCase()

  // NOTE: 最小実装（キーワードベース）
  const hasAny = (keywords: string[]) => keywords.some(k => t.includes(k))

  if (hasAny(['請求', '請求書', 'インボイス', 'invoice'])) return 'invoice'
  if (hasAny(['見積', '見積もり', '見積り', '見積書', 'estimate'])) return 'estimate'
  if (hasAny(['日報', '作業報告', '報告書', 'daily report'])) return 'daily_report'
  if (hasAny(['経費', '領収書', 'レシート', '材料費', '外注費', 'expense'])) return 'expense'

  return null
}

const defaultExpenseCollected: ExpenseCollected = {
  receiptConfirmed: false,
  whenWhereWhatConfirmed: false,
  amountConfirmed: false,
  paymentMethodConfirmed: false,
}

const defaultExpenseDraft: ExpenseDraft = {}
const defaultDailyReportDraft: DailyReportDraft = {}

const defaultEstimateCollected: EstimateCollected = {
  workConfirmed: false,
  quantityUnitConfirmed: false,
  dueDateConfirmed: false,
  locationConfirmed: false,
}

const defaultEstimatePhase1Values: EstimatePhase1Values = {}

const defaultEstimatePhase2Collected: EstimatePhase2Collected = {
  clientConfirmed: false,
  pricingPolicyConfirmed: false,
  marginConfirmed: false,
}

const defaultEstimatePhase2Values: EstimatePhase2Values = {}

const defaultEstimateOverrides: EstimateOverrides = {}

const defaultDailyReportCollected: DailyReportCollected = {
  dateConfirmed: false,
  workConfirmed: false,
  workforceTimeConfirmed: false,
  nextPlanConfirmed: false,
}

const defaultInvoiceCollected: InvoiceCollected = {
  clientConfirmed: false,
  billingTargetConfirmed: false,
  amountConfirmed: false,
  dueDateConfirmed: false,
}

const extractExpenseCollected = (text: string, prev: ExpenseCollected): ExpenseCollected => {
  const t = text.toLowerCase()

  const next: ExpenseCollected = { ...prev }

  // 領収書/写真: 「ある/ない」どちらでも、言及があれば確認済みにする
  if (
    /(領収|領収書|レシート|レシ|写真|画像|添付)/.test(t) &&
    /(ある|あり|ない|なし|無し|無い)/.test(t)
  ) {
    next.receiptConfirmed = true
  }

  // 金額（円/¥/数字）
  if (/(¥|円)/.test(t) && /\d/.test(t)) {
    next.amountConfirmed = true
  }

  // 支払方法
  if (/(現金|カード|クレカ|振込|銀行|paypay|ペイペイ)/.test(t)) {
    next.paymentMethodConfirmed = true
  }

  // いつ/どこで/何（雑でも、購入/支払い内容の記述があればOK扱い）
  if (/(で|にて|@|＠|購入|買|支払|払|店|コンビニ|ホームセンター)/.test(t) && t.length >= 6) {
    next.whenWhereWhatConfirmed = true
  }

  return next
}

const extractEstimateCollected = (text: string, prev: EstimateCollected): EstimateCollected => {
  const t = text.toLowerCase()

  const next: EstimateCollected = { ...prev }

  // 工事/作業内容
  if (/(工事|作業|交換|取付|取り付け|設置|修理|塗装|撤去|補修)/.test(t) && t.length >= 4) {
    next.workConfirmed = true
  }

  // 数量/単位
  if (/\d+\s*(個|台|m2|㎡|m|式|箇所|本|枚)/.test(t)) {
    next.quantityUnitConfirmed = true
  }

  // 希望納期
  if (/(納期|まで|今週|来週|月末|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(t)) {
    next.dueDateConfirmed = true
  }

  // 現場住所（ざっくり判定）
  if (/(都|道|府|県|市|区|町|村)/.test(t) || /(現場|住所)/.test(t)) {
    next.locationConfirmed = true
  }

  return next
}

const extractEstimatePhase1Values = (text: string, prev: EstimatePhase1Values): EstimatePhase1Values => {
  const t = text.toLowerCase()
  const next: EstimatePhase1Values = { ...prev }

  // 数量/単位（優先度高）
  const qty = text.match(/(\d+\s*(?:個|台|m2|㎡|m|式|箇所|本|枚))/)
  if (qty?.[1]) next.quantityUnit = qty[1].trim()

  // 希望納期（優先度高：ラベル付き or 日付っぽい）
  const dueLabeled = text.match(/(?:希望納期|納期|いつまで)[:：\s]*([^\n]+)/)
  if (dueLabeled?.[1]) next.dueDate = dueLabeled[1].trim()
  else if (/(今週|来週|月末|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(t)) next.dueDate = text.trim()

  // 工事/作業内容（雑でOK）
  if (/(工事|作業|交換|取付|取り付け|設置|修理|塗装|撤去|補修)/.test(t) && t.length >= 4) {
    // 「〜を」以降をざっくり拾う
    const m = text.match(/(.{4,})/)
    next.work = (m?.[1] || text).trim()
  }

  // 現場住所（雑でOK）
  if (/(都|道|府|県|市|区|町|村)/.test(t) || /(現場|住所)/.test(t)) {
    const m = text.match(/(?:現場|住所)[:：\s]*([^\n]+)/)
    next.location = (m?.[1] || text).trim()
  }

  return next
}

const extractEstimatePhase2Collected = (
  text: string,
  prev: EstimatePhase2Collected
): EstimatePhase2Collected => {
  const t = text.toLowerCase()

  const next: EstimatePhase2Collected = { ...prev }

  // 元請け/顧客名（会社名っぽい/御中など）
  if (/(御中|株式会社|有限会社|合同会社|会社)/.test(text) || /(会社|御中)/.test(t)) {
    next.clientConfirmed = true
  }

  // 価格方針
  if (/(攻め|標準|慎重|強気|安全|固め)/.test(t)) {
    next.pricingPolicyConfirmed = true
  }

  // 希望粗利率
  if ((/(%|パーセント)/.test(t) && /\d/.test(t)) || (/(粗利)/.test(t) && /\d/.test(t))) {
    next.marginConfirmed = true
  }

  return next
}

const extractEstimatePhase2Values = (text: string, prev: EstimatePhase2Values): EstimatePhase2Values => {
  const t = text.toLowerCase()
  const next: EstimatePhase2Values = { ...prev }

  // client（会社名っぽい語があれば全体 or ラベル後を拾う）
  if (/(御中|株式会社|有限会社|合同会社|会社)/.test(text) || /(元請け|顧客|宛名)/.test(t)) {
    const m = text.match(/(?:元請け|顧客|宛名)[:：\s]*([^\n]+)/)
    next.client = (m?.[1] || text).trim()
  }

  // pricingPolicy（攻め/標準/慎重に正規化）
  if (/(価格方針|攻め|標準|慎重|強気|安全|固め)/.test(t)) {
    if (/(攻め|強気)/.test(t)) next.pricingPolicy = '攻め'
    else if (/(慎重|安全|固め)/.test(t)) next.pricingPolicy = '慎重'
    else if (/(標準)/.test(t)) next.pricingPolicy = '標準'
    else {
      const m = text.match(/価格方針[:：\s]*([^\n]+)/)
      next.pricingPolicy = (m?.[1] || '').trim() || next.pricingPolicy
    }
  }

  // margin（xx% へ正規化）
  if (/(粗利|%|パーセント)/.test(t)) {
    const m = text.match(/(\d{1,2}(?:\.\d+)?)\s*(%|パーセント)/)
    if (m?.[1]) next.margin = `${m[1]}%`
    else {
      const n = text.match(/\d{1,2}(?:\.\d+)?/)
      if (n?.[0]) next.margin = `${n[0]}%`
    }
  }

  return next
}

const isExpenseComplete = (c: ExpenseCollected) =>
  c.receiptConfirmed && c.whenWhereWhatConfirmed && c.amountConfirmed && c.paymentMethodConfirmed

const extractDailyReportCollected = (text: string, prev: DailyReportCollected): DailyReportCollected => {
  const t = text.toLowerCase()

  const next: DailyReportCollected = { ...prev }

  // 日付
  if (/(今日|きょう|昨日|きのう|明日|あした|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(t)) {
    next.dateConfirmed = true
  }

  // 作業内容
  if (/(工事|作業|取付|取り付け|設置|配管|塗装|撤去|補修|施工)/.test(t) && t.length >= 4) {
    next.workConfirmed = true
  }

  // 人数/作業時間
  if (/(\d+\s*(人|名)|\d+\s*(時間|h)|半日|終日)/.test(t)) {
    next.workforceTimeConfirmed = true
  }

  // 明日の予定
  if (/(明日|次回|続き|予定|明日は)/.test(t)) {
    next.nextPlanConfirmed = true
  }

  return next
}

const isEstimateComplete = (c: EstimateCollected) =>
  c.workConfirmed && c.quantityUnitConfirmed && c.dueDateConfirmed && c.locationConfirmed

const isEstimatePhase2Complete = (c: EstimatePhase2Collected) =>
  c.clientConfirmed && c.pricingPolicyConfirmed && c.marginConfirmed

const buildEstimateFinalSummary = (params: {
  phase1: EstimateCollected
  phase2: EstimatePhase2Collected
  phase2Values?: EstimatePhase2Values
  overrides?: EstimateOverrides
  selectedProjectName?: string
}) => {
  const projectLine = params.selectedProjectName
    ? `現場: ${params.selectedProjectName}`
    : '現場: 未選択'

  const phase1Labels = getIntentFields('estimate')
  const phase1Flags = [
    params.phase1.workConfirmed,
    params.phase1.quantityUnitConfirmed,
    params.phase1.dueDateConfirmed,
    params.phase1.locationConfirmed,
  ]

  const phase2Labels = ['元請け/顧客名', '価格方針', '希望粗利率']
  const phase2Flags = [
    params.phase2.clientConfirmed,
    params.phase2.pricingPolicyConfirmed,
    params.phase2.marginConfirmed,
  ]

  const suffixFor = (key: keyof EstimateOverrides) => {
    const v = params.overrides?.[key]
    if (v) return `（修正: ${v}）`

    // phase2の実値（修正指示なしの場合の初回入力）
    if (key === 'client' && params.phase2Values?.client) return `（入力: ${params.phase2Values.client}）`
    if (key === 'pricingPolicy' && params.phase2Values?.pricingPolicy)
      return `（入力: ${params.phase2Values.pricingPolicy}）`
    if (key === 'margin' && params.phase2Values?.margin) return `（入力: ${params.phase2Values.margin}）`

    return ''
  }

  const toLine = (label: string, ok: boolean, suffix = '') =>
    `・${label}: ${ok ? '取得済み' : '未確認'}${suffix}`

  return [
    '最終確認（見積）',
    projectLine,
    '',
    '【見積の土台】',
    ...phase1Labels.map((l, i) => {
      if (l === '数量/単位') return toLine(l, !!phase1Flags[i], suffixFor('quantityUnit'))
      if (l === '希望納期') return toLine(l, !!phase1Flags[i], suffixFor('dueDate'))
      return toLine(l, !!phase1Flags[i])
    }),
    '',
    '【価格の前提】',
    ...phase2Labels.map((l, i) => {
      if (l === '元請け/顧客名') return toLine(l, !!phase2Flags[i], suffixFor('client'))
      if (l === '価格方針') return toLine(l, !!phase2Flags[i], suffixFor('pricingPolicy'))
      if (l === '希望粗利率') return toLine(l, !!phase2Flags[i], suffixFor('margin'))
      return toLine(l, !!phase2Flags[i])
    }),
    '',
    '修正があれば、項目名を指定してチャットで指示してください（例：「希望納期を来週金曜に」）。',
  ].join('\n')
}

const getLastAiText = (messages: Message[]) => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'ai') return messages[i].text
  }
  return null
}

const parseExpenseKind = (text: string): ExpenseKind | undefined => {
  if (/(レシート|領収書)/.test(text)) return 'receipt'
  if (/(材料|部材)/.test(text)) return 'material'
  if (/(外注|下請|協力会社)/.test(text)) return 'subcontract'
  if (/(経費)/.test(text)) return 'expense'
  return undefined
}

const parseExpenseAmount = (text: string): number | undefined => {
  const m = text.match(/(?:¥|￥)?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:円)?/)
  if (!m?.[1]) return undefined
  const n = Number(m[1].replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

const parseRevenueAmount = (text: string): number | undefined => {
  // 例: 80万 / 80万円 / 1.2万
  const man = text.match(/(\d+(?:\.\d+)?)\s*万(?:円)?/)
  if (man?.[1]) {
    const v = Number(man[1])
    const n = Math.round(v * 10000)
    if (!Number.isFinite(n) || n <= 0) return undefined
    return n
  }

  // 例: 1200000円 / ¥1,200,000
  return parseExpenseAmount(text)
}

const toYmd = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const parseExpenseDate = (text: string, now = new Date()): string | undefined => {
  if (/(今日)/.test(text)) return toYmd(now)
  if (/(昨日)/.test(text)) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return toYmd(d)
  }

  const slash = text.match(/(\d{1,2})\/(\d{1,2})/)
  if (slash) {
    const mm = Number(slash[1])
    const dd = Number(slash[2])
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${now.getFullYear()}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
  }

  const jp = text.match(/(\d{1,2})月(\d{1,2})日/)
  if (jp) {
    const mm = Number(jp[1])
    const dd = Number(jp[2])
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${now.getFullYear()}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
  }

  return undefined
}

const stripExpenseKeywords = (text: string) => {
  return text
    .replace(/(レシート|領収書|材料|部材|外注|下請|協力会社|経費)/g, '')
    .replace(/(?:¥|￥)?\s*\d{1,3}(?:,\d{3})*\s*円?/g, '')
    .replace(/(今日|昨日|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/g, '')
    .replace(/[\s、,]+/g, ' ')
    .trim()
}

const parseDailyReportWork = (text: string): string | undefined => {
  if (!/(工事|作業|配管|塗装|防水|交換|取付|設置|撤去|補修)/.test(text)) return undefined
  return text.trim()
}

const parseDailyReportWorkforceTime = (text: string): string | undefined => {
  const m = text.match(/(\d+\s*(?:人|名))|((?:\d+(?:\.\d+)?)\s*h)|(半日|終日)/)
  if (m?.[0]) return m[0].trim()
  return undefined
}

const parseDailyReportNextPlan = (text: string): string | undefined => {
  if (!/(明日|次回|続き|予定)/.test(text)) return undefined
  return text.trim()
}

const parseDailyReportSelfWorkersCount = (text: string): number | undefined => {
  const m = text.match(/(?:うち)?自社\s*(\d+)\s*(?:人|名)/)
  if (!m?.[1]) return undefined
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

const parseDailyReportPartnerWorkers = (text: string): PartnerWorkerEntry[] => {
  const out: PartnerWorkerEntry[] = []

  const re = /(?:協力会社\s*)?([^\s　]+(?:工業|建設|防水|電気|設備|塗装|解体|内装|土木|水道|空調|ガス))\s*(\d+)\s*(?:人|名)/g
  for (const m of text.matchAll(re)) {
    const name = (m?.[1] || '').trim()
    const n = Number(m?.[2])
    if (!name || name.includes('自社')) continue
    if (!Number.isFinite(n) || n <= 0) continue
    out.push({ companyName: name, workersCount: Math.floor(n) })
    if (out.length >= 2) break
  }

  return out
}

const extractSelfWorkersFromText = async (text: string) => {
  const workers = await listWorkers()
  const hits = workers.filter(w => w.isActive !== false && w.name && text.includes(w.name))

  const names: string[] = []
  const ids: string[] = []
  for (const w of hits) {
    if (names.includes(w.name)) continue
    names.push(w.name)
    ids.push(w.id)
    if (names.length >= 5) break
  }

  return { names, ids }
}

const isEstimateGenerateInstruction = (text: string) => {
  const t = text.toLowerCase()
  return (
    /(作って|作成|たたき台|この内容で|お願いします)/.test(text) ||
    /(estimate)/.test(t) ||
    /(見積|見積もり|見積り)/.test(text)
  )
}

type EstimateDraftLineItem = {
  label: string
  description?: string
  quantity: string
  unit: string
  unitPrice: string
  amount: string
  notes?: string
}

type EstimateDraftData = {
  header: {
    title: string
    client: string
    project: string
  }
  conditions: {
    work: string
    quantityUnit: string
    dueDate: string
    location: string
    pricingPolicy: string
    margin: string
  }
  lineItems: EstimateDraftLineItem[]
  notes: string
}

type EstimateTemplatePayloadRow = {
  label: string
  description?: string
  quantity: string
  unit: string
  unitPrice: string
  amount: string
  notes?: string
}

type EstimateTemplatePayload = {
  document: {
    title: string
    client: string
    project: string
  }
  summary: {
    work: string
    quantityUnit: string
    dueDate: string
    location: string
    pricingPolicy: string
    margin: string
  }
  rows: EstimateTemplatePayloadRow[]
  footer: {
    notes: string
  }
}

const buildEstimateTemplatePayload = (data: EstimateDraftData): EstimateTemplatePayload => {
  return {
    document: {
      title: data.header.title,
      client: data.header.client,
      project: data.header.project,
    },
    summary: {
      work: data.conditions.work,
      quantityUnit: data.conditions.quantityUnit,
      dueDate: data.conditions.dueDate,
      location: data.conditions.location,
      pricingPolicy: data.conditions.pricingPolicy,
      margin: data.conditions.margin,
    },
    rows: data.lineItems.map(item => ({
      label: item.label,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
      notes: item.notes,
    })),
    footer: {
      notes: data.notes,
    },
  }
}

const buildEstimateDraftData = (params: {
  phase1: EstimateCollected
  phase1Values: EstimatePhase1Values
  phase2Values: EstimatePhase2Values
  overrides: EstimateOverrides
  selectedProjectName?: string
}): EstimateDraftData => {
  const o = params.overrides

  const client = o.client || params.phase2Values.client || '（未入力）'
  const project = params.selectedProjectName || '（未選択）'

  const work = params.phase1Values.work || (params.phase1.workConfirmed ? '（取得済み）' : '（未入力）')
  const quantityUnit =
    o.quantityUnit ||
    params.phase1Values.quantityUnit ||
    (params.phase1.quantityUnitConfirmed ? '（取得済み）' : '（未入力）')
  const dueDate =
    o.dueDate || params.phase1Values.dueDate || (params.phase1.dueDateConfirmed ? '（取得済み）' : '（未入力）')
  const location = params.phase1Values.location || (params.phase1.locationConfirmed ? '（取得済み）' : '（未入力）')

  const pricingPolicy = o.pricingPolicy || params.phase2Values.pricingPolicy || '（未入力）'
  const margin = o.margin || params.phase2Values.margin || '（未入力）'

  const lineItems: EstimateDraftLineItem[] = []

  // 本工事（work をベースに「内訳っぽい」1行を作る）
  lineItems.push({
    label: '本工事',
    description: work !== '（未入力）' ? work : undefined,
    quantity: '1',
    unit: '式',
    unitPrice: '未設定',
    amount: '未設定',
  })

  // 数量ベース（数量/単位が取れていれば、それを優先して行を作る）
  if (quantityUnit && quantityUnit !== '（未入力）' && quantityUnit !== '（取得済み）') {
    // 例: "10台" -> quantity: "10", unit: "台"
    const m = quantityUnit.match(/^(\d+)\s*([^\d\s]+)$/)
    const qty = m?.[1] || quantityUnit
    const unit = m?.[2] || '式'
    lineItems.push({
      label: '数量ベース行',
      description: '数量/単位ベースの仮行',
      quantity: qty,
      unit,
      unitPrice: '未設定',
      amount: '未設定',
    })
  }

  // 諸条件（場所や納期などを notes に寄せる）
  const conditionsNotes: string[] = []
  if (location && location !== '（未入力）' && location !== '（取得済み）') conditionsNotes.push(`現場住所: ${location}`)
  if (dueDate && dueDate !== '（未入力）' && dueDate !== '（取得済み）') conditionsNotes.push(`希望納期: ${dueDate}`)

  if (conditionsNotes.length > 0) {
    lineItems.push({
      label: '諸条件',
      description: '現場/納期など',
      quantity: '1',
      unit: '式',
      unitPrice: '未設定',
      amount: '未設定',
      notes: conditionsNotes.join(' / '),
    })
  }

  return {
    header: {
      title: '見積たたき台（ダミー）',
      client,
      project,
    },
    conditions: {
      work,
      quantityUnit,
      dueDate,
      location,
      pricingPolicy,
      margin,
    },
    lineItems,
    notes: '金額計算・正式な見積書出力（PDF/Excel）はまだ未対応です。',
  }
}

const buildEstimateDraftMessage = (data: EstimateDraftData) => {
  const payload = buildEstimateTemplatePayload(data)

  const lines: string[] = []
  lines.push(payload.document.title)
  lines.push(`宛名: ${payload.document.client}`)
  lines.push(`現場: ${payload.document.project}`)
  lines.push('')
  lines.push('【条件】')
  lines.push(`・工事/作業内容: ${payload.summary.work}`)
  lines.push(`・数量/単位: ${payload.summary.quantityUnit}`)
  lines.push(`・希望納期: ${payload.summary.dueDate}`)
  lines.push(`・現場住所: ${payload.summary.location}`)
  lines.push(`・価格方針: ${payload.summary.pricingPolicy}`)
  lines.push(`・希望粗利率: ${payload.summary.margin}`)
  lines.push('')
  lines.push('【内訳（仮）】')
  for (const row of payload.rows) {
    const desc = row.description ? `（${row.description}）` : ''
    const notes = row.notes ? ` / ${row.notes}` : ''
    lines.push(`・${row.label}${desc}：${row.quantity}${row.unit} / 単価:${row.unitPrice} / 金額:${row.amount}${notes}`)
  }
  lines.push('')
  lines.push(`備考: ${payload.footer.notes}`)
  lines.push('修正があれば、項目名を指定してチャットで指示してください。')

  return lines.join('\n')
}

const parseEstimateEditInstruction = (text: string) => {
  const t = text.toLowerCase()

  const edits: EstimateOverrides = {}

  // 元請け/顧客名
  if (/(元請け|顧客|宛名)/.test(t) || /(御中|株式会社|有限会社|合同会社)/.test(text)) {
    const m = text.match(/(?:元請け|顧客|宛名)[:：\s]*([^\n]+)/)
    edits.client = (m?.[1] || text).trim()
  }

  // 価格方針
  if (/(価格方針|攻め|標準|慎重|強気|安全|固め)/.test(t)) {
    if (/(攻め|強気)/.test(t)) edits.pricingPolicy = '攻め'
    else if (/(慎重|安全|固め)/.test(t)) edits.pricingPolicy = '慎重'
    else if (/(標準)/.test(t)) edits.pricingPolicy = '標準'
    else {
      const m = text.match(/価格方針[:：\s]*([^\n]+)/)
      edits.pricingPolicy = (m?.[1] || '').trim() || '標準'
    }
  }

  // 希望粗利率
  if (/(粗利|%|パーセント)/.test(t)) {
    const m = text.match(/(\d{1,2}(?:\.\d+)?)\s*(%|パーセント)/)
    if (m?.[1]) edits.margin = `${m[1]}%`
    else {
      const n = text.match(/\d{1,2}(?:\.\d+)?/)
      if (n?.[0]) edits.margin = `${n[0]}%`
    }
  }

  // 希望納期
  if (/(納期|いつまで|来週|今週|月末|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(t)) {
    const m = text.match(/(?:希望納期|納期|いつまで)[:：\s]*([^\n]+)/)
    edits.dueDate = (m?.[1] || text).trim()
  }

  // 数量/単位
  if (/(数量|単位|台|個|㎡|m2|m|式|箇所|本|枚)/.test(t)) {
    const m = text.match(/(?:数量|単位)[:：\s]*([^\n]+)/)
    const d = text.match(/\d+\s*(個|台|m2|㎡|m|式|箇所|本|枚)/)
    edits.quantityUnit = (m?.[1] || d?.[0] || text).trim()
  }

  return edits
}

const extractInvoiceCollected = (text: string, prev: InvoiceCollected): InvoiceCollected => {
  const t = text.toLowerCase()

  const next: InvoiceCollected = { ...prev }

  // 宛名（会社名っぽい/御中など）
  if (/(御中|株式会社|有限会社|合同会社|\binc\b|\bco\.\b|\bltd\b)/i.test(text) || /(会社|御中)/.test(t)) {
    next.clientConfirmed = true
  }

  // 請求対象（工事名/期間/○月分など）
  if (/(工事|案件|現場|対象|期間|\d{1,2}月分)/.test(t)) {
    next.billingTargetConfirmed = true
  }

  // 金額（円/¥/数字）
  if (/(¥|円)/.test(t) && /\d/.test(t)) {
    next.amountConfirmed = true
  }

  // 支払期日
  if (/(支払|期日|まで|月末|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(t)) {
    next.dueDateConfirmed = true
  }

  return next
}

const isDailyReportComplete = (c: DailyReportCollected) =>
  c.dateConfirmed && c.workConfirmed && c.workforceTimeConfirmed && (ASK_NEXT_PLAN_IN_MVP ? c.nextPlanConfirmed : true)

const isInvoiceComplete = (c: InvoiceCollected) =>
  c.clientConfirmed && c.billingTargetConfirmed && c.amountConfirmed && c.dueDateConfirmed

const buildFirstAiReply = (category: IntentCategory, selectedProjectName?: string) => {
  const projectNote = selectedProjectName
    ? `（現場: ${selectedProjectName}）`
    : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

  // NOTE: 初回は「1つだけ」聞く（フォーム感を減らす）
  switch (category) {
    case 'invoice':
      return [`了解。請求書つくります。宛名（取引先名）は？`, projectNote].join('\n')
    case 'estimate':
      return [`了解。見積つくります。作業内容は？`, projectNote].join('\n')
    case 'daily_report':
      return [`了解。日報まとめます。日付は？（今日でもOK）`, projectNote].join('\n')
    case 'expense':
      return [`了解。経費まとめます。領収書/写真ある？（あれば添付）`, projectNote].join('\n')
  }
}

const getIntentFields = (category: IntentCategory) => {
  switch (category) {
    case 'invoice':
      return ['宛名', '請求対象', '金額', '支払期日']
    case 'estimate':
      return ['工事/作業内容', '数量/単位', '希望納期', '現場住所']
    case 'daily_report':
      return ['日付', '作業内容', '人数/作業時間']
    case 'expense':
      return ['領収書/写真', 'いつ/どこで/何', '金額', '支払方法']
  }
}

const getIntentQuestionCount = (category: IntentCategory) => {
  return getIntentFields(category).length
}

const buildProgressSummary = (
  category: IntentCategory,
  step: number,
  expenseCollected?: ExpenseCollected,
  estimateCollected?: EstimateCollected,
  dailyReportCollected?: DailyReportCollected,
  invoiceCollected?: InvoiceCollected
) => {
  const fields = getIntentFields(category)

  // NOTE: 最小実装。
  // - 既存カテゴリは step を「ここまで回答済み（とみなす）」
  // - expense は抽出結果（expenseCollected）を優先
  const lines = fields.map((label, idx) => {
    let status: 'OK' | 'まだ'

    if (category === 'expense' && expenseCollected) {
      const flags = [
        expenseCollected.receiptConfirmed,
        expenseCollected.whenWhereWhatConfirmed,
        expenseCollected.amountConfirmed,
        expenseCollected.paymentMethodConfirmed,
      ]
      status = flags[idx] ? 'OK' : 'まだ'
    } else if (category === 'estimate' && estimateCollected) {
      const flags = [
        estimateCollected.workConfirmed,
        estimateCollected.quantityUnitConfirmed,
        estimateCollected.dueDateConfirmed,
        estimateCollected.locationConfirmed,
      ]
      status = flags[idx] ? 'OK' : 'まだ'
    } else if (category === 'daily_report' && dailyReportCollected) {
      const flags = [
        dailyReportCollected.dateConfirmed,
        dailyReportCollected.workConfirmed,
        dailyReportCollected.workforceTimeConfirmed,
      ]
      status = flags[idx] ? 'OK' : 'まだ'
    } else if (category === 'invoice' && invoiceCollected) {
      const flags = [
        invoiceCollected.clientConfirmed,
        invoiceCollected.billingTargetConfirmed,
        invoiceCollected.amountConfirmed,
        invoiceCollected.dueDateConfirmed,
      ]
      status = flags[idx] ? 'OK' : 'まだ'
    } else {
      status = idx < step ? 'OK' : 'まだ'
    }

    const mark = status === 'OK' ? '✓' : '□'
    const tail = status === 'OK' ? 'OK' : 'まだ'
    return `${mark} ${label}  ${tail}`
  })

  return ['【いまの状況】', ...lines].join('\n')
}

const buildFollowupAiReply = (
  category: IntentCategory,
  step: number,
  selectedProjectName?: string,
  expenseCollected?: ExpenseCollected,
  estimateCollected?: EstimateCollected,
  dailyReportCollected?: DailyReportCollected,
  invoiceCollected?: InvoiceCollected
) => {
  const projectNote = selectedProjectName
    ? `（現場: ${selectedProjectName}）`
    : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

  const progress = buildProgressSummary(
    category,
    step,
    expenseCollected,
    estimateCollected,
    dailyReportCollected,
    invoiceCollected
  )

  // NOTE: 最小実装。stepに応じて「次に聞くべきこと」を1つずつ進める。
  switch (category) {
    case 'invoice': {
      const questions = [
        '宛名は？',
        '請求対象は？（工事名 / 対象期間）',
        '金額はいくら？（内訳があれば内訳も）',
        '支払期日は？',
      ]
      return `${progress}\n\n次:\n👉 ${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'estimate': {
      const questions = [
        '作業内容は？',
        '数量/単位は？（ざっくりでOK）',
        '希望納期は？',
        '現場住所は？（分かる範囲でOK）',
      ]
      return `${progress}\n\n次:\n👉 ${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'daily_report': {
      const questions = [
        '日付は？（今日でもOK）',
        '作業内容は？（箇条書きでOK）',
        '人数/作業時間は？（分かる範囲でOK）',
      ]
      return `${progress}\n\n次:\n👉 ${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
    case 'expense': {
      const questions = [
        '領収書/写真ある？（あれば添付）',
        'いつ/どこで/何に使った？',
        '金額はいくら？（税込）',
        '支払方法は？（現金/カード/振込など）',
      ]
      return `${progress}\n\n次:\n👉 ${questions[Math.min(step, questions.length - 1)]}\n${projectNote}`
    }
  }
}

export default function SimpleChatScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPlusSheetOpen, setIsPlusSheetOpen] = useState(false)
  const [isThemeSheetOpen, setIsThemeSheetOpen] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')

  const scrollViewRef = useRef<ScrollView | null>(null)
  const inputRef = useRef<TextInput | null>(null)
  const scrollToBottom = (delayMs = 0) => {
    setTimeout(() => {
      try {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      } catch {
        // ignore
      }
    }, delayMs)
  }
  const [selectedProject, setSelectedProjectState] = useState<SelectedProject>(null)
  const [selectedProjectDetails, setSelectedProjectDetails] = useState<{ address?: string; memo?: string; revenue?: number } | null>(null)

  const [access, setAccess] = useState<AccessContext | null>(null)
  const [displayName, setDisplayName] = useState<string>('')

  const [currentIntent, setCurrentIntent] = useState<IntentCategory | null>(null)
  const [intentStep, setIntentStep] = useState(0)
  const [expenseCollected, setExpenseCollected] = useState<ExpenseCollected>(defaultExpenseCollected)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(defaultExpenseDraft)
  const [isExpenseIntake, setIsExpenseIntake] = useState(false)
  const [dailyReportDraft, setDailyReportDraft] = useState<DailyReportDraft>(defaultDailyReportDraft)
  const [isDailyReportIntake, setIsDailyReportIntake] = useState(false)
  const [supportDailyReportMeta, setSupportDailyReportMeta] = useState<{
    companyName: string
    supportType: 'jyouyou' | 'ouen'
  } | null>(null)
  const [estimateCollected, setEstimateCollected] = useState<EstimateCollected>(defaultEstimateCollected)
  const [estimatePhase1Values, setEstimatePhase1Values] = useState<EstimatePhase1Values>(defaultEstimatePhase1Values)
  const [estimatePhase, setEstimatePhase] = useState<EstimatePhase>(1)
  const [estimatePhase2Collected, setEstimatePhase2Collected] = useState<EstimatePhase2Collected>(
    defaultEstimatePhase2Collected
  )
  const [estimatePhase2Values, setEstimatePhase2Values] = useState<EstimatePhase2Values>(defaultEstimatePhase2Values)
  const [estimateOverrides, setEstimateOverrides] = useState<EstimateOverrides>(defaultEstimateOverrides)
  const [dailyReportCollected, setDailyReportCollected] = useState<DailyReportCollected>(defaultDailyReportCollected)
  const [invoiceCollected, setInvoiceCollected] = useState<InvoiceCollected>(defaultInvoiceCollected)

  const [lastDraftTarget, setLastDraftTarget] = useState<
    | { type: 'daily_report'; id: string; projectName?: string }
    | { type: 'expense'; id: string; projectName?: string }
    | null
  >(null)

  const { newProjectId, newProjectName, selectedProjectId, selectedProjectName } = useLocalSearchParams<{
    newProjectId?: string
    newProjectName?: string
    selectedProjectId?: string
    selectedProjectName?: string
  }>()

  const promptChips = (() => {
    const role = access?.kind === 'assigned' ? access.role : 'unassigned'

    const common = [
      { id: 'daily', label: '日報を入力', text: '日報を入力したいです。必要な情報を聞いてください。' },
      { id: 'expense', label: '経費を登録', text: '経費を登録したいです。必要な情報を聞いてください。' },
      { id: 'invoice', label: '請求書を作る', text: '請求書を作りたいです。必要な情報を聞いてください。' },
      { id: 'estimate', label: '見積を作る', text: '見積を作りたいです。必要な情報を聞いてください。' },
      { id: 'what', label: '何ができる？', text: 'クラフディで何ができますか？' },
      { id: 'setup', label: '最初に設定は？', text: '最初に何を設定すればいいですか？' },
    ]

    if (role === 'member') {
      return [
        { id: 'daily', label: '日報を入力', text: '日報を入力したいです。必要な情報を聞いてください。' },
        { id: 'expense', label: '経費を登録', text: '経費を登録したいです。必要な情報を聞いてください。' },
        { id: 'what', label: '何ができる？', text: '職長・従業員として、何ができますか？' },
        { id: 'setup', label: '最初に何する？', text: '最初に何をすればいいですか？' },
      ]
    }

    if (role === 'unassigned') {
      return [
        { id: 'what', label: '何ができる？', text: 'クラフディで何ができますか？' },
        { id: 'setup', label: '最初に何する？', text: '最初に何をすればいいですか？' },
      ]
    }

    return common
  })()

  const handleChipPress = (text: string) => {
    setInputText(text)
    setTimeout(() => {
      try {
        inputRef.current?.focus()
      } catch {}
    }, 0)
  }

  const emptyQuickActions: EmptyQuickAction[] = [
    {
      id: 'invoice',
      label: '請求書を作る',
      hint: '常用/応援 → 下書き作成',
      prompt: '請求書（常用・応援）の下書きを作りたいです。必要な情報を聞いてください。',
    },
    {
      id: 'estimate',
      label: '見積を作る',
      hint: '内訳たたき台 → 修正',
      prompt: '見積を作りたいです。必要な情報を聞いてください。',
    },
    {
      id: 'daily_report',
      label: '日報を入力',
      hint: '今日の作業を整理',
      prompt: '日報を入力したいです。今日の作業内容を整理したいです。',
    },
    {
      id: 'expense',
      label: '経費を登録',
      hint: '材料費/外注費もOK',
      prompt: '経費（材料費/外注費含む）を登録したいです。まず何を出せばいいですか？',
    },
  ]

  const selectProject = async (project: { id: string; name: string } | null) => {
    setSelectedProjectState(project)
    await setSelectedProject(project)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const ctx = await getAccessContext()
        setAccess(ctx)
      } catch {
        // ignore
      }

      try {
        if (!supabaseReady || !supabase) return
        const { data } = await supabase.auth.getUser()
        const name = String((data?.user as any)?.user_metadata?.full_name || '').trim()
        if (name) setDisplayName(name)
      } catch {
        // ignore
      }
    })()
  }, [])

  // 保存済みの現場を復元（初回起動/復帰用）
  useEffect(() => {
    if (selectedProject) return
    if (newProjectId || selectedProjectId) return

    ;(async () => {
      const saved = await getSelectedProject()
      if (saved?.id && saved?.name) {
        setSelectedProjectState({ id: saved.id, name: saved.name })
      }
    })()
  }, [selectedProject, newProjectId, selectedProjectId])

  // 選択された現場の反映（一覧から選んだ時）
  useEffect(() => {
    if (selectedProjectId && selectedProjectName) {
      selectProject({ id: selectedProjectId, name: selectedProjectName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, selectedProjectName])

  // 新規作成された現場の自動選択（作成直後の歓迎だけ出す）
  useEffect(() => {
    if (newProjectId && newProjectName) {
      selectProject({ id: newProjectId, name: newProjectName })

      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        text: `[${newProjectName}] を作成しました。続けて依頼を書いてください（例：日報/見積/請求書）。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, welcomeMessage])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newProjectId, newProjectName])

  const openProjectSelector = () => {
    router.push('/project-selector')
  }

  // 選択中の現場の詳細（住所/メモ）をロード
  useEffect(() => {
    if (!selectedProject?.id) {
      setSelectedProjectDetails(null)
      return
    }

    ;(async () => {
      const p = await getProjectById(selectedProject.id)
      setSelectedProjectDetails(p ? { address: p.address, memo: p.memo, revenue: p.revenue } : null)
    })()
  }, [selectedProject?.id])

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    const isFirstUserMessage = messages.every(m => m.sender !== 'user')

    const lastAiText = getLastAiText(messages)

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    scrollToBottom(10)
    setTimeout(() => inputRef.current?.focus(), 20)

    // 経費なし（最小導線）: 直前に保存した日報を「経費なし確認済み」にする
    const isNoExpense = /(経費なし|今日は経費なし|本日経費なし|経費はない)/.test(trimmed)
    if (isNoExpense && lastDraftTarget?.type === 'daily_report') {
      ;(async () => {
        await markDailyReportNoExpense(lastDraftTarget.id)
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。日報を経費なしで確認済みにしました。`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        setLastDraftTarget(null)
      })()
      return
    }

    // 確認依頼（最小導線）: 直前に保存した draft を submitted にする
    const isSubmitRequest = /(確認依頼|提出|確認お願いします|代表確認)/.test(trimmed)
    if (isSubmitRequest && lastDraftTarget) {
      ;(async () => {
        if (lastDraftTarget.type === 'daily_report') {
          await submitDailyReport(lastDraftTarget.id)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `OKです。日報を確認依頼にしました。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        } else {
          await submitExpense(lastDraftTarget.id)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `OKです。経費を確認依頼にしました。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        }
        setLastDraftTarget(null)
      })()
      return
    }

    const guideReply = (() => {
      const role = access?.kind === 'assigned' ? access.role : 'unassigned'

      const isWhat = /(何ができる|できること|使い方)/.test(trimmed)
      const isSetup = /(最初に.*設定|初期.*設定|最初に何を|何から始める)/.test(trimmed)
      const isProjectCheck = /(担当.*現場|現場.*確認|現場を確認)/.test(trimmed)

      if (isWhat) {
        if (role === 'member') {
          return [
            'クラフディ（職長・従業員）でできることは主に3つです。',
            '1. 日報を書く',
            '2. 経費を入れる',
            '3. 担当現場の履歴を見る',
            '',
            '次は「日報を入力したい」または「経費を登録したい」と送ってください。',
          ].join('\n')
        }

        return [
          'クラフディでできることは主に4つです。',
          '1. 日報を入力',
          '2. 経費を登録',
          '3. 見積を作る',
          '4. 請求書（常用・応援）の下書きを作る',
          '',
          '次は「現場を作りたい」または「日報を入力したい」と送ってください。',
        ].join('\n')
      }

      if (isSetup) {
        if (role === 'member') {
          return [
            '最初はこの順がおすすめです。',
            '1. 担当現場を確認 / 選ぶ',
            '2. main-chat で日報・経費を入力',
            '',
            '次は「担当の現場を確認したい」と送ってください。',
          ].join('\n')
        }

        return [
          '最初はこの順がおすすめです。',
          '1. 会社情報を設定（請求/見積）',
          '2. 現場を作る / 選ぶ',
          '3. main-chat で日報・経費などを入力',
          '',
          '次は「会社情報を設定したい」または「現場を作りたい」と送ってください。',
        ].join('\n')
      }

      if (isProjectCheck && role === 'member') {
        return [
          'OKです。担当の現場は「現場を選ぶ」から確認できます。',
          '',
          '次は左上メニュー →「現場を選ぶ」を押すか、ここに「現場を選びたい」と送ってください。',
        ].join('\n')
      }

      return null
    })()

    if (guideReply) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: guideReply,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      return
    }

    // 常用・応援の請求候補（下書き作成）
    const supportBillingCmd = parseSupportBillingDraftCommand(trimmed)
    if (supportBillingCmd) {
      ;(async () => {
        const now = new Date()
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const reports = await listDailyReports()
        const targets = reports.filter(r => {
          if (!r?.date || !String(r.date).startsWith(ym)) return false
          if (r?.reportKind !== 'support') return false
          const name = String(r?.supportCompanyName || '').trim()
          return name === supportBillingCmd.companyName
        })

        if (targets.length === 0) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `今月の${supportBillingCmd.companyName}の常用・応援データがありません。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        let reportCount = 0
        let jyouyouWorkersTotal = 0
        let ouenWorkersTotal = 0

        for (const r of targets) {
          const supportType = r?.supportType
          if (supportType !== 'jyouyou' && supportType !== 'ouen') continue

          const self = Number.isFinite(r?.selfWorkersCount) ? (r.selfWorkersCount as number) : 0
          const workers = Math.max(0, Math.floor(self))

          reportCount += 1
          if (supportType === 'jyouyou') jyouyouWorkersTotal += workers
          else ouenWorkersTotal += workers
        }

        const rates = await listSupportRates()
        const rate = rates.find(r => r.companyName.trim() === supportBillingCmd.companyName)

        const jRate = typeof rate?.jyouyouDailyRate === 'number' ? rate.jyouyouDailyRate : undefined
        const oRate = typeof rate?.ouenDailyRate === 'number' ? rate.ouenDailyRate : undefined

        const candidateTotal =
          (jRate ? jyouyouWorkersTotal * jRate : 0) +
          (oRate ? ouenWorkersTotal * oRate : 0)

        const saved = await createOrReplaceSupportBillingDraft({
          companyName: supportBillingCmd.companyName,
          ym,
          reportCount,
          jyouyouWorkersTotal,
          ouenWorkersTotal,
          jyouyouDailyRate: jRate,
          ouenDailyRate: oRate,
          candidateTotal,
        })

        const rateMissing = !jRate && !oRate

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: rateMissing
            ? `OKです。${saved.companyName}の今月請求候補を作成しました。単価未設定のため候補金額は0円です。`
            : `OKです。${saved.companyName}の今月請求候補を作成しました。常用${saved.jyouyouWorkersTotal}人工 / 応援${saved.ouenWorkersTotal}人工 / 候補¥${saved.candidateTotal.toLocaleString('ja-JP')}です。`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 常用・応援の請求書下書き（billing draft → invoice draft）
    const supportInvoiceCmd = parseSupportInvoiceDraftCommand(trimmed)
    if (supportInvoiceCmd) {
      ;(async () => {
        const now = new Date()
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const drafts = await listSupportBillingDrafts()
        const billing = drafts.find(d => d.companyName.trim() === supportInvoiceCmd.companyName && d.ym.trim() === ym)

        if (!billing) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `先に${supportInvoiceCmd.companyName}の今月請求候補を作成してください。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        const lines: {
          label: string
          quantity: number
          unitPrice: number
          amount: number
        }[] = []

        if (
          billing.jyouyouWorkersTotal > 0 &&
          typeof billing.jyouyouDailyRate === 'number' &&
          billing.jyouyouDailyRate > 0
        ) {
          const quantity = billing.jyouyouWorkersTotal
          const unitPrice = billing.jyouyouDailyRate
          lines.push({ label: '常用', quantity, unitPrice, amount: quantity * unitPrice })
        }

        if (billing.ouenWorkersTotal > 0 && typeof billing.ouenDailyRate === 'number' && billing.ouenDailyRate > 0) {
          const quantity = billing.ouenWorkersTotal
          const unitPrice = billing.ouenDailyRate
          lines.push({ label: '応援', quantity, unitPrice, amount: quantity * unitPrice })
        }

        if (lines.length === 0) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: '単価未設定のため、請求書下書きの明細を作れませんでした。先に単価を登録してください。',
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
        const title = `${billing.companyName} ${billing.ym} 請求書下書き`

        const saved = await createOrReplaceSupportInvoiceDraft({
          companyName: billing.companyName,
          ym: billing.ym,
          title,
          lines,
          subtotal,
        })

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。${saved.companyName}の今月請求書下書きを作りました（小計¥${saved.subtotal.toLocaleString('ja-JP')}）。\n確認するなら左上メニュー → 請求書下書きへ。`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 常用・応援の単価登録（最小導線）
    const supportRateReg = parseSupportRateRegistration(trimmed)
    if (supportRateReg) {
      ;(async () => {
        const saved = await upsertSupportRate({
          companyName: supportRateReg.companyName,
          jyouyouDailyRate: supportRateReg.jyouyouDailyRate,
          ouenDailyRate: supportRateReg.ouenDailyRate,
        })

        const parts: string[] = []
        if (typeof supportRateReg.jyouyouDailyRate === 'number') {
          parts.push(`常用単価を${supportRateReg.jyouyouDailyRate.toLocaleString('ja-JP')}円`)
        }
        if (typeof supportRateReg.ouenDailyRate === 'number') {
          parts.push(`応援単価を${supportRateReg.ouenDailyRate.toLocaleString('ja-JP')}円`)
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。${saved.companyName}の${parts.join(' / ')}で登録しました。`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 協力会社登録（最小導線）
    // NOTE: 将来日報の partnerWorkers を partnerCompanyIds に紐付ける前提の土台（今回は登録のみ）。
    const partnerReg = parsePartnerCompanyRegistration(trimmed)
    if (partnerReg) {
      ;(async () => {
        const existing = await findPartnerCompanyByName(partnerReg.name)
        const company =
          existing ||
          (await createPartnerCompany({ name: partnerReg.name, workerDailyRate: partnerReg.workerDailyRate }))

        const rateText = company.workerDailyRate
          ? `（人工単価¥${company.workerDailyRate.toLocaleString('ja-JP')}）`
          : ''
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。${company.name}を協力会社登録しました。${rateText}`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 職人登録（最小導線）
    // NOTE: 将来日報に workerIds/workerNames を紐付ける前提の土台（今回は登録のみ）。
    const workerReg = parseWorkerRegistration(trimmed)
    if (workerReg) {
      ;(async () => {
        const existing = await findWorkerByName(workerReg.name)
        const worker = existing || (await createWorker({ name: workerReg.name, dailyRate: workerReg.dailyRate }))

        const rateText = worker.dailyRate ? `（日当¥${worker.dailyRate.toLocaleString('ja-JP')}）` : ''
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。${worker.name}さんを職人登録しました。${rateText}`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 現場の売上（見込み売上）更新: 選択中の現場がある時だけ
    if (selectedProject?.id) {
      const isRevenueKeyword = /(売上|売り上げ|請負金額|受注金額|見込み売上)/.test(trimmed)
      if (isRevenueKeyword) {
        const amount = parseRevenueAmount(trimmed)
        if (amount) {
          ;(async () => {
            const updated = await updateProject({ id: selectedProject.id, revenue: amount })
            if (!updated) {
              const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: `更新に失敗しました（現場が見つかりません）。右上「現場」から選び直してください。`,
                sender: 'ai',
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, aiMessage])
              return
            }

            setSelectedProjectDetails(prev => ({ ...prev, revenue: updated.revenue }))

            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `OK。[${selectedProject.name}] の売上を ¥${amount.toLocaleString('ja-JP')} に設定しました。`,
              sender: 'ai',
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
          })()
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `売上の金額が分かりませんでした。例：「この現場の売上は80万円」「請負金額1200000円で」`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }
    }

    // 高速代 / ETC（テキスト経費）: 選択中の現場がある時だけ最小で保存
    const toll = parseTollExpense(trimmed)
    if (toll) {
      if (!selectedProject?.id) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: '経費を登録するには、先に現場を選んでください（右上「現場」）。',
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      const date = parseExpenseDate(trimmed) ?? toYmd(new Date())

      ;(async () => {
        await createExpense({
          projectId: selectedProject.id,
          kind: 'expense',
          amount: toll.totalAmount,
          memo: trimmed,
          date,
        })

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `OKです。${toll.label} ¥${toll.totalAmount.toLocaleString('ja-JP')} を記録しました。`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
      })()
      return
    }

    // 常用・応援（日報）: support 日報として保存（最小導線）
    // NOTE: 選択中の現場があっても「常用/応援」ワードがあれば support を優先。
    const supportMeta = parseSupportDailyReportMeta(trimmed) || supportDailyReportMeta
    if (supportMeta) {
      const date = parseExpenseDate(trimmed)
      const work = parseDailyReportWork(trimmed)
      const workforceTime = parseDailyReportWorkforceTime(trimmed)
      const nextPlan = parseDailyReportNextPlan(trimmed)
      const selfWorkersCount = parseDailyReportSelfWorkersCount(trimmed)
      const partnerWorkers = parseDailyReportPartnerWorkers(trimmed)

      const isDailyReportLike =
        isDailyReportIntake ||
        /(日報)/.test(trimmed) ||
        /(応援|常用)/.test(trimmed) ||
        !!work ||
        !!workforceTime ||
        !!nextPlan ||
        /(今日|昨日|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(trimmed)

      // 会社名が取れなければ無理に support にしない
      if (!supportMeta.companyName) {
        setSupportDailyReportMeta(null)
      } else if (isDailyReportLike) {
        setSupportDailyReportMeta(supportMeta)

        const merged: DailyReportDraft = {
          date: date ?? dailyReportDraft.date,
          work: work ?? dailyReportDraft.work,
          workforceTime: workforceTime ?? dailyReportDraft.workforceTime,
          nextPlan: nextPlan ?? dailyReportDraft.nextPlan,
          selfWorkersCount: selfWorkersCount ?? dailyReportDraft.selfWorkersCount,
          partnerWorkers: partnerWorkers.length ? partnerWorkers : dailyReportDraft.partnerWorkers,
        }

        const normalized: DailyReportDraft = {
          date: merged.date ?? toYmd(new Date()),
          work: merged.work,
          workforceTime: merged.workforceTime,
          nextPlan: merged.nextPlan,
          selfWorkersCount: merged.selfWorkersCount,
          partnerWorkers: merged.partnerWorkers,
        }

        if (!normalized.work) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `作業内容を教えてください（例：応援作業 / 配管交換 / 塗装 など）。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        if (!normalized.workforceTime) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `人数/作業時間は？（例：2人 / 8h / 半日 / 終日）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        if (ASK_NEXT_PLAN_IN_MVP && !normalized.nextPlan) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `明日の予定は？（例：続き / 片付け / 移動 など）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        ;(async () => {
          const staffText = [trimmed, normalized.work || '', normalized.nextPlan || ''].join(' ')
          const selfStaff = await extractSelfWorkersFromText(staffText)

          const inferredSelfCount =
            typeof normalized.selfWorkersCount === 'number'
              ? normalized.selfWorkersCount
              : selfStaff.names.length > 0
                ? selfStaff.names.length
                : undefined

          const companies = await listPartnerCompanies()
          const companyIdByName = new Map(companies.map(c => [c.name.trim(), c.id]))

          const partnerWorkers = (normalized.partnerWorkers || []).map(p => ({
            ...p,
            partnerCompanyId: companyIdByName.get((p.companyName || '').trim()),
          }))

          // NOTE: daily-report-store の現行仕様上 projectId が必須。
          // support 日報は将来、専用の projectId 扱いに移行する想定だが、今回は main-chat 側だけで安全に通すため空文字で保存する。
          const saved = await createDailyReport({
            projectId: '',
            date: normalized.date!,
            work: normalized.work!,
            workforceTime: normalized.workforceTime!,
            nextPlan: normalized.nextPlan ?? '',
            selfWorkersCount: inferredSelfCount,
            partnerWorkers,
            selfWorkerIds: selfStaff.ids,
            selfWorkerNames: selfStaff.names,
            reportKind: 'support',
            supportCompanyName: supportMeta.companyName,
            supportType: supportMeta.supportType,
          })

          setDailyReportDraft(defaultDailyReportDraft)
          setIsDailyReportIntake(false)
          setSupportDailyReportMeta(null)

          setLastDraftTarget({
            type: 'daily_report',
            id: saved.id,
            projectName: `${supportMeta.companyName}（${supportMeta.supportType === 'ouen' ? '応援' : '常用'}）`,
          })

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `保存しました。${supportMeta.companyName}の${supportMeta.supportType === 'ouen' ? '応援' : '常用'}日報です。\n次：今月分の請求書下書きを作る/確認するなら左上メニュー → 請求書下書きへ。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        })()
        return
      }
    }

    // 日報登録（現場に紐づけて保存）: 選択中の現場がある時だけ
    if (selectedProject?.id) {
      const date = parseExpenseDate(trimmed)
      const work = parseDailyReportWork(trimmed)
      const workforceTime = parseDailyReportWorkforceTime(trimmed)
      const nextPlan = parseDailyReportNextPlan(trimmed)
      const selfWorkersCount = parseDailyReportSelfWorkersCount(trimmed)
      const partnerWorkers = parseDailyReportPartnerWorkers(trimmed)

      const isDailyReportLike =
        isDailyReportIntake ||
        /(日報)/.test(trimmed) ||
        !!work ||
        !!workforceTime ||
        !!nextPlan ||
        /(今日|昨日|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日)/.test(trimmed)

      if (isDailyReportLike) {
        const merged: DailyReportDraft = {
          date: date ?? dailyReportDraft.date,
          work: work ?? dailyReportDraft.work,
          workforceTime: workforceTime ?? dailyReportDraft.workforceTime,
          nextPlan: nextPlan ?? dailyReportDraft.nextPlan,
          selfWorkersCount: selfWorkersCount ?? dailyReportDraft.selfWorkersCount,
          partnerWorkers: partnerWorkers.length ? partnerWorkers : dailyReportDraft.partnerWorkers,
        }

        const normalized: DailyReportDraft = {
          date: merged.date ?? toYmd(new Date()),
          work: merged.work,
          workforceTime: merged.workforceTime,
          nextPlan: merged.nextPlan,
          selfWorkersCount: merged.selfWorkersCount,
          partnerWorkers: merged.partnerWorkers,
        }

        if (!normalized.work) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `今日の作業内容を教えてください（例：配管交換 / 塗装 / 防水など）。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        if (!normalized.workforceTime) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `人数/作業時間は？（例：2人 / 8h / 半日 / 終日）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        if (ASK_NEXT_PLAN_IN_MVP && !normalized.nextPlan) {
          setDailyReportDraft(normalized)
          setIsDailyReportIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `明日の予定は？（例：続き / 配管試験 / 材料搬入 など）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        ;(async () => {
          const staffText = [trimmed, normalized.work || '', normalized.nextPlan || ''].join(' ')
          const selfStaff = await extractSelfWorkersFromText(staffText)

          const inferredSelfCount =
            typeof normalized.selfWorkersCount === 'number'
              ? normalized.selfWorkersCount
              : selfStaff.names.length > 0
                ? selfStaff.names.length
                : undefined

          const companies = await listPartnerCompanies()
          const companyIdByName = new Map(companies.map(c => [c.name.trim(), c.id]))

          const partnerWorkers = (normalized.partnerWorkers || []).map(p => ({
            ...p,
            partnerCompanyId: companyIdByName.get((p.companyName || '').trim()),
          }))

          const saved = await createDailyReport({
            projectId: selectedProject.id,
            date: normalized.date!,
            work: normalized.work!,
            workforceTime: normalized.workforceTime!,
            nextPlan: normalized.nextPlan ?? '',
            selfWorkersCount: inferredSelfCount,
            partnerWorkers,
            selfWorkerIds: selfStaff.ids,
            selfWorkerNames: selfStaff.names,
          })

          setDailyReportDraft(defaultDailyReportDraft)
          setIsDailyReportIntake(false)

          setLastDraftTarget({ type: 'daily_report', id: saved.id, projectName: selectedProject.name })

          const demenText = (() => {
            const parts: string[] = []
            if (typeof saved.selfWorkersCount === 'number') parts.push(`自社${saved.selfWorkersCount}人`)
            for (const p of saved.partnerWorkers || []) {
              if (p.companyName && p.workersCount > 0) parts.push(`${p.companyName}${p.workersCount}人`)
            }
            return parts.length ? `出面: ${parts.join(' / ')}` : ''
          })()

          const selfStaffText = (() => {
            const names = (saved.selfWorkerNames || []).filter(Boolean)
            return names.length ? `担当: ${names.slice(0, 5).join(' / ')}` : ''
          })()

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `保存しました。[${selectedProject.name}] ${saved.date} の日報です。${demenText ? `\n${demenText}` : ''}${selfStaffText ? `\n${selfStaffText}` : ''}\n\n👉 次：経費が無ければ「経費なし」。続けて入れるならそのまま経費を送ってOK。\n（確認依頼なら「確認依頼」）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        })()
        return
      }
    }

    // 経費登録（現場に紐づけて保存）: 選択中の現場がある時だけ
    if (selectedProject?.id) {
      const kind = parseExpenseKind(trimmed)
      const amount = parseExpenseAmount(trimmed)
      const date = parseExpenseDate(trimmed)
      const memo = stripExpenseKeywords(trimmed)

      const isExpenseLike =
        isExpenseIntake ||
        !!kind ||
        /\b¥|￥|円\b/.test(trimmed) ||
        /(レシート|領収書|材料|外注|経費)/.test(trimmed)

      if (isExpenseLike) {
        const merged: ExpenseDraft = {
          kind: kind ?? expenseDraft.kind,
          amount: amount ?? expenseDraft.amount,
          date: date ?? expenseDraft.date,
          memo: memo || expenseDraft.memo,
        }

        const normalized: ExpenseDraft = {
          kind: merged.kind,
          amount: merged.amount,
          date: merged.date ?? toYmd(new Date()),
          memo: merged.memo ?? '',
        }

        // 不足があれば最小で1つだけ聞く
        if (!normalized.amount) {
          setExpenseDraft(normalized)
          setIsExpenseIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `金額はいくらですか？（例：¥1200）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        if (!normalized.kind) {
          setExpenseDraft(normalized)
          setIsExpenseIntake(true)
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `種別はどれですか？（レシート / 材料 / 外注 / 経費）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        // memoが空でも保存は許可（最小）
        const savedMemo = normalized.memo || '（メモなし）'

        ;(async () => {
          const saved = await createExpense({
            projectId: selectedProject.id,
            kind: normalized.kind!,
            amount: normalized.amount!,
            memo: savedMemo,
            date: normalized.date!,
          })

          setExpenseDraft(defaultExpenseDraft)
          setIsExpenseIntake(false)

          const kindLabel =
            saved.kind === 'receipt'
              ? 'レシート'
              : saved.kind === 'material'
                ? '材料'
                : saved.kind === 'subcontract'
                  ? '外注'
                  : '経費'

          setLastDraftTarget({ type: 'expense', id: saved.id, projectName: selectedProject.name })

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `保存しました。[${selectedProject.name}] ${kindLabel} ¥${saved.amount.toLocaleString('ja-JP')}。\n\n👉 次：続けて別の経費も入力できます。\n（確認依頼なら「確認依頼」）`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        })()
        return
      }
    }

    // 現場の住所/メモ更新（チャット編集）: 選択中の現場がある時だけ
    if (selectedProject?.id && (/(住所)/.test(trimmed) || /(メモ)/.test(trimmed))) {
      const nextAddress = (() => {
        if (!/(住所)/.test(trimmed)) return undefined
        const m = trimmed.match(/住所(?:を|は)?\s*(?:.*?)(?:変更|更新|修正|に|：|:)?\s*([^\n]+)$/)
        return (m?.[1] || '').trim() || undefined
      })()

      const nextMemo = (() => {
        if (!/(メモ)/.test(trimmed)) return undefined
        const m = trimmed.match(/メモ(?:に|を|は)?\s*(?:.*?)(?:追記|追加|変更|更新|修正|：|:)?\s*([^\n]+)$/)
        return (m?.[1] || '').trim() || undefined
      })()

      if (nextAddress || nextMemo) {
        ;(async () => {
          const updated = await updateProject({
            id: selectedProject.id,
            address: nextAddress,
            memo: nextMemo,
          })

          if (!updated) {
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `更新に失敗しました（現場が見つかりません）。右上「現場」から選び直してください。`,
              sender: 'ai',
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])
            return
          }

          setSelectedProjectDetails({ address: updated.address, memo: updated.memo })

          const updatedFields: string[] = []
          if (nextAddress) updatedFields.push('住所')
          if (nextMemo) updatedFields.push('メモ')

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `OK。[${selectedProject.name}] の${updatedFields.join(' / ')}を更新しました。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
        })()
        return
      }
    }

    // 見積の最終確認サマリ後だけ、生成/修正指示に反応する（最小実装）
    if (!currentIntent && lastAiText?.startsWith('最終確認（見積）')) {
      // 生成指示（例:「この内容で作って」「見積たたき台出して」）
      if (isEstimateGenerateInstruction(trimmed)) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildEstimateDraftMessage(
            buildEstimateDraftData({
              phase1: estimateCollected,
              phase1Values: estimatePhase1Values,
              phase2Values: estimatePhase2Values,
              overrides: estimateOverrides,
              selectedProjectName: selectedProject?.name,
            })
          ),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      // 修正指示（項目名指定）
      const edits = parseEstimateEditInstruction(trimmed)
      const keys = Object.keys(edits) as (keyof EstimateOverrides)[]
      const hasEdits = keys.some(k => !!edits[k])

      if (hasEdits) {
        const nextOverrides: EstimateOverrides = { ...estimateOverrides, ...edits }
        setEstimateOverrides(nextOverrides)

        if (edits.dueDate) {
          setEstimateCollected(prev => ({ ...prev, dueDateConfirmed: true }))
          setEstimatePhase1Values(prev => ({ ...prev, dueDate: edits.dueDate }))
        }
        if (edits.quantityUnit) {
          setEstimateCollected(prev => ({ ...prev, quantityUnitConfirmed: true }))
          setEstimatePhase1Values(prev => ({ ...prev, quantityUnit: edits.quantityUnit }))
        }
        if (edits.client) {
          setEstimatePhase2Collected(prev => ({ ...prev, clientConfirmed: true }))
          setEstimatePhase2Values(prev => ({ ...prev, client: edits.client }))
        }
        if (edits.pricingPolicy) {
          setEstimatePhase2Collected(prev => ({ ...prev, pricingPolicyConfirmed: true }))
          setEstimatePhase2Values(prev => ({ ...prev, pricingPolicy: edits.pricingPolicy }))
        }
        if (edits.margin) {
          setEstimatePhase2Collected(prev => ({ ...prev, marginConfirmed: true }))
          setEstimatePhase2Values(prev => ({ ...prev, margin: edits.margin }))
        }

        const updated = keys
          .filter(k => !!edits[k])
          .map(k => {
            if (k === 'client') return '元請け/顧客名'
            if (k === 'pricingPolicy') return '価格方針'
            if (k === 'margin') return '希望粗利率'
            if (k === 'dueDate') return '希望納期'
            if (k === 'quantityUnit') return '数量/単位'
            return k
          })

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `了解。以下を反映しました：${updated.join(' / ')}\n\n${buildEstimateFinalSummary({
            phase1: estimateCollected,
            phase2: estimatePhase2Collected,
            phase2Values: estimatePhase2Values,
            overrides: nextOverrides,
            selectedProjectName: selectedProject?.name,
          })}`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }
    }

    // 初回依頼（＋現場未選択）で、目的が言えているなら intent を保持して一段深く聞く
    if (!selectedProject && isFirstUserMessage) {
      const category = classifyIntentCategory(trimmed)
      if (category) {
        setCurrentIntent(category)
        setIntentStep(0)
        setExpenseCollected(defaultExpenseCollected)
        setEstimateCollected(defaultEstimateCollected)
        setEstimatePhase1Values(defaultEstimatePhase1Values)
        setEstimatePhase(1)
        setEstimatePhase2Collected(defaultEstimatePhase2Collected)
        setEstimatePhase2Values(defaultEstimatePhase2Values)
        setEstimateOverrides(defaultEstimateOverrides)
        setDailyReportCollected(defaultDailyReportCollected)
        setInvoiceCollected(defaultInvoiceCollected)

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFirstAiReply(category),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '現場は未選択のままでもOKです。まず何を作る？（請求書 / 見積 / 日報 / 経費）',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      return
    }

    // intent がある場合、2通目以降は intent 前提で次に必要な情報を聞く
    if (currentIntent) {
      if (currentIntent === 'expense') {
        const nextCollected = extractExpenseCollected(trimmed, expenseCollected)
        setExpenseCollected(nextCollected)

        // 次に聞くべき「未確認」項目を探す（未確認が無ければ完了）
        const flags = [
          nextCollected.receiptConfirmed,
          nextCollected.whenWhereWhatConfirmed,
          nextCollected.amountConfirmed,
          nextCollected.paymentMethodConfirmed,
        ]
        const nextIndex = flags.findIndex(v => !v)

        if (nextIndex === -1) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `${buildProgressSummary('expense', 0, nextCollected, undefined, undefined, undefined)}\n\n✅ そろいました。保存します。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          setCurrentIntent(null)
          setIntentStep(0)
          setExpenseCollected(defaultExpenseCollected)
          setDailyReportCollected(defaultDailyReportCollected)
          setInvoiceCollected(defaultInvoiceCollected)
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFollowupAiReply('expense', nextIndex, selectedProject?.name, nextCollected, undefined, undefined, undefined),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      if (currentIntent === 'invoice') {
        const nextCollected = extractInvoiceCollected(trimmed, invoiceCollected)
        setInvoiceCollected(nextCollected)

        const flags = [
          nextCollected.clientConfirmed,
          nextCollected.billingTargetConfirmed,
          nextCollected.amountConfirmed,
          nextCollected.dueDateConfirmed,
        ]
        const nextIndex = flags.findIndex(v => !v)

        if (nextIndex === -1) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `${buildProgressSummary('invoice', 0, undefined, undefined, undefined, nextCollected)}\n\n✅ そろいました。下書きを作ります。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          setCurrentIntent(null)
          setIntentStep(0)
          setInvoiceCollected(defaultInvoiceCollected)
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFollowupAiReply('invoice', nextIndex, selectedProject?.name, undefined, undefined, undefined, nextCollected),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      if (currentIntent === 'daily_report') {
        const nextCollected = extractDailyReportCollected(trimmed, dailyReportCollected)
        setDailyReportCollected(nextCollected)

        const flags = [
          nextCollected.dateConfirmed,
          nextCollected.workConfirmed,
          nextCollected.workforceTimeConfirmed,
          nextCollected.nextPlanConfirmed,
        ]
        const nextIndex = flags.findIndex(v => !v)

        if (nextIndex === -1) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: `${buildProgressSummary('daily_report', 0, undefined, undefined, nextCollected, undefined)}\n\n✅ そろいました。保存します。`,
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          setCurrentIntent(null)
          setIntentStep(0)
          setDailyReportCollected(defaultDailyReportCollected)
          setInvoiceCollected(defaultInvoiceCollected)
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: buildFollowupAiReply('daily_report', nextIndex, selectedProject?.name, undefined, undefined, nextCollected, undefined),
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      if (currentIntent === 'estimate') {
        // Phase 1: 見積の土台（4項目）
        if (estimatePhase === 1) {
          const nextCollected = extractEstimateCollected(trimmed, estimateCollected)
          setEstimateCollected(nextCollected)

          const nextValues = extractEstimatePhase1Values(trimmed, estimatePhase1Values)
          setEstimatePhase1Values(nextValues)

          const flags = [
            nextCollected.workConfirmed,
            nextCollected.quantityUnitConfirmed,
            nextCollected.dueDateConfirmed,
            nextCollected.locationConfirmed,
          ]
          const nextIndex = flags.findIndex(v => !v)

          if (nextIndex === -1) {
            const projectNote = selectedProject?.name
              ? `（現場: ${selectedProject.name}）`
              : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `${buildProgressSummary('estimate', 0, undefined, nextCollected, undefined, undefined)}\n\n✅ 土台できました。\n\n👉 元請け/顧客名は？\n${projectNote}`,
              sender: 'ai',
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, aiMessage])

            // Phase 2へ移行（intentは維持）
            setEstimatePhase(2)
            setEstimatePhase2Collected(defaultEstimatePhase2Collected)
            setEstimatePhase2Values(defaultEstimatePhase2Values)
            setEstimateOverrides(defaultEstimateOverrides)
            return
          }

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: buildFollowupAiReply('estimate', nextIndex, selectedProject?.name, undefined, nextCollected, undefined, undefined),
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])
          return
        }

        // Phase 2: 元請け/価格方針/粗利率
        const nextCollected = extractEstimatePhase2Collected(trimmed, estimatePhase2Collected)
        setEstimatePhase2Collected(nextCollected)

        const nextValues = extractEstimatePhase2Values(trimmed, estimatePhase2Values)
        setEstimatePhase2Values(nextValues)

        const flags = [
          nextCollected.clientConfirmed,
          nextCollected.pricingPolicyConfirmed,
          nextCollected.marginConfirmed,
        ]
        const nextIndex = flags.findIndex(v => !v)

        if (nextIndex === -1) {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: buildEstimateFinalSummary({
              phase1: estimateCollected,
              phase2: nextCollected,
              phase2Values: nextValues,
              overrides: estimateOverrides,
              selectedProjectName: selectedProject?.name,
            }),
            sender: 'ai',
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, aiMessage])

          setCurrentIntent(null)
          setIntentStep(0)
          // NOTE: 最終確認サマリ後の修正指示に使うため、見積の収集状態は保持する
          setEstimatePhase(1)
          return
        }

        const questions = [
          '元請け/顧客名は？',
          '価格方針は？（攻め / 標準 / 慎重）',
          '希望粗利率（%）は？',
        ]
        const projectNote = selectedProject?.name
          ? `（現場: ${selectedProject.name}）`
          : '（現場: 未選択。必要なら右上の「現場」から選択/作成できます）'

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `${questions[nextIndex]}\n${projectNote}`,
          sender: 'ai',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMessage])
        return
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: buildFollowupAiReply(currentIntent, intentStep, selectedProject?.name, undefined, undefined, undefined, undefined),
        sender: 'ai',
        timestamp: new Date(),
      }

      const isLastQuestion = intentStep >= getIntentQuestionCount(currentIntent) - 1
      if (isLastQuestion) {
        setCurrentIntent(null)
        setIntentStep(0)
      } else {
        setIntentStep(prev => prev + 1)
      }

      setMessages(prev => [...prev, aiMessage])
      return
    }

    // ダミーAI応答
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `[${selectedProject.name}] のメモを受け取りました。この内容を基に見積や請求の作成をサポートします。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
    }, 500)
  }

  useEffect(() => {
    // NOTE: 送信後/AI返答後に自然に最下部へ（タイミングずれ対策で少し遅延）
    if (messages.length > 0) scrollToBottom(30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  const canSend = !!inputText.trim()
  const isEmpty = messages.length === 0
  const menuRole = access?.kind === 'assigned' ? access.role : 'unassigned'

  const systemScheme = useColorScheme()
  const resolvedScheme: ColorScheme =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode
  const theme = getThemeColors(resolvedScheme)

  const handleProjectButton = () => {
    openProjectSelector()
  }

  const closeMenu = () => setIsMenuOpen(false)

  const stubMenu = (title: string) => { closeMenu(); Alert.alert(title, 'このメニューは次のPRで接続予定です。') }

  const handleLogout = async () => { closeMenu(); try { if (supabaseReady && supabase) await supabase.auth.signOut() } catch { /* ignore */ }; router.replace('/(auth)/auth-screen' as any) }

  const openPlusSheet = () => setIsPlusSheetOpen(true)
  const closePlusSheet = () => setIsPlusSheetOpen(false)

  const openThemeSheet = () => {
    closeMenu()
    setIsThemeSheetOpen(true)
  }
  const closeThemeSheet = () => setIsThemeSheetOpen(false)
  const applyThemeMode = (next: 'light' | 'dark' | 'system') => {
    setThemeMode(next)
    closeThemeSheet()
  }
  const handlePlusAction = (kind: 'photo' | 'camera' | 'file' | 'receipt') => {
    closePlusSheet()

    const title =
      kind === 'photo'
        ? '写真を追加'
        : kind === 'camera'
          ? 'カメラで撮る'
          : kind === 'file'
            ? 'ファイルを添付'
            : 'レシートを追加'

    // 最小安全実装: まずUIと導線だけ作り、実処理は次PRで接続
    Alert.alert(title, 'この操作は次のPRで接続予定です。')
  }

  const navigateFromMenu = (path: string) => {
    closeMenu()
    router.push(path as any)
  }

  const handleEmptyQuickAction = (action: EmptyQuickAction) => {
    setInputText(action.prompt)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background.primary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* ヘッダー（Figma寄せ: 左メニュー / 中央タイトル / 右上 現場） */}
        <View style={[styles.header, { backgroundColor: theme.background.primary, borderBottomColor: theme.border.light }]}>
          <TouchableOpacity style={styles.headerMenuButton} onPress={() => setIsMenuOpen(true)}>
            <Text style={[styles.headerMenuButtonText, { color: theme.text.primary }]}>≡</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Crafdy</Text>
          </View>

          <TouchableOpacity style={styles.headerProjectButton} onPress={handleProjectButton}>
            <Text style={[styles.headerProjectButtonText, { color: theme.text.primary }]}>{selectedProject ? '現場切替' : '現場を選ぶ'}</Text>
          </TouchableOpacity>
        </View>

        {/* Drawer menu（低頻度ナビゲーション） */}
        <Modal
          visible={isMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <Pressable style={styles.menuOverlay} onPress={closeMenu}>
            <Pressable style={[styles.menuPanel, { backgroundColor: theme.background.primary, borderRightColor: theme.border.light }]} onPress={() => { /* stop propagation */ }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                <Text style={[styles.menuTitle, { color: theme.text.primary }]}>メニュー</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={closeMenu} accessibilityLabel="閉じる">
                  <Text style={[styles.menuCloseIcon, { color: theme.text.secondary }]}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.menuSectionTitle, { color: theme.text.tertiary }]}>現在の現場</Text>
              <View style={styles.menuItems}>
                <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.background.surface, borderColor: theme.border.medium }]} onPress={handleProjectButton}>
                  <Text style={[styles.menuItemText, { color: theme.text.primary }]}>{selectedProject?.name || '未選択（現場を選ぶ）'}</Text>
                </TouchableOpacity>
              </View>

              {menuRole === 'member' ? (
                <>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>仕事</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/(tabs)/dashboard')}><Text style={styles.menuItemText}>ダッシュボード</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/project-selector')}><Text style={styles.menuItemText}>現場一覧 / 切り替え</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>その他</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('アカウント')}><Text style={styles.menuItemText}>アカウント</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('ヘルプ')}><Text style={styles.menuItemText}>ヘルプ</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Text style={styles.menuItemText}>ログアウト</Text></TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : menuRole === 'unassigned' ? (
                <>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>はじめに</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/join/by-code')}><Text style={styles.menuItemText}>招待コードで参加</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>その他</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('ヘルプ')}><Text style={styles.menuItemText}>ヘルプ</Text></TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>仕事</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/(tabs)/dashboard')}><Text style={styles.menuItemText}>ダッシュボード</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/project-selector')}><Text style={styles.menuItemText}>現場一覧 / 切り替え</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/invoice')}><Text style={styles.menuItemText}>請求書履歴</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('見積履歴')}><Text style={styles.menuItemText}>見積履歴</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>チーム</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('メンバーを招待')}><Text style={styles.menuItemText}>メンバーを招待</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>設定</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/company-billing-profile')}><Text style={styles.menuItemText}>会社情報</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/invoice-templates')}><Text style={styles.menuItemText}>請求書テンプレ</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => navigateFromMenu('/billing')}><Text style={styles.menuItemText}>契約・プラン</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={openThemeSheet}><Text style={styles.menuItemText}>表示テーマ</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.lg }}>
                    <Text style={styles.menuSectionTitle}>その他</Text>
                    <View style={styles.menuItems}>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('アカウント')}><Text style={styles.menuItemText}>アカウント</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={() => stubMenu('ヘルプ')}><Text style={styles.menuItemText}>ヘルプ</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Text style={styles.menuItemText}>ログアウト</Text></TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* 表示テーマ */}
        <Modal
          visible={isThemeSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={closeThemeSheet}
        >
          <Pressable style={styles.plusSheetOverlay} onPress={closeThemeSheet}>
            <Pressable style={[styles.plusSheetPanel, { backgroundColor: theme.background.primary, borderColor: theme.border.medium }]} onPress={() => { /* stop propagation */ }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                <Text style={[styles.plusSheetTitle, { color: theme.text.primary }]}>表示テーマ</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={closeThemeSheet} accessibilityLabel="閉じる">
                  <Text style={[styles.plusSheetCloseText, { color: theme.text.secondary }]}>×</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: theme.text.secondary, fontSize: Typography.sizes.xs, marginBottom: Spacing.md }}>
                お好みの表示モードを選択
              </Text>

              <View style={{ gap: Spacing.md }}>
                <TouchableOpacity
                  style={[styles.plusSheetItem, themeMode === 'light' && { borderColor: Colors.accent.DEFAULT }]}
                  onPress={() => applyThemeMode('light')}
                >
                  <Text style={styles.plusSheetItemText}>ライト {themeMode === 'light' ? '✓' : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.plusSheetItem, themeMode === 'dark' && { borderColor: Colors.accent.DEFAULT }]}
                  onPress={() => applyThemeMode('dark')}
                >
                  <Text style={styles.plusSheetItemText}>ダーク {themeMode === 'dark' ? '✓' : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.plusSheetItem, themeMode === 'system' && { borderColor: Colors.accent.DEFAULT }]}
                  onPress={() => applyThemeMode('system')}
                >
                  <Text style={styles.plusSheetItemText}>端末に合わせる {themeMode === 'system' ? '✓' : ''}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* 添付アクション（+） */}
        <Modal
          visible={isPlusSheetOpen}
          transparent
          animationType="fade"
          onRequestClose={closePlusSheet}
        >
          <Pressable style={styles.plusSheetOverlay} onPress={closePlusSheet}>
            <Pressable style={[styles.plusSheetPanel, { backgroundColor: theme.background.primary, borderColor: theme.border.medium }]} onPress={() => { /* stop propagation */ }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
                <Text style={[styles.plusSheetTitle, { color: theme.text.primary }]}>添付（ファイルや写真を追加）</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={closePlusSheet} accessibilityLabel="閉じる">
                  <Text style={[styles.plusSheetCloseText, { color: theme.text.secondary }]}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.plusSheetGrid}>
                <TouchableOpacity style={styles.plusSheetItem} onPress={() => handlePlusAction('photo')}>
                  <Text style={styles.plusSheetItemText}>写真を追加</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.plusSheetItem} onPress={() => handlePlusAction('camera')}>
                  <Text style={styles.plusSheetItemText}>カメラで撮る</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.plusSheetItem} onPress={() => handlePlusAction('file')}>
                  <Text style={styles.plusSheetItemText}>ファイルを添付</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.plusSheetItem} onPress={() => handlePlusAction('receipt')}>
                  <Text style={styles.plusSheetItemText}>レシートを追加</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* メッセージ一覧 */}
        <ScrollView
          ref={(r) => { scrollViewRef.current = r }}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToBottom(10)}
        >
          {isEmpty ? (
            <View style={styles.homeContainer}>
              <View style={styles.homeWelcome}>
                <Text style={styles.homeWelcomeTitle}>
                  {displayName ? `${displayName}さん、お疲れさまです。` : 'お疲れさまです。'}
                  {'\n'}今日は何を手伝いましょうか？
                </Text>
                <Text style={styles.homeWelcomeSubtext}>
                  日報・経費・請求・見積を、{`\n`}チャットでそのまま進められます。
                </Text>
              </View>

              <View style={{ flex: 1 }} />
            </View>
          ) : (
            messages.map(message => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* 入力欄（常に有効） */}
        <View style={styles.inputContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {promptChips.map(chip => (
              <TouchableOpacity
                key={chip.id}
                style={styles.chip}
                onPress={() => handleChipPress(chip.text)}
                accessibilityLabel={`プロンプト: ${chip.label}`}
              >
                <Text style={styles.chipText} numberOfLines={1}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={openPlusSheet}
              accessibilityLabel="添付"
            >
              <Text style={styles.plusButtonText}>＋</Text>
            </TouchableOpacity>

            <TextInput
              ref={(r) => { inputRef.current = r }}
              style={[styles.input, { color: theme.text.primary }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="メッセージを入力..."
              placeholderTextColor={theme.text.tertiary}
              multiline
              maxLength={1000}
            />

            {canSend ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                accessibilityLabel="送信"
              >
                <Text style={styles.sendButtonText}>送信</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => { /* いったん未実装 */ }}
                accessibilityLabel="音声入力"
              >
                <Text style={styles.voiceButtonText}>🎤</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background.primary,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  noProjectsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    marginTop: 100,
  },
  noProjectsTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  noProjectsDesc: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.light,
    backgroundColor: Colors.dark.background.primary,
  },
  headerMenuButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
  },
  headerMenuButtonText: {
    color: Colors.dark.text.primary,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  // headerSubtitle removed (Figma寄せ)
  headerProjectButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    backgroundColor: Colors.dark.background.surface,
    marginLeft: Spacing.sm,
  },
  headerProjectButtonText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
  },
  menuPanel: {
    width: 280,
    height: '100%',
    backgroundColor: Colors.dark.background.primary,
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    borderRightWidth: 1,
    borderRightColor: Colors.dark.border.light,
  },
  menuTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  menuCloseIcon: {
    color: Colors.dark.text.secondary,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
  },
  menuSectionTitle: {
    color: Colors.dark.text.tertiary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  menuItems: {
    gap: Spacing.sm,
  },
  menuItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
  },
  menuItemText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  menuCloseButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    alignItems: 'center',
  },
  menuCloseButtonText: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  plusSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Spacing.lg,
  },
  plusSheetPanel: {
    backgroundColor: Colors.dark.background.primary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    padding: Spacing.lg,
  },
  plusSheetTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  plusSheetCloseText: {
    color: Colors.dark.text.secondary,
    fontSize: 22,
    fontWeight: Typography.weights.bold,
  },
  plusSheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  plusSheetItem: {
    width: '48%',
    minHeight: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  plusSheetItemText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  homeWelcome: {
    marginTop: 8,
    marginBottom: 28,
  },
  homeWelcomeTitle: {
    color: Colors.dark.text.primary,
    fontSize: 32,
    fontWeight: Typography.weights.medium,
    lineHeight: 40,
    marginBottom: 12,
  },
  homeWelcomeSubtext: {
    color: Colors.dark.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  emptyHeroCard: {
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  emptyStateText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
    textAlign: 'left',
  },
  emptyStateSubtext: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  emptyStateHint: {
    color: Colors.dark.text.tertiary,
    fontSize: Typography.sizes.xs,
    textAlign: 'left',
    marginBottom: Spacing.xl,
  },
  emptyQuickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  emptyQuickActionButton: {
    width: '48%',
    minHeight: 86,
    backgroundColor: Colors.dark.background.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  emptyQuickActionButtonLabel: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  emptyQuickActionButtonHint: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
  },
  messageBubble: {
    maxWidth: '88%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent.DEFAULT,
    borderBottomRightRadius: BorderRadius.sm,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.light,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  initialAiBubble: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border.medium,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  cardTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  cardBody: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  messageText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  actionChipsRow: {
    flexDirection: 'column',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionChip: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionChipPrimary: {
    backgroundColor: Colors.accent.DEFAULT,
    shadowColor: Colors.accent.DEFAULT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  actionChipSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.dark.border.medium,
  },
  actionChipText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
  },
  actionChipTextPrimary: {
    color: '#FFFFFF',
  },
  actionChipTextSecondary: {
    color: Colors.dark.text.primary,
  },
  messageTime: {
    color: Colors.dark.text.tertiary,
    fontSize: Typography.sizes.xs,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
    lineHeight: Typography.lineHeights.tight * Typography.sizes.xs,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: Colors.dark.background.primary,
    gap: 12,
  },
  chipsRow: {
    paddingHorizontal: 20,
    paddingRight: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: {
    color: Colors.dark.text.primary,
    fontSize: 14,
    fontWeight: Typography.weights.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: Colors.dark.background.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    marginTop: -1,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonText: {
    color: Colors.dark.text.primary,
    fontSize: 18,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: 999,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background.elevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.light,
  },
  modalTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  modalClose: {
    color: Colors.dark.text.tertiary,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  projectList: {
    padding: Spacing.md,
  },
  projectItem: {
    backgroundColor: Colors.dark.background.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border.light,
  },
  projectName: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  projectLocation: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
  },
  createProjectButton: {
    backgroundColor: Colors.accent.DEFAULT,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  createProjectButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
})
