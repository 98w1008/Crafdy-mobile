/**
 * Dev UI Preview Screen
 * Crafdy-mobile 開発専用: コンポーネントを本体に組み込まずに確認するためのサンドボックス
 *
 * ルート: /dev/ui-preview (Expo Router)
 * 用途: Phase 1 純UI再現の目視確認
 *
 * トグル:
 *   - テーマ: dark / light
 *   - ロール: 工事担当者 / 管理者 / 経営者
 *   - プロジェクト: なし / あり
 *   - シート: attach sheet 表示/非表示
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { MainChatHomeView, HomeChip } from '@/components/chat/MainChatHomeView'
import { MainChatAttachSheetView } from '@/components/chat/MainChatAttachSheetView'
import { chatTokens } from '@/theme/tokens'

// ============================================================
// サンプルデータ
// ============================================================

const CHIPS_BY_ROLE: Record<string, HomeChip[]> = {
  worker: [
    { id: '1', label: '本日の日報を作成', text: '本日の日報を作成してください' },
    { id: '2', label: '経費を申請したい', text: '経費申請を手伝ってください' },
    { id: '3', label: '作業写真を送る', text: '作業写真をアップロードします' },
    { id: '4', label: '現場の問題を報告', text: '現場の問題を報告したい' },
  ],
  manager: [
    { id: '1', label: 'チームの進捗を確認', text: 'チームの今日の進捗を教えてください' },
    { id: '2', label: '未承認の日報一覧', text: '未承認の日報を一覧表示してください' },
    { id: '3', label: '今週の工数まとめ', text: '今週の工数をまとめてください' },
    { id: '4', label: '現場の安全確認', text: '今日の安全確認状況を教えてください' },
  ],
  executive: [
    { id: '1', label: '今月の売上サマリ', text: '今月の売上サマリを見せてください' },
    { id: '2', label: '未払い請求書を確認', text: '未払い請求書の一覧を確認したい' },
    { id: '3', label: 'プロジェクト別損益', text: 'プロジェクト別の損益を表示してください' },
    { id: '4', label: '経費承認が必要な件', text: '経費承認が必要な申請を一覧表示して' },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  worker: '工事担当者',
  manager: '管理者',
  executive: '経営者',
}

const DISPLAY_NAMES: Record<string, string> = {
  worker: '田中',
  manager: '山田',
  executive: '佐藤',
}

// ============================================================
// トグルボタン
// ============================================================

interface ToggleGroupProps<T extends string> {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  isDark: boolean
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  isDark,
}: ToggleGroupProps<T>) {
  const bg = isDark ? '#1E293B' : '#F1F5F9'
  const textColor = isDark ? '#94A3B8' : '#64748B'
  const activeBg = isDark ? '#3B82F6' : '#2563EB'
  const activeText = '#FFFFFF'
  const inactiveText = isDark ? '#CBD5E1' : '#475569'

  return (
    <View style={ctrl.row}>
      <Text style={[ctrl.label, { color: textColor }]}>{label}</Text>
      <View style={[ctrl.group, { backgroundColor: bg }]}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              ctrl.btn,
              value === opt.value && { backgroundColor: activeBg },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                ctrl.btnText,
                { color: value === opt.value ? activeText : inactiveText },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ============================================================
// メインプレビュー画面
// ============================================================

export default function UIPreviewScreen() {
  const [isDark, setIsDark] = useState(true)
  const [role, setRole] = useState<'worker' | 'manager' | 'executive'>('worker')
  const [hasProject, setHasProject] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const chips = CHIPS_BY_ROLE[role]
  const displayName = DISPLAY_NAMES[role]

  // chatTokens を使って preview chrome のカラーを解決
  const c = isDark ? chatTokens.colors.dark : chatTokens.colors.light
  const pageBg    = c.background
  const controlBg = c.surface
  const sectionText = c.textSecondary

  return (
    <SafeAreaView style={[preview.root, { backgroundColor: pageBg }]}>
      {/* ====== コントロールパネル (上部固定) ====== */}
      <View style={[preview.controls, { backgroundColor: controlBg }]}>
        <Text style={[preview.controlsTitle, { color: sectionText }]}>
          DEV UI PREVIEW
        </Text>

        <ToggleGroup
          label="テーマ"
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
          value={isDark ? 'dark' : 'light'}
          onChange={v => setIsDark(v === 'dark')}
          isDark={isDark}
        />

        <ToggleGroup
          label="ロール"
          options={[
            { value: 'worker', label: '担当者' },
            { value: 'manager', label: '管理者' },
            { value: 'executive', label: '経営者' },
          ]}
          value={role}
          onChange={setRole}
          isDark={isDark}
        />

        <ToggleGroup
          label="プロジェクト"
          options={[
            { value: 'none', label: 'なし' },
            { value: 'active', label: 'あり' },
          ]}
          value={hasProject ? 'active' : 'none'}
          onChange={v => setHasProject(v === 'active')}
          isDark={isDark}
        />

        <ToggleGroup
          label="アクションシート"
          options={[
            { value: 'closed', label: '閉じる' },
            { value: 'open', label: '開く' },
          ]}
          value={sheetOpen ? 'open' : 'closed'}
          onChange={v => setSheetOpen(v === 'open')}
          isDark={isDark}
        />
      </View>

      {/* ====== プレビュー領域 ====== */}
      <View style={[preview.canvas, { backgroundColor: pageBg }]}>
        {/* MainChatHomeView */}
        <View style={preview.componentSection}>
          <Text style={[preview.sectionLabel, { color: sectionText }]}>
            MainChatHomeView
          </Text>
          <View style={[preview.componentFrame, { backgroundColor: pageBg }]}>
            <MainChatHomeView
              displayName={displayName}
              chips={chips}
              onChipPress={text => {
                // プレビュー用: 何もしない
              }}
              isDark={isDark}
            />
          </View>
        </View>
      </View>

      {/* ====== MainChatAttachSheetView (Modal) ====== */}
      <MainChatAttachSheetView
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAction={kind => {
          // プレビュー用: 何もしない
          setSheetOpen(false)
        }}
        isDark={isDark}
      />
    </SafeAreaView>
  )
}

// ============================================================
// スタイル
// ============================================================

const preview = StyleSheet.create({
  root: {
    flex: 1,
  },

  // コントロールパネル
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  controlsTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  // プレビューキャンバス
  canvas: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // コンポーネントセクション
  componentSection: {
    flex: 1,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },

  componentFrame: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
})

const ctrl = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  label: {
    fontSize: 11,
    fontWeight: '500',
    width: 80,
    flexShrink: 0,
  },

  group: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 2,
    gap: 2,
    flex: 1,
  },

  btn: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },

  btnText: {
    fontSize: 11,
    fontWeight: '500',
  },
})
