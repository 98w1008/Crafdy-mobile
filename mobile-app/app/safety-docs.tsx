import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Constants from 'expo-constants'
import { useAuth } from '@/contexts/AuthContext'
import { useUiTheme } from '@/ui/theme'
type BlocksTable = {
  columns: string[]
  rows: string[][]
}

type BlocksActions = Record<string, { url?: string; [key: string]: any }>

type BlocksDoc = {
  type: string
  title: string
  status: string
  url: string
}

type BlocksPayload = {
  v: number
  text?: string
  table?: BlocksTable
  fields?: Record<string, unknown>
  actions?: BlocksActions
  doc?: BlocksDoc
}

type MissingField = {
  key: string
  label: string
  type?: string
}

type SafetyDocResponse = {
  blocks: BlocksPayload
  meta?: Record<string, unknown>
  missing_fields?: MissingField[]
}

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants?.expoConfig as any)?.extra?.supabaseUrl ||
  ''

const DOC_TYPES: Array<{ id: string; label: string }> = [
  { id: 'ky', label: 'KY' },
  { id: 'toolbox', label: 'TBM' },
]

function resolveFunctionUrl(path: string) {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL is not configured')
  }

  try {
    const base = new URL(SUPABASE_URL)
    const normalizedPath = path.replace(/^\/+/, '')
    if (base.hostname.endsWith('.supabase.co')) {
      const fnHost = base.hostname.replace('.supabase.co', '.functions.supabase.co')
      return `${base.protocol}//${fnHost}/${normalizedPath}`
    }
    return `${base.origin.replace(/\/$/, '')}/functions/v1/${normalizedPath}`
  } catch {
    // fallback to string concatenation
    const trimmed = SUPABASE_URL.replace(/\/$/, '')
    if (trimmed.includes('.supabase.co')) {
      return trimmed.replace('.supabase.co', '.functions.supabase.co') + '/' + path.replace(/^\/+/, '')
    }
    return `${trimmed}/functions/v1/${path.replace(/^\/+/, '')}`
  }
}

const SAFETY_DOC_ENDPOINT = resolveFunctionUrl('safety-docs/safety-doc-generate')

export default function SafetyDocsScreen() {
  const theme = useUiTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { session, projectAccess } = useAuth()

  const [projectId, setProjectId] = useState<string>('')
  const [docType, setDocType] = useState<string>('ky')
  const [attendeesInput, setAttendeesInput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SafetyDocResponse | null>(null)

  useEffect(() => {
    if (!projectId && projectAccess.length > 0) {
      setProjectId(projectAccess[0].project_id)
    }
  }, [projectAccess, projectId])

  const fetchDocument = useCallback(async () => {
    if (!session?.access_token) {
      setError('未ログインのため安全書類を取得できません')
      return
    }
    if (!projectId) {
      setError('プロジェクトIDを入力してください')
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const attendeeList = attendeesInput
        .split(/[,\n]/)
        .map(value => value.trim())
        .filter(Boolean)

      const payload: Record<string, unknown> = { projectId, docType }
      if (attendeeList.length) {
        payload.fields = { attendees: attendeeList }
      }

      const response = await fetch(SAFETY_DOC_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`API error ${response.status}: ${errorText || response.statusText}`)
      }

      const result = (await response.json()) as SafetyDocResponse
      setData(result)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('タイムアウトしました。ネットワークを確認してください。')
      } else {
        setError(err?.message || '安全書類の取得に失敗しました')
      }
      setData(null)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }, [session?.access_token, projectId, docType])

  useEffect(() => {
    if (projectId) {
      fetchDocument().catch(console.warn)
    }
  }, [fetchDocument, projectId, docType])

  const handlePreview = useCallback((url?: string) => {
    if (!url) {
      Alert.alert('プレビューURLが見つかりません')
      return
    }
    Linking.openURL(url).catch(() => Alert.alert('URLを開けませんでした', url))
  }, [])

  const handleExport = useCallback((action: { url?: string } | Record<string, unknown> | undefined) => {
    if (!action) {
      Alert.alert('エクスポート情報がありません')
      return
    }
    console.log('export payload:', action)
    Alert.alert('エクスポート', 'エクスポート処理は後日実装予定です。コンソールを参照してください。')
  }, [])

  const handleOpenPage = useCallback((payload: Record<string, unknown> | undefined) => {
    if (!payload) {
      Alert.alert('ページ情報がありません')
      return
    }
    console.log('open page payload:', payload)
    Alert.alert('ページ遷移', 'アプリ内ナビゲーションは後日実装予定です。')
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>安全書類プレビュー</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>プロジェクトID</Text>
        <TextInput
          value={projectId}
          onChangeText={setProjectId}
          placeholder='00000000-0000-0000-0000-000000000000'
          autoCapitalize='none'
          style={styles.input}
        />
      </View>

      <View style={styles.docTypeGroup}>
        {DOC_TYPES.map(item => {
          const isActive = item.id === docType
          return (
            <Pressable
              key={item.id}
              onPress={() => setDocType(item.id)}
              style={[styles.docTypeButton, isActive && styles.docTypeButton_active]}
            >
              <Text style={[styles.docTypeLabel, isActive && styles.docTypeLabel_active]}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>出席者（カンマ区切り）</Text>
        <TextInput
          value={attendeesInput}
          onChangeText={setAttendeesInput}
          placeholder='親方, 安全担当, 足場班代表'
          autoCapitalize='none'
          style={styles.input}
        />
      </View>

      <Pressable style={styles.reloadButton} onPress={fetchDocument} disabled={loading}>
        <Text style={styles.reloadLabel}>{loading ? '取得中...' : '最新の下書きを取得'}</Text>
      </Pressable>

      {loading && (
        <View style={styles.stateBox}>
          <ActivityIndicator />
          <Text style={styles.stateText}>安全書類を読み込み中です...</Text>
        </View>
      )}

      {error && (
        <View style={[styles.stateBox, styles.errorBox]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && data && (
        <View style={styles.resultBox}>
          {data.blocks?.text ? <Text style={styles.title}>{data.blocks.text}</Text> : null}

          {data.blocks?.table ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {data.blocks.table.columns.map(column => (
                  <Text key={column} style={[styles.tableCell, styles.tableHeaderText]}>
                    {column}
                  </Text>
                ))}
              </View>
              {data.blocks.table.rows.map((row, index) => (
                <View key={`row-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                  {row.map((value, idx) => (
                    <Text key={`cell-${index}-${idx}`} style={styles.tableCell}>
                      {value}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {data.blocks?.fields ? (
            <View style={styles.fieldsBox}>
              {Object.entries(data.blocks.fields).map(([key, value]) => (
                <View key={key} style={styles.fieldRow}>
                  <Text style={styles.fieldKey}>{key}</Text>
                  <Text style={styles.fieldValue}>{Array.isArray(value) ? value.join(', ') : String(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {data.blocks?.actions ? (
            <View style={styles.actionList}>
              {data.blocks.actions.preview_pdf?.url ? (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handlePreview(data.blocks.actions.preview_pdf?.url)}
                >
                  <Text style={styles.actionButtonLabel}>プレビュー</Text>
                </Pressable>
              ) : null}
              {data.blocks.actions.export_xlsx || data.blocks.actions.export_csv ? (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleExport(data.blocks.actions.export_xlsx ?? data.blocks.actions.export_csv)}
                >
                  <Text style={styles.actionButtonLabel}>エクスポート</Text>
                </Pressable>
              ) : null}
              {data.blocks.actions.open_page ? (
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleOpenPage(data.blocks.actions.open_page)}
                >
                  <Text style={styles.actionButtonLabel}>ページを開く</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {data.blocks?.doc?.url ? (
            <Pressable
              style={styles.docLink}
              onPress={() => Linking.openURL(data.blocks.doc!.url).catch(() => Alert.alert('リンクを開けませんでした'))}
            >
              <Text style={styles.docLinkText}>{data.blocks.doc.title} を開く</Text>
            </Pressable>
          ) : null}

          {data.missing_fields?.length ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                {`${data.missing_fields[0].label || data.missing_fields[0].key} を入力してください`}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  )
}

const createStyles = (theme: ReturnType<typeof useUiTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 24,
      gap: 16,
    },
    heading: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
    },
    docTypeGroup: {
      flexDirection: 'row',
      gap: 12,
    },
    docTypeButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    docTypeButton_active: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    docTypeLabel: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    docTypeLabel_active: {
      color: '#fff',
    },
    reloadButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
    },
    reloadLabel: {
      color: '#fff',
      fontWeight: '600',
    },
    stateBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
    },
    stateText: {
      color: theme.colors.muted,
    },
    errorBox: {
      backgroundColor: '#fee2e2',
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    errorText: {
      color: '#b91c1c',
      fontWeight: '500',
    },
    resultBox: {
      gap: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    table: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
    },
    tableRow: {
      flexDirection: 'row',
    },
    tableRowAlt: {
      backgroundColor: theme.colors.surface,
    },
    tableCell: {
      flex: 1,
      padding: 12,
      color: theme.colors.text,
    },
    tableHeaderText: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    fieldsBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    fieldRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    fieldKey: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    fieldValue: {
      color: theme.colors.muted,
      flexShrink: 1,
      textAlign: 'right',
      marginLeft: 16,
    },
    actionList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    actionButtonLabel: {
      color: theme.colors.text,
      fontWeight: '600',
    },
    docLink: {
      paddingVertical: 12,
    },
    docLinkText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    banner: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#fef3c7',
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    bannerText: {
      color: '#92400e',
      fontWeight: '600',
    },
    stateBoxText: {
      color: theme.colors.muted,
    },
  })
