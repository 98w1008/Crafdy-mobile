import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import { createInvitationCode, getInvitationCodes, InvitationCode } from '@/lib/invitation-system'
import { supabase } from '@/lib/supabase'
import * as Haptics from 'expo-haptics'
// クリップボード機能（Expo対応ラッパー使用）
import { copyText } from '@/src/utils/clipboard'

interface Project {
  id: string
  name: string
  location: string
}

interface ProjectMember {
  id: string
  user_id: string
  project_id: string
  role: string
  started_at: string
  ended_at?: string | null
  full_name: string
  email: string
  project_name: string
}

export default function ManageLeadsScreen() {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, location')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('プロジェクト取得エラー:', error)
        return
      }

      setProjects(data || [])
    } catch (error) {
      console.error('プロジェクト取得エラー:', error)
    }
  }, [user?.id])

  const loadProjectMembers = useCallback(async () => {
    try {
      // 2段階クエリでリレーション問題を回避
      // 1. まず自分が作成したprojectsのIDリストを取得
      const { data: myProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', user?.id)

      if (projectsError) {
        console.error('プロジェクト取得エラー:', projectsError)
        return
      }

      if (!myProjects || myProjects.length === 0) {
        setProjectMembers([])
        return
      }

      const projectIds = myProjects.map(p => p.id)

      // 2. 取得したprojectIDsを使ってproject_membersを取得
      const { data, error } = await supabase
        .from('projects_users') // ヒントに従い正しいテーブル名を使用
        .select(`
          *,
          profiles!user_id(full_name, email),
          projects!project_id(name)
        `)
        .in('project_id', projectIds)
        .eq('role', 'lead')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('プロジェクトメンバー取得エラー:', error)
        return
      }

      const formattedMembers = data?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        project_id: member.project_id,
        role: member.role,
        started_at: member.created_at, // projects_usersテーブルの場合
        ended_at: undefined, // 現在はendedカラムがないと仮定
        full_name: member.profiles?.full_name || '不明',
        email: member.profiles?.email || '',
        project_name: member.projects?.name || '不明なプロジェクト',
      })) || []

      setProjectMembers(formattedMembers)
    } catch (error) {
      console.error('プロジェクトメンバー取得エラー:', error)
    }
  }, [user?.id])

  const loadInvitationCodes = useCallback(async () => {
    if (!user?.id) return

    try {
      const result = await getInvitationCodes(user.id)
      if (result.error) {
        console.error('招待コード取得エラー:', result.error)
        return
      }
      setInvitationCodes(result.codes)
    } catch (error) {
      console.error('招待コード取得エラー:', error)
    }
  }, [user?.id])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 並列実行でパフォーマンス向上、個別エラーハンドリング
      const results = await Promise.allSettled([
        loadProjects(),
        loadProjectMembers(),
        loadInvitationCodes()
      ])

      // 失敗した処理があれば警告
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.warn('一部データの読み込みに失敗:', failures)
        Alert.alert(
          '警告',
          '一部のデータが読み込めませんでした。ネットワーク接続を確認してください。',
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error)
      Alert.alert(
        'エラー',
        'データの読み込みに失敗しました。アプリを再起動してください。',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }, [loadProjects, loadProjectMembers, loadInvitationCodes])

  useEffect(() => {
    if (user && profile?.role === 'parent') {
      loadData()
    }
  }, [user, profile, loadData])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }


  const handleCreateInvitationCode = async () => {
    if (!selectedProject || !user?.id) return

    setGeneratingCode(true)
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      
      const result = await createInvitationCode(selectedProject.id, user.id)
      
      if (result.error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Alert.alert('エラー', result.error)
        return
      }

      // 招待コードをクリップボードにコピー
      const clipboardSuccess = await copyText(result.code)
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      
      const clipboardMessage = clipboardSuccess 
        ? 'クリップボードにコピーしました。'
        : '手動でコピーしてください。'
      
      Alert.alert(
        '招待コード生成完了',
        `招待コード: ${result.code}\n\n${clipboardMessage}\n職長候補者にこのコードを伝えてください。\n\n有効期限: 72時間`,
        [
          { text: 'OK', onPress: () => setShowInviteModal(false) }
        ]
      )

      // データを再読み込み
      try {
        await loadInvitationCodes()
      } catch (reloadError) {
        console.warn('招待コード再読み込み失敗:', reloadError)
        // 表示データが古くても機能的に問題ないので続行
      }
    } catch (error) {
      console.error('招待コード生成エラー:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert(
        'エラー', 
        '招待コードの生成に失敗しました。ネットワーク接続を確認して再度お試しください。'
      )
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleRemoveMember = async (member: ProjectMember) => {
    Alert.alert(
      '職長の担当を外す',
      `${member.full_name}さんを${member.project_name}現場から外しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '担当を外す',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('projects_users')
                .delete()
                .eq('id', member.id)

              if (error) {
                console.error('メンバー削除エラー:', error)
                Alert.alert('エラー', '担当を外すことができませんでした')
                return
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              Alert.alert('完了', `${member.full_name}さんの担当を外しました`)
              await loadProjectMembers()
            } catch (error) {
              console.error('メンバー削除エラー:', error)
              Alert.alert('エラー', '担当を外すことができませんでした')
            }
          }
        }
      ]
    )
  }


  const handleCopyCode = async (code: string) => {
    try {
      const success = await copyText(code)
      
      if (success) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        Alert.alert(
          '📋 コピー完了', 
          '招待コードをクリップボードにコピーしました。\n\n現場の職長候補者に伝えてください。'
        )
      } else {
        throw new Error('クリップボード操作が失敗しました')
      }
    } catch (error) {
      console.error('クリップボードコピーエラー:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      
      // フォールバック: 手動コピー用のダイアログ
      Alert.alert(
        '⚠️ クリップボードエラー', 
        `招待コード: ${code}\n\n自動コピーに失敗しました。\n上記コードを手動でコピーしてください。\n\n有効期限: 72時間`,
        [
          { text: 'OK' },
          { 
            text: '再試行', 
            onPress: () => handleCopyCode(code) 
          }
        ]
      )
    }
  }

  const renderProjectMember = ({ item }: { item: ProjectMember }) => (
    <Card variant="elevated" style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <StyledText variant="subtitle" weight="semibold">
            {item.full_name}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            {item.email}
          </StyledText>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item)}
        >
          <StyledText variant="caption" color="error">
            担当を外す
          </StyledText>
        </TouchableOpacity>
      </View>
      
      <View style={styles.projectInfo}>
        <StyledText variant="body" weight="medium">
          担当現場: {item.project_name}
        </StyledText>
        <StyledText variant="caption" color="secondary">
          開始日: {new Date(item.started_at).toLocaleDateString('ja-JP')}
        </StyledText>
      </View>
    </Card>
  )

  const renderInvitationCode = ({ item }: { item: InvitationCode }) => (
    <Card variant="elevated" style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <View style={styles.invitationInfo}>
          <StyledText variant="subtitle" weight="semibold" style={styles.codeText}>
            {item.code}
          </StyledText>
          <StyledText variant="caption" color="secondary">
            有効期限: {new Date(item.expires_at).toLocaleDateString('ja-JP')}
          </StyledText>
        </View>
        <TouchableOpacity
          style={styles.copyButton}
          onPress={() => handleCopyCode(item.code)}
        >
          <StyledText variant="caption" color="primary">
            コピー
          </StyledText>
        </TouchableOpacity>
      </View>
      
      <View style={styles.invitationStatus}>
        <StyledText variant="caption" color="secondary">
          ステータス: {item.used_at ? '使用済み' : '未使用'}
        </StyledText>
        <StyledText variant="caption" color="secondary">
          作成日: {new Date(item.created_at).toLocaleDateString('ja-JP')}
        </StyledText>
      </View>
    </Card>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <StyledText variant="body" color="secondary">
            読み込み中...
          </StyledText>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            職長管理
          </StyledText>
          <StyledText variant="caption" color="secondary">
            招待・権限・引き継ぎ
          </StyledText>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 招待コード生成 */}
        <Card variant="premium" style={styles.actionCard}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            新しい職長を招待
          </StyledText>
          <StyledText variant="body" color="secondary" style={styles.sectionDescription}>
            現場に職長を追加するには、招待コードを生成して候補者に伝えてください
          </StyledText>
          
          <StyledButton
            title="招待コードを生成"
            variant="primary"
            size="lg"
            onPress={() => setShowInviteModal(true)}
            style={styles.inviteButton}
          />
        </Card>

        {/* 現在の職長一覧 */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            現在の職長 ({projectMembers.length}名)
          </StyledText>
          
          {projectMembers.length > 0 ? (
            <FlatList
              data={projectMembers}
              renderItem={renderProjectMember}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <StyledText variant="body" color="secondary" align="center">
                まだ職長が登録されていません
              </StyledText>
            </View>
          )}
        </Card>

        {/* 招待コード履歴 */}
        <Card variant="elevated" style={styles.section}>
          <StyledText variant="subtitle" weight="semibold" style={styles.sectionTitle}>
            招待コード履歴
          </StyledText>
          
          {invitationCodes.length > 0 ? (
            <FlatList
              data={invitationCodes.slice(0, 5)} // 最新5件
              renderItem={renderInvitationCode}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <StyledText variant="body" color="secondary" align="center">
                招待コードの履歴がありません
              </StyledText>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* 招待コード生成モーダル */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <StyledText variant="title" weight="semibold">
              招待コード生成
            </StyledText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInviteModal(false)}
            >
              <StyledText variant="title" color="secondary">×</StyledText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <StyledText variant="body" color="secondary" style={styles.modalDescription}>
              職長を招待する現場を選択してください
            </StyledText>

            <View style={styles.projectList}>
              {projects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectItem,
                    selectedProject?.id === project.id && styles.projectItemSelected
                  ]}
                  onPress={() => setSelectedProject(project)}
                >
                  <View style={styles.projectItemContent}>
                    <StyledText variant="body" weight="medium">
                      {project.name}
                    </StyledText>
                    <StyledText variant="caption" color="secondary">
                      {project.location}
                    </StyledText>
                  </View>
                  {selectedProject?.id === project.id && (
                    <StyledText variant="title" color="primary">✓</StyledText>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <StyledButton
              title={generatingCode ? "生成中..." : "招待コードを生成"}
              variant="primary"
              size="lg"
              onPress={handleCreateInvitationCode}
              disabled={!selectedProject || generatingCode}
              loading={generatingCode}
              style={styles.generateButton}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
    ...Shadows.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  actionCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  inviteButton: {
    minWidth: 200,
  },
  memberCard: {
    marginBottom: Spacing.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  memberInfo: {
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.semantic.error + '20',
    borderRadius: BorderRadius.sm,
  },
  projectInfo: {
    gap: Spacing.xs,
  },
  invitationCard: {
    marginBottom: Spacing.sm,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  invitationInfo: {
    flex: 1,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: Typography.sizes.lg,
    letterSpacing: 2,
  },
  copyButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.accent[100],
    borderRadius: BorderRadius.sm,
  },
  invitationStatus: {
    gap: Spacing.xs,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border.light,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  projectList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.light.background.surface,
    borderWidth: 1,
    borderColor: Colors.light.border.medium,
    borderRadius: BorderRadius.lg,
  },
  projectItemSelected: {
    borderColor: Colors.accent.DEFAULT,
    backgroundColor: Colors.accent[100],
  },
  projectItemContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  generateButton: {
    minHeight: 56,
  },
})