import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  ScrollView,
  RefreshControl,
  Alert,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StyledText, StyledButton, StyledInput } from '@/components/ui'
import Card from '../../components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { useColors, useSpacing } from '@/theme/ThemeProvider'
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  checkClientPermissions,
} from '../../lib/client-api'
import {
  Client,
  CreateClientData,
  UpdateClientData,
} from '../../types/client'

interface ClientsScreenState {
  clients: Client[]
  isLoading: boolean
  isRefreshing: boolean
  searchQuery: string
  showAddModal: boolean
  editingClient: Client | null
  permissions: {
    canViewClients: boolean
    canManageClients: boolean
  }
  formData: CreateClientData
  isSubmitting: boolean
}

export default function ClientsScreen() {
  const { user, userProfile } = useAuth()
  const colors = useColors()
  const spacing = useSpacing()

  // 状態管理
  const [state, setState] = useState<ClientsScreenState>({
    clients: [],
    isLoading: false,
    isRefreshing: false,
    searchQuery: '',
    showAddModal: false,
    editingClient: null,
    permissions: {
      canViewClients: false,
      canManageClients: false,
    },
    formData: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      prefecture: '',
      city: '',
      notes: '',
    },
    isSubmitting: false,
  })

  // 初期化処理
  const initializeScreen = useCallback(async () => {
    if (!user || !userProfile) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // 権限確認
      const permissions = await checkClientPermissions()
      
      if (!permissions.canViewClients) {
        Alert.alert('アクセス権限なし', '代表のみがクライアント管理機能を利用できます。', [
          { text: 'OK', onPress: () => router.back() }
        ])
        return
      }

      // クライアント一覧取得
      const result = await getClients()
      if (result.error) {
        Alert.alert('エラー', result.error)
        return
      }

      setState(prev => ({
        ...prev,
        clients: result.data,
        permissions,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Failed to initialize clients screen:', error)
      Alert.alert('エラー', '画面の初期化に失敗しました')
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [user, userProfile])

  // 検索フィルタリング
  const filteredClients = state.clients.filter(client =>
    state.searchQuery === '' ||
    client.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(state.searchQuery.toLowerCase())
  )

  // リフレッシュ処理
  const handleRefresh = async () => {
    setState(prev => ({ ...prev, isRefreshing: true }))
    await initializeScreen()
    setState(prev => ({ ...prev, isRefreshing: false }))
  }

  // フォームデータの更新
  const updateFormData = (updates: Partial<CreateClientData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates }
    }))
  }

  // フォームのリセット
  const resetForm = () => {
    setState(prev => ({
      ...prev,
      formData: {
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        prefecture: '',
        city: '',
        notes: '',
      },
      editingClient: null,
    }))
  }

  // クライアント作成・更新処理
  const handleSaveClient = async () => {
    if (!state.permissions.canManageClients) {
      Alert.alert('権限エラー', 'クライアントを管理する権限がありません')
      return
    }

    setState(prev => ({ ...prev, isSubmitting: true }))

    try {
      let result
      if (state.editingClient) {
        // 更新
        result = await updateClient(state.editingClient.id, state.formData)
      } else {
        // 作成
        result = await createClient(state.formData)
      }

      if (result.error) {
        Alert.alert('エラー', result.error)
        return
      }

      Alert.alert(
        '完了',
        `クライアントが${state.editingClient ? '更新' : '作成'}されました`,
        [{ text: 'OK', onPress: () => {
          setState(prev => ({ ...prev, showAddModal: false }))
          resetForm()
          handleRefresh()
        }}]
      )
    } catch (error) {
      console.error('Failed to save client:', error)
      Alert.alert('エラー', 'クライアントの保存に失敗しました')
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  // クライアント削除処理
  const handleDeleteClient = (client: Client) => {
    Alert.alert(
      '削除確認',
      `クライアント「${client.name}」を削除しますか？\n\n※関連する見積がある場合は無効化されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteClient(client.id)
              if (result.error) {
                Alert.alert('エラー', result.error.message)
                return
              }

              Alert.alert('削除完了', 'クライアントが削除されました', [
                { text: 'OK', onPress: handleRefresh }
              ])
            } catch (error) {
              console.error('Failed to delete client:', error)
              Alert.alert('エラー', 'クライアントの削除に失敗しました')
            }
          }
        }
      ]
    )
  }

  // 編集モード開始
  const startEdit = (client: Client) => {
    setState(prev => ({
      ...prev,
      editingClient: client,
      formData: {
        name: client.name,
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        postal_code: client.postal_code || '',
        prefecture: client.prefecture || '',
        city: client.city || '',
        notes: client.notes || '',
      },
      showAddModal: true,
    }))
  }

  // フォーカス時の初期化
  useFocusEffect(
    useCallback(() => {
      initializeScreen()
    }, [initializeScreen])
  )

  // スタイル定義
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background.primary,
  }

  const headerStyle: ViewStyle = {
    padding: spacing[6],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  }

  const searchStyle: ViewStyle = {
    marginBottom: spacing[4],
  }

  const contentStyle: ViewStyle = {
    flex: 1,
    padding: spacing[4],
  }

  const clientCardStyle: ViewStyle = {
    marginBottom: spacing[4],
  }

  const clientHeaderStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  }

  const clientActionsStyle: ViewStyle = {
    flexDirection: 'row',
    gap: spacing[2],
  }

  const infoRowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  }

  const fabStyle: ViewStyle = {
    position: 'absolute',
    right: spacing[6],
    bottom: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  }

  if (state.isLoading) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <StyledText variant="body" color="secondary">
          読み込み中...
        </StyledText>
      </View>
    )
  }

  if (!state.permissions.canViewClients) {
    return (
      <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
        <Card padding="xl" style={{ alignItems: 'center', maxWidth: 320 }}>
          <Ionicons name="lock-closed" size={48} color={colors.semantic.warning} />
          <StyledText variant="heading3" weight="semibold" align="center" style={{ marginTop: spacing[4] }}>
            アクセス権限が必要です
          </StyledText>
          <StyledText variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
            代表のみがクライアント管理機能を利用できます。
          </StyledText>
          <StyledButton
            title="戻る"
            variant="primary"
            size="lg"
            onPress={() => router.back()}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      {/* ヘッダー */}
      <View style={headerStyle}>
        <StyledText variant="heading2" weight="bold">
          クライアント管理
        </StyledText>
        
        {/* 検索バー */}
        <View style={searchStyle}>
          <StyledInput
            placeholder="クライアント名または担当者名で検索..."
            value={state.searchQuery}
            onChangeText={(text) => setState(prev => ({ ...prev, searchQuery: text }))}
            leftIcon="search"
          />
        </View>
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={contentStyle}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <Card key={client.id} padding="lg" style={clientCardStyle}>
              {/* クライアント名とアクション */}
              <View style={clientHeaderStyle}>
                <View style={{ flex: 1 }}>
                  <StyledText variant="subtitle" weight="semibold">
                    {client.name}
                  </StyledText>
                  {client.contact_person && (
                    <StyledText variant="caption" color="secondary">
                      担当: {client.contact_person}
                    </StyledText>
                  )}
                </View>
                
                {state.permissions.canManageClients && (
                  <View style={clientActionsStyle}>
                    <TouchableOpacity
                      onPress={() => startEdit(client)}
                      style={{ padding: spacing[2] }}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteClient(client)}
                      style={{ padding: spacing[2] }}
                    >
                      <Ionicons name="trash" size={20} color={colors.semantic.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 連絡先情報 */}
              {client.email && (
                <View style={infoRowStyle}>
                  <Ionicons name="mail" size={16} color={colors.text.secondary} />
                  <StyledText variant="caption" color="secondary" style={{ marginLeft: spacing[2] }}>
                    {client.email}
                  </StyledText>
                </View>
              )}
              
              {client.phone && (
                <View style={infoRowStyle}>
                  <Ionicons name="call" size={16} color={colors.text.secondary} />
                  <StyledText variant="caption" color="secondary" style={{ marginLeft: spacing[2] }}>
                    {client.phone}
                  </StyledText>
                </View>
              )}
              
              {client.address && (
                <View style={infoRowStyle}>
                  <Ionicons name="location" size={16} color={colors.text.secondary} />
                  <StyledText variant="caption" color="secondary" style={{ marginLeft: spacing[2] }}>
                    {client.address}
                  </StyledText>
                </View>
              )}

              {/* 最終更新日 */}
              <StyledText variant="caption" color="tertiary" style={{ marginTop: spacing[2] }}>
                更新: {new Date(client.updated_at).toLocaleDateString('ja-JP')}
              </StyledText>
            </Card>
          ))
        ) : (
          <View style={{ alignItems: 'center', padding: spacing[8] }}>
            <Ionicons name="business" size={64} color={colors.text.tertiary} />
            <StyledText variant="subtitle" color="secondary" align="center" style={{ marginTop: spacing[4] }}>
              {state.searchQuery ? '検索結果がありません' : 'クライアントが登録されていません'}
            </StyledText>
            {!state.searchQuery && state.permissions.canManageClients && (
              <StyledText variant="caption" color="tertiary" align="center" style={{ marginTop: spacing[2] }}>
                右下の + ボタンから新しいクライアントを追加できます
              </StyledText>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB - クライアント追加 */}
      {state.permissions.canManageClients && (
        <TouchableOpacity
          style={fabStyle}
          onPress={() => {
            resetForm()
            setState(prev => ({ ...prev, showAddModal: true }))
          }}
        >
          <Ionicons name="add" size={32} color={colors.surface} />
        </TouchableOpacity>
      )}

      {/* クライアント追加・編集モーダル */}
      {state.showAddModal && (
        <ClientFormModal
          visible={state.showAddModal}
          isEditing={!!state.editingClient}
          formData={state.formData}
          onFormDataChange={updateFormData}
          onSave={handleSaveClient}
          onCancel={() => {
            setState(prev => ({ ...prev, showAddModal: false }))
            resetForm()
          }}
          isSubmitting={state.isSubmitting}
        />
      )}
    </View>
  )
}

/**
 * クライアント作成・編集モーダル
 */
interface ClientFormModalProps {
  visible: boolean
  isEditing: boolean
  formData: CreateClientData
  onFormDataChange: (updates: Partial<CreateClientData>) => void
  onSave: () => void
  onCancel: () => void
  isSubmitting: boolean
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  visible,
  isEditing,
  formData,
  onFormDataChange,
  onSave,
  onCancel,
  isSubmitting,
}) => {
  const colors = useColors()
  const spacing = useSpacing()

  if (!visible) return null

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing[4],
    }}>
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing[6],
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
      }}>
        <StyledText variant="heading3" weight="semibold" style={{ marginBottom: spacing[4] }}>
          {isEditing ? 'クライアント編集' : 'クライアント追加'}
        </StyledText>

        <ScrollView showsVerticalScrollIndicator={false}>
          <StyledInput
            label="会社名 *"
            value={formData.name}
            onChangeText={(text) => onFormDataChange({ name: text })}
            placeholder="例: 株式会社サンプル"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="担当者名"
            value={formData.contact_person}
            onChangeText={(text) => onFormDataChange({ contact_person: text })}
            placeholder="例: 田中太郎"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="メールアドレス"
            value={formData.email}
            onChangeText={(text) => onFormDataChange({ email: text })}
            placeholder="例: contact@example.com"
            keyboardType="email-address"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="電話番号"
            value={formData.phone}
            onChangeText={(text) => onFormDataChange({ phone: text })}
            placeholder="例: 03-1234-5678"
            keyboardType="phone-pad"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="郵便番号"
            value={formData.postal_code}
            onChangeText={(text) => onFormDataChange({ postal_code: text })}
            placeholder="例: 123-4567"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="都道府県"
            value={formData.prefecture}
            onChangeText={(text) => onFormDataChange({ prefecture: text })}
            placeholder="例: 東京都"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="市区町村"
            value={formData.city}
            onChangeText={(text) => onFormDataChange({ city: text })}
            placeholder="例: 渋谷区"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="住所"
            value={formData.address}
            onChangeText={(text) => onFormDataChange({ address: text })}
            placeholder="例: 渋谷1-2-3"
            style={{ marginBottom: spacing[4] }}
          />

          <StyledInput
            label="備考"
            value={formData.notes}
            onChangeText={(text) => onFormDataChange({ notes: text })}
            placeholder="その他メモなど"
            multiline
            numberOfLines={3}
            style={{ marginBottom: spacing[6] }}
          />
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          <StyledButton
            title="キャンセル"
            variant="outline"
            size="lg"
            onPress={onCancel}
            disabled={isSubmitting}
            style={{ flex: 1 }}
          />
          <StyledButton
            title={isEditing ? '更新' : '作成'}
            variant="primary"
            size="lg"
            onPress={onSave}
            loading={isSubmitting}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  )
}