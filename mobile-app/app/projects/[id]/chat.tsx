import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { useColors, useSpacing, useRadius } from '@/theme/ThemeProvider'
import { StyledText, StyledButton, Card } from '@/components/ui'
import * as Haptics from 'expo-haptics'

// 各タブの内容をインポート
import DailyReportTab from '@/components/chat/DailyReportTab'
import ProgressTab from '@/components/chat/ProgressTab'
import MaterialOCRTab from '@/components/chat/MaterialOCRTab'
import GlobalFABMenu from '@/components/chat/FabActions'

type ChatTabType = 'daily_report' | 'progress' | 'material_ocr'

interface ChatTab {
  id: ChatTabType
  title: string
  icon: string
  color: string
  description: string
}

export default function ProjectChatRoom() {
  const { user } = useAuth()
  const userRole = useRole()
  const params = useLocalSearchParams()
  const colors = useColors()
  const spacing = useSpacing()
  const radius = useRadius()
  const [activeTab, setActiveTab] = useState<ChatTabType>('daily_report')
  const [showAIButton, setShowAIButton] = useState(true)

  const projectId = params.id as string
  const projectName = params.name as string || 'プロジェクト'

  // 建設業界向け3タブ定義（追加見積タブを削除）
  const chatTabs: ChatTab[] = [
    {
      id: 'daily_report',
      title: '日報',
      icon: '・',
      color: colors.primary.DEFAULT,
      description: '日次作業報告と記録'
    },
    {
      id: 'progress',
      title: '進捗',
      icon: '・',
      color: colors.primary.DEFAULT,
      description: '工事進捗と完了状況'
    },
    {
      id: 'material_ocr',
      title: '材料OCR',
      icon: '・',
      color: colors.primary.DEFAULT,
      description: 'レシート・材料読み取り'
    }
  ]

  // 権限チェック：職長は自分が担当するプロジェクトのみアクセス可能
  useEffect(() => {
    if (userRole === 'lead') {
      // 職長権限での制限チェック（実際にはSupabaseのRLSで制御）
      console.log('職長権限でプロジェクトアクセス:', projectId)
    }
  }, [userRole, projectId])

  const handleTabPress = (tabId: ChatTabType) => {
    setActiveTab(tabId)
    // 全タブで+ボタンを表示（見積もりはグローバルFABで対応）
    setShowAIButton(true)
  }

  // 削除: showAIEstimate - 統一ウィザードに移行したため不要

  const handleAIPlusPress = async () => {
    try {
      // ChatGPT風のhaptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      
      // +ボタンで統一見積もりウィザードに遷移
      router.push('/estimate/new')
    } catch (error) {
      // Hapticがサポートされていない場合は無視
      console.log('Haptic feedback not supported:', error)
      router.push('/estimate/new')
    }
  }

  const renderTabHeader = () => (
    <View style={styles.tabHeader}>
      <View style={styles.projectInfo}>
        <StyledText variant="heading2" weight="bold" color="text">
          {projectName}
        </StyledText>
        <StyledText variant="body" color="secondary">
          現場別ChatRoom・管理
        </StyledText>
      </View>
      
      {/* 4タブナビゲーション */}
      <View style={styles.tabNavigation}>
        {chatTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.tabButtonActive,
              { borderBottomColor: tab.color }
            ]}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <StyledText variant="title" style={styles.tabIcon}>
              {tab.icon}
            </StyledText>
            <StyledText 
              variant="caption" 
              weight={activeTab === tab.id ? 'semibold' : 'medium'}
              color={activeTab === tab.id ? 'text' : 'secondary'}
              numberOfLines={1}
            >
              {tab.title}
            </StyledText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  // クイックアクションボタンのハンドラ
  const handleQuickAction = (action: string) => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    
    switch (action) {
      case 'daily_report':
        setActiveTab('daily_report')
        // 日報作成用のフォームを表示するなど
        Alert.alert('日報作成', '日報タブに切り替えました')
        break
      case 'progress':
        setActiveTab('progress')
        Alert.alert('進捗更新', '進捗タブに切り替えました')
        break
      case 'material_ocr':
        setActiveTab('material_ocr')
        Alert.alert('材料OCR', 'OCRタブに切り替えました')
        break
    }
  }

  // チャット内クイックアクションボタンをレンダリング
  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('daily_report')}
        activeOpacity={0.7}
      >
        <StyledText variant="body" color="primary" style={styles.quickActionIcon}>・</StyledText>
        <StyledText variant="caption" weight="medium" numberOfLines={1}>
          日報
        </StyledText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('progress')}
        activeOpacity={0.7}
      >
        <StyledText variant="body" color="primary" style={styles.quickActionIcon}>・</StyledText>
        <StyledText variant="caption" weight="medium" numberOfLines={1}>
          進捗
        </StyledText>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={() => handleQuickAction('material_ocr')}
        activeOpacity={0.7}
      >
        <StyledText variant="body" color="primary" style={styles.quickActionIcon}>・</StyledText>
        <StyledText variant="caption" weight="medium" numberOfLines={1}>
          OCR
        </StyledText>
      </TouchableOpacity>
    </View>
  )

  const renderActiveTabContent = () => {
    const tabProps = {
      projectId,
      projectName,
      userRole,
      user
    }

    return (
      <View style={styles.tabContentWrapper}>
        {/* クイックアクションボタン */}
        {renderQuickActions()}
        
        {/* アクティブタブのコンテンツ */}
        <View style={styles.tabContentInner}>
          {(() => {
            switch (activeTab) {
              case 'daily_report':
                return <DailyReportTab {...tabProps} />
              case 'progress':
                return <ProgressTab {...tabProps} />
              case 'material_ocr':
                return <MaterialOCRTab {...tabProps} />
              default:
                return <DailyReportTab {...tabProps} />
            }
          })()}
        </View>
      </View>
    )
  }

  // 削除: renderFloatingAIButton - グローバルFABに統一したため不要

  // 削除: renderAIEstimateModal - 統一ウィザードに移行したため不要
  
  const styles = createStyles(colors, spacing, radius)

  return (
    <SafeAreaView style={styles.container}>
      {/* タブヘッダー */}
      {renderTabHeader()}
      
      {/* アクティブタブのコンテンツ */}
      <View style={styles.tabContent}>
        {renderActiveTabContent()}
      </View>
      
      {/* 統一グローバルFAB */}
      <GlobalFABMenu currentRoute="/projects/[id]/chat" />
    </SafeAreaView>
  )
}

const createStyles = (colors: any, spacing: any, radius: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  tabHeader: {
    backgroundColor: colors.surface,
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  projectInfo: {
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: spacing[2],
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    // borderBottomColor は動的に設定
  },
  tabIcon: {
    marginBottom: spacing[1],
  },
  tabContent: {
    flex: 1,
  },
  tabContentWrapper: {
    flex: 1,
  },
  tabContentInner: {
    flex: 1,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    fontSize: 16,
    marginBottom: spacing[1],
  },
})