/**
 * メインチャット画面 - アプリの中心となる画面
 * 現場を選択してチャット・作業管理を行う
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { debugOpen } from '../debug/deeplink'
import { Surface, Text, Button, IconButton, Portal, Modal, Chip } from 'react-native-paper'
import InputBar from '@/components/InputBar'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, useColors, useSpacing } from '@/theme/ThemeProvider'
import * as Haptics from 'expo-haptics'

// AI Components
import MessageBubble from '@/components/chat/MessageBubble'
import TypingDots from '@/components/chat/TypingDots'
// QuickPromptsBar removed; actions provided via FAB
import WelcomeCard from '@/components/chat/WelcomeCard'
import FabActions from '@/components/chat/FabActions'
import BottomSheet from '@/components/chat/BottomSheet'
import ReportCard from '@/components/chat/cards/ReportCard'
import EstimateCard from '@/components/chat/cards/EstimateCard'
import InvoiceCard from '@/components/chat/cards/InvoiceCard'
import { routeIntent } from '@/lib/chat/intents'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { commitReportDraft } from '@/lib/chat/handlers/report'
import ReceiptCard from '@/components/chat/cards/ReceiptCard'
import WorkSiteCard from '@/components/chat/cards/WorkSiteCard'
import BillingSettingsCard from '@/components/chat/cards/BillingSettingsCard'
import { commitReceiptDraft } from '@/lib/chat/handlers/receipt'
import { invokeReceiptOCR } from '@/lib/chat/ocr'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { logIntent, logReceiptRegistered } from '@/lib/chat/telemetry'

// =============================================================================
// TYPES
// =============================================================================

interface Project {
  id: string
  name: string
  status: 'active' | 'completed' | 'pending'
  lastActivity?: string
}

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: Date
  type?: 'text' | 'image' | 'document'
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function MainChatScreen() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const colors = useColors()
  const spacing = useSpacing()
  
  // State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectSelector, setShowProjectSelector] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // AI State
  const [isAiTyping, setIsAiTyping] = useState(false)
  
  // UI State
  const [welcomeCollapsed, setWelcomeCollapsed] = useState<boolean>(false)
  const [currentRoute] = useState('/main-chat')
  
  const flatListRef = useRef<FlatList>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [sheetKind, setSheetKind] = useState<'report' | 'receipt' | 'site-select' | 'estimate' | 'invoice' | 'billing-settings' | null>(null)
  const [needsBillingSetup, setNeedsBillingSetup] = useState(false)
  const [roundingDefault, setRoundingDefault] = useState<'cut'|'round'|'ceil'>('round')
  const [pendingFiles, setPendingFiles] = useState<{ uri: string; fileName?: string | null; mimeType?: string | null }[] | null>(null)
  const [pendingFileIndex, setPendingFileIndex] = useState(0)
  const [pendingOccurredOn, setPendingOccurredOn] = useState<string | null>(null)

  // Mock data - 実際にはSupabaseから取得
  const [projects] = useState<Project[]>([
    { id: '1', name: '渋谷オフィス改修工事', status: 'active', lastActivity: '2時間前' },
    { id: '2', name: '新宿マンション建設', status: 'active', lastActivity: '1日前' },
    { id: '3', name: '品川倉庫解体工事', status: 'pending', lastActivity: '3日前' },
  ])

  // 初期プロジェクト選択
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0])
      loadChatHistory(projects[0].id)
    }
  }, [projects])

  // 挨拶カードの初回表示と折りたたみ状態を永続化
  useEffect(() => {
    const loadWelcomeState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('welcome_card_dismissed_v1')
        setWelcomeCollapsed(dismissed === '1')
      } catch {}
    }
    loadWelcomeState()
  }, [])

  // チャット履歴読み込み
  const loadChatHistory = async (projectId: string) => {
    try {
      setIsLoading(true)
      // TODO: Supabaseからチャット履歴を取得
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          content: '現場での作業開始を報告します。',
          sender: 'user',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2', 
          content: 'ご報告ありがとうございます。本日の作業予定を確認いたします。',
          sender: 'ai',
          timestamp: new Date(Date.now() - 3500000),
        },
      ]
      setMessages(mockMessages)
    } catch (error) {
      console.error('チャット履歴の読み込みエラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // プロジェクト選択
  const handleProjectSelect = (project: Project) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    setSelectedProject(project)
    setShowProjectSelector(false)
    loadChatHistory(project.id)
    // Phase1: try load billing settings
    ;(async()=>{
      try {
        if (!supabase) return
        const { data } = await (supabase as any).from('site_billing_settings').select('site_id, rounding').eq('site_id', project.id).maybeSingle()
        if (!data) {
          setNeedsBillingSetup(true)
          setSheetKind('billing-settings')
          setSheetVisible(true)
        } else {
          setNeedsBillingSetup(false)
          if (data.rounding === 'cut' || data.rounding === 'round' || data.rounding === 'ceil') {
            setRoundingDefault(data.rounding)
          } else {
            setRoundingDefault('round')
          }
        }
      } catch {}
    })()
  }

  // メッセージ送信（AI演出付き）
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    // 開発用DeepLinkショートカット: "/dl <URL>"
    const text = inputText.trim()
    if (text?.startsWith('/dl ')) {
      debugOpen(text.slice(4).trim())
      setInputText('')
      return
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: text,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])
    setInputText('')
    const parsed = routeIntent(text)
    if (parsed.intent === 'create_report') {
      setSheetKind('report')
      setSheetVisible(true)
      return
    }
    if (parsed.intent === 'upload_doc') {
      if (!selectedProject?.id) {
        setSheetKind('site-select')
        setSheetVisible(true)
      } else {
        setSheetKind('receipt')
        setSheetVisible(true)
      }
      return
    }
    if (parsed.intent === 'optimize_estimate') {
      setSheetKind('estimate')
      setSheetVisible(true)
      return
    }
    if (parsed.intent === 'create_invoice') {
      setSheetKind('invoice')
      setSheetVisible(true)
      return
    }
    if (parsed.intent === 'set_billing_mode') {
      try {
        if (!selectedProject?.id || !supabase) throw new Error('supabase_not_ready')
        const { parseBillingCommand, updateSiteBillingSettings } = await import('@/lib/chat/handlers/billing')
        const patch = parseBillingCommand(text)
        if (!patch || Object.keys(patch).length === 0) {
          setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: '何を変更しますか？例：「税抜にして」「締日を15日に」「常用（日当）に」', sender: 'ai', timestamp: new Date() } as any])
          return
        }
        const saved = await updateSiteBillingSettings(supabase, { projectId: selectedProject.id, patch })
        setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `請求設定を更新：形態=${(():string=>{const m=saved.billing_mode;return m==='daily'?'常用（日当）':m==='progress'?'出来高':m==='milestone'?'マイルストーン':String(m)})()} / 税=${saved.tax_rule==='inclusive'?'税込':'税抜'}(${Number(saved.tax_rate||0)}%) / 締日=${saved.closing_day==='end'?'月末':saved.closing_day+'日'} / サイト=${Number(saved.payment_term_days||0)}日 / 端数=${(():string=>{const r=saved.rounding;return r==='cut'?'切り捨て':r==='ceil'?'切り上げ':'四捨五入'})()}`, sender: 'ai', timestamp: new Date() } as any])
        await logIntent(supabase, { intent: 'set_billing_mode', status: 'success', project_id: selectedProject.id, metadata: patch })
      } catch (e:any) {
        setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: '保存できませんでした。会社/権限の設定を確認してください。', sender: 'ai', timestamp: new Date() } as any])
        if (supabase) { await logIntent(supabase, { intent: 'set_billing_mode', status: 'failure', failure_reason: 'UNKNOWN', message: String(e?.message||''), project_id: selectedProject?.id }) }
      }
      return
    }
    setIsAiTyping(true)
    setIsLoading(true)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: '了解しました。次に何をしますか？',
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
      setIsAiTyping(false)
    }, 800)
  }

  // クイックプロンプト処理（新しい実装）
  const handleQuickPrompt = (prompt: string, promptText: string, mockResponse?: string) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    
    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: promptText,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    
    // AIタイピング演出
    setIsAiTyping(true)
    
    // 模擬AIレスポンス
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: mockResponse || `「${prompt}」についてサポートいたします。詳しい内容をお聞かせください。`,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiResponse])
      setIsAiTyping(false)
    }, 1500)
  }

  // Helpers
  const ymd = (d: Date) => {
    const y=d.getFullYear(), m=(d.getMonth()+1).toString().padStart(2,'0'), day=d.getDate().toString().padStart(2,'0')
    return `${y}-${m}-${day}`
  }

  const detectOccurredOn = async (uri: string) => {
    try {
      const info = await FileSystem.getInfoAsync(uri)
      if ((info as any)?.modificationTime) {
        return ymd(new Date((info as any).modificationTime * 1000))
      }
    } catch {}
    return ymd(new Date())
  }

  // 設定画面へ遷移
  const handleSettingsPress = () => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    router.push('/settings')
  }
  
  // 挨拶カードの折りたたみ
  const handleWelcomeCardDismiss = async () => {
    try {
      setWelcomeCollapsed(true)
      await AsyncStorage.setItem('welcome_card_dismissed_v1', '1')
    } catch {}
  }

  const handleWelcomeExpand = async () => {
    try {
      setWelcomeCollapsed(false)
      await AsyncStorage.setItem('welcomeCollapsed', '0')
    } catch {}
  }

  // メッセージレンダリング（新AIバブル使用）
  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item.content}
      isUser={item.sender === 'user'}
      timestamp={item.timestamp.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}
      userName={item.sender === 'user' ? user?.user_metadata?.full_name : 'AI Assistant'}
    />
  )

  // プロジェクト選択モーダル
  const renderProjectSelector = () => (
    <Portal>
      <Modal
        visible={showProjectSelector}
        onDismiss={() => setShowProjectSelector(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Text style={styles.modalTitle}>現場を選択</Text>
          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={[
                styles.projectItem,
                selectedProject?.id === project.id && styles.selectedProject
              ]}
              onPress={() => handleProjectSelect(project)}
            >
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>
                <Text style={styles.projectStatus}>
                  {project.status === 'active' ? '進行中' : 
                   project.status === 'completed' ? '完了' : '待機中'}
                </Text>
              </View>
              {project.lastActivity && (
                <Text style={styles.lastActivity}>{project.lastActivity}</Text>
              )}
            </TouchableOpacity>
          ))}
          <Button 
            mode="contained" 
            onPress={() => {
              setShowProjectSelector(false)
              router.push('/new-project')
            }}
            style={{ marginTop: 8 }}
          >
            新規現場を登録
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => setShowProjectSelector(false)}
            style={styles.modalCloseButton}
          >
            戻る
          </Button>
        </Surface>
      </Modal>
    </Portal>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* ヘッダー - 現在選択中の現場ピル */}
      <Surface style={[styles.header, { backgroundColor: colors.surface }] }>
        <TouchableOpacity
          style={styles.currentSitePill}
          onPress={() => {
            if (Haptics) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            router.push('/work-sites')
          }}
          accessibilityLabel="現場管理を開く"
          accessibilityRole="button"
        >
          <Text style={[styles.currentSiteLabel, { color: colors.primary.DEFAULT }]}>現在</Text>
          <Text style={[styles.currentSiteName, { color: colors.primary.DEFAULT }]} numberOfLines={1}>
            {selectedProject?.name || '現場を選択'}
          </Text>
          <IconButton 
            icon="chevron-down" 
            size={16} 
            iconColor="#666"
            style={styles.pillIcon}
          />
        </TouchableOpacity>

        <IconButton
          icon="cog"
          size={24}
          onPress={handleSettingsPress}
          accessibilityLabel="設定"
        />
      </Surface>

      {/* チャット領域 */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={[styles.messagesList, { backgroundColor: colors.background.primary }]}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            !welcomeCollapsed ? (
              <WelcomeCard
                currentProject={selectedProject}
                onDismiss={handleWelcomeCardDismiss}
                onProjectSelect={() => setShowProjectSelector(true)}
                dismissible={true}
              />
            ) : null
          )}
        />

        {/* AI タイピング表示 */}
        {isAiTyping && (
          <TypingDots visible={true} size={6} />
        )}

        {/* QuickPrompts removed; use FAB for shortcuts */}

        {/* 入力エリア（統一されたBig TechスタイルのInputBar） */}
        <InputBar
          message={inputText}
          onMessageChange={setInputText}
          onSendPress={handleSendMessage}
          onPlusPress={async () => {
            try {
              const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, exif: true })
              if (res.canceled) return
              const files = res.assets?.map(a => ({ uri: a.uri, fileName: (a as any).fileName || (a as any).filename || null, mimeType: (a as any).mimeType || (a as any).type || null })) || []
              if (!files.length) return
              setPendingFiles(files)
              setPendingFileIndex(0)
              const occurred = await detectOccurredOn(files[0].uri)
              setPendingOccurredOn(occurred)
              if (!selectedProject?.id) {
                setSheetKind('site-select')
              } else {
                setSheetKind('receipt')
              }
              setSheetVisible(true)
            } catch (e) {
              console.warn('image pick error', e)
            }
          }}
          sending={isLoading}
          placeholder="メッセージを入力..."
        />
      </KeyboardAvoidingView>

      {/* プロジェクト選択モーダル */}
      {renderProjectSelector()}
      
      {/* 折りたたみ時に再表示できるスモールバー */}
      {welcomeCollapsed && (
        <TouchableOpacity
          style={styles.welcomeCollapsedBar}
          onPress={handleWelcomeExpand}
          accessibilityLabel="挨拶カードを開く"
        >
          <Text style={{ color: '#1976d2' }}>👋 挨拶カードを表示</Text>
        </TouchableOpacity>
      )}
      
      {/* FABアクション */}
      <FabActions 
        currentRoute={currentRoute}
      />

      {/* Bottom Sheet */}
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} ariaLabel={sheetKind === 'report' ? '日報シート' : 'シート'}>
        {sheetKind === 'billing-settings' && (
          <BillingSettingsCard
            siteName={selectedProject?.name || '未選択の現場'}
            onConfirm={async ({ mode, taxRule, taxRate, closingDay, paymentTermDays }) => {
              try {
                if (!selectedProject?.id || !supabase) throw new Error('supabase_not_ready')
                await (supabase as any).from('site_billing_settings').insert({ site_id: selectedProject.id, billing_mode: mode, tax_rule: taxRule, tax_rate: taxRate, closing_day: String(closingDay), payment_term_days: paymentTermDays })
                setSheetVisible(false)
                setNeedsBillingSetup(false)
                // 固定カード（表記を税込/税抜に統一）
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `請求設定を保存しました：形態=${mode==='daily'?'常用（日当）':mode==='progress'?'出来高':mode==='milestone'?'マイルストーン':String(mode)} / 税=${taxRule==='inclusive'?'税込':'税抜'}(${taxRate}%) / 締日=${String(closingDay)==='end'?'月末':String(closingDay)+'日'} / サイト=${paymentTermDays}日`, sender: 'ai', timestamp: new Date() } as any])
                const { logIntent } = await import('@/lib/chat/telemetry')
                await logIntent(supabase, { intent: 'set_billing_mode', status: 'success', project_id: selectedProject.id, metadata: { project_id: selectedProject.id, billing_mode: mode, tax_rule: taxRule, tax_rate: taxRate } })
              } catch (e:any) {
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: '保存できませんでした。会社/権限の設定を確認してください。', sender: 'ai', timestamp: new Date() } as any])
                if (supabase) { const { logIntent } = await import('@/lib/chat/telemetry'); await logIntent(supabase, { intent: 'set_billing_mode', status: 'failure', failure_reason: 'UNKNOWN', message: String(e?.message||''), project_id: selectedProject?.id }) }
              }
            }}
          />
        )}
        {sheetKind === 'site-select' && (
          <WorkSiteCard
            recentSites={projects.map(p=>({ id: p.id, name: p.name }))}
            onSelect={(s)=>{ setSelectedProject({ id: s.id, name: s.name, status: 'active' }); setSheetKind('receipt') }}
            onSearch={async (q) => {
              try {
                if (!supabase) return []
                const { data } = await (supabase as any)
                  .from('work_sites')
                  .select('id,name')
                  .ilike('name', `%${q}%`)
                  .order('updated_at', { ascending: false })
                  .limit(10)
                return (data||[]).map((r:any)=>({ id: r.id, name: r.name }))
              } catch { return [] }
            }}
          />
        )}
        {sheetKind === 'report' && (
          <ReportCard
            siteName={selectedProject?.name || '未選択の現場'}
            date={new Date().toLocaleDateString('ja-JP')}
            workers={[{ id: 'w1', name: '山田 太郎' }, { id: 'w2', name: '佐藤 花子' }, { id: 'w3', name: '応援A', isSupport: true }]}
            onConfirm={async ({ picks }) => {
              try {
                if (!selectedProject?.id) { setSheetVisible(false); setMessages(prev=>[...prev,{id:'sys-'+Date.now(),content:'現場が未選択です。どの現場で進めますか？',sender:'ai',timestamp:new Date()} as any]); return }
                const d = new Date(); const y=d.getFullYear(), m=(d.getMonth()+1).toString().padStart(2,'0'), day=d.getDate().toString().padStart(2,'0')
                const workDate = `${y}-${m}-${day}`
                if (!supabase) throw new Error('supabase_not_ready')
                const result = await commitReportDraft(supabase, {
                  siteId: selectedProject.id,
                  workDate,
                  workers: picks.map((p: any) => ({ worker_id: p.workerId || p.worker_id || 'w1', man_day: (p.unit || 1) as 1|0.5 }))
                })
                setSheetVisible(false)
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `本日の日報を登録しました（合計 ${result.totalManDay} 人工）`, sender: 'ai', timestamp: new Date() } as any])
              } catch (e: any) {
                setSheetVisible(false)
                const msg = e?.message === 'supabase_not_ready' ? '保存できませんでした。接続設定を確認してください。' : '保存できませんでした。会社/権限の設定を確認してください。'
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: msg, sender: 'ai', timestamp: new Date() } as any])
              }
            }}
          />
        )}
        {sheetKind === 'estimate' && (
          <EstimateCard
            siteName={selectedProject?.name || '未選択の現場'}
            onConfirm={async ({ title, items, billingMode }) => {
              try {
                if (!selectedProject?.id || !supabase) throw new Error('supabase_not_ready')
                const { commitEstimateDraft } = await import('@/lib/chat/handlers/estimate')
                const res = await commitEstimateDraft(supabase, { projectId: selectedProject.id, title, items, billingMode })
                setSheetVisible(false)
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `見積を保存しました：行${items.length}件／税込¥${res.total.toLocaleString()}`, sender: 'ai', timestamp: new Date() } as any])
                const { logEstimateCommitted } = await import('@/lib/chat/telemetry')
                await logEstimateCommitted(supabase, { project_id: selectedProject.id, total: res.total, lines: items.length })
              } catch (e:any) {
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: '保存できませんでした。会社/権限の設定を確認してください。', sender: 'ai', timestamp: new Date() } as any])
                if (supabase) { const { logIntent } = await import('@/lib/chat/telemetry'); await logIntent(supabase, { intent: 'optimize_estimate', status: 'failure', failure_reason: 'UNKNOWN', message: String(e?.message||'') }) }
              }
            }}
          />
        )}
        {sheetKind === 'invoice' && (
          <InvoiceCard
            siteName={selectedProject?.name || '未選択の現場'}
            initialRounding={roundingDefault}
            onConfirm={async ({ bill_to, closing, dueInDays, rounding }) => {
              try {
                if (!selectedProject?.id || !supabase) throw new Error('supabase_not_ready')
                const { draftInvoiceFromProgress, commitInvoiceDraft } = await import('@/lib/chat/handlers/invoice')
                const { start, end } = (()=>{ const d=new Date(); return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth()+1, 0) } })()
                const fmt = (x:Date)=> `${x.getFullYear()}-${(x.getMonth()+1).toString().padStart(2,'0')}-${x.getDate().toString().padStart(2,'0')}`
                const draft = await draftInvoiceFromProgress(supabase, { projectId: selectedProject.id, periodStart: fmt(start), periodEnd: fmt(end) })
                const issue = fmt(new Date())
                const closingDate = closing==='end'? fmt(end) : fmt(new Date(end.getFullYear(), end.getMonth(), 15))
                const due = fmt(new Date(new Date(closingDate).getTime() + (Number(dueInDays)||30)*24*3600*1000))
                const res = await commitInvoiceDraft(supabase, { projectId: selectedProject.id, issueDate: issue, closingDate, dueDate: due, billTo: bill_to, items: draft.items, rounding })
                setSheetVisible(false)
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `請求書を発行しました：税込¥${res.total.toLocaleString()}／期日 ${due}`, sender: 'ai', timestamp: new Date() } as any])
                const { logInvoiceIssued } = await import('@/lib/chat/telemetry')
                await logInvoiceIssued(supabase, { project_id: selectedProject.id, total: res.total, due_date: due })
                await logIntent(supabase, { intent: 'create_invoice', status: 'success', project_id: selectedProject.id, metadata: { total: res.total, due_date: due } })
              } catch (e:any) {
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: '発行できませんでした。会社/権限の設定を確認してください。', sender: 'ai', timestamp: new Date() } as any])
                if (supabase) { const { logIntent } = await import('@/lib/chat/telemetry'); await logIntent(supabase, { intent: 'create_invoice', status: 'failure', failure_reason: 'UNKNOWN', message: String(e?.message||'') }) }
              }
            }}
          />
        )}
        {sheetKind === 'receipt' && (
          <ReceiptCard
            imageUri={pendingFiles?.[pendingFileIndex || 0]?.uri || ''}
            filesCount={pendingFiles?.length || 1}
            index={pendingFileIndex}
            onPrev={() => setPendingFileIndex(i => Math.max(0, i - 1))}
            onNext={() => setPendingFileIndex(i => Math.min((pendingFiles?.length || 1) - 1, i + 1))}
            initialKind={((): any => { const f = pendingFiles?.[pendingFileIndex || 0]; const s = `${(f as any)?.fileName||''} ${(f as any)?.mimeType||''}`.toLowerCase(); return /納品|delivery|搬入/.test(s) ? 'delivery' : /領収|receipt|レシート/.test(s) ? 'receipt' : 'other' })()}
            categoryCandidates={[ '材料', '消耗品', '交通費', '高速', '駐車', '雑費' ]}
            onRegister={async ({ category, amount, kind, vendor }) => {
              try {
                if (!selectedProject?.id) { setSheetVisible(false); setMessages(prev=>[...prev,{id:'sys-'+Date.now(),content:'現場が未選択です。どの現場で進めますか？',sender:'ai',timestamp:new Date()} as any]); return }
                const occurredOn = pendingOccurredOn || ymd(new Date())
                if (!supabase) throw new Error('supabase_not_ready')
                const t0 = Date.now()
                const res = await commitReceiptDraft(supabase, {
                  projectId: selectedProject.id,
                  kind, amount, account: category, vendor, occurredOn, fileRefs: (pendingFiles||[]).map(f=>({ uri: f.uri }))
                })
                setSheetVisible(false)
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: `登録：¥${amount.toLocaleString()} / ${category} / ${kind}（${occurredOn}）`, sender: 'ai', timestamp: new Date() } as any])
                await logIntent(supabase, { intent: 'upload_doc', status: 'success', project_id: selectedProject.id, metadata: { source:'chat', files: pendingFiles?.length||1, amount, kind, project_id: selectedProject.id, occurred_on: occurredOn } })
                await logReceiptRegistered(supabase, { project_id: selectedProject.id, amount, kind, count_files: pendingFiles?.length || 1, duration_ms: Date.now()-t0 })
                // OCR stub
                await invokeReceiptOCR(supabase as any, { receiptId: res.id, files: (pendingFiles||[]) })
                setPendingFiles(null); setPendingOccurredOn(null)
              } catch (e: any) {
                setSheetVisible(false)
                const msg = e?.message === 'supabase_not_ready' ? '登録できませんでした。接続設定を確認してください。' : '登録できませんでした。会社/権限の設定を確認してください。'
                setMessages(prev => [...prev, { id: 'sys-'+Date.now(), content: msg, sender: 'ai', timestamp: new Date() } as any])
                if (supabase) await logIntent(supabase, { intent: 'upload_doc', status: 'failure', failure_reason: 'UNKNOWN', message: String(e?.message||'') , project_id: selectedProject?.id, metadata: { source:'chat' } })
              }
            }}
          />
        )}
      </BottomSheet>
    </SafeAreaView>
  )
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // themed in JSX
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  currentSitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '75%',
  },
  currentSiteLabel: {
    fontSize: 12,
    color: '#1976d2',
    marginRight: 4,
  },
  currentSiteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    flex: 1,
  },
  pillIcon: {
    margin: 0,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#1E7D4E',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
  },
  textInput: {
    backgroundColor: 'white',
  },
  modalContainer: {
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedProject: {
    backgroundColor: '#e3f2fd',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectStatus: {
    fontSize: 14,
    color: '#666',
  },
  lastActivity: {
  // Handle deep link params: /main-chat?intent=...&project=...
  const params = useLocalSearchParams<{ intent?: string; project?: string }>()
  const didHandleDeepLink = useRef(false)
  useEffect(() => {
    if (didHandleDeepLink.current) return
    const intent = (params?.intent as string) || ''
    const projectId = (params?.project as string) || ''
    if (!intent && !projectId) return
    ;(async () => {
      try {
        if (projectId && projectId !== selectedProject?.id) {
          if (!supabase) return
          const { data } = await (supabase as any)
            .from('work_sites')
            .select('id,name')
            .eq('id', projectId)
            .maybeSingle()
          if (data?.id) {
            handleProjectSelect({ id: data.id, name: data.name, status: 'active' })
          }
        }
        if (intent === 'create_invoice') {
          setSheetKind('invoice')
          setSheetVisible(true)
        }
        didHandleDeepLink.current = true
      } catch {}
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])
    fontSize: 12,
    color: '#999',
  },
  modalCloseButton: {
    marginTop: 16,
  },
  quickPromptsContainer: {
    marginBottom: 8,
  },
  welcomeCollapsedBar: {
    position: 'absolute',
    top: 64,
    left: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 2,
  },
})
