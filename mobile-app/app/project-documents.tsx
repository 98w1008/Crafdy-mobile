import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import Feather from '@expo/vector-icons/Feather'
import {
  addDocument,
  listDocuments,
  removeDocument,
  DOCUMENT_KINDS,
  type DocumentKind,
  type ProjectDocument,
} from '@/lib/project-documents-store'

// 種別ごとの icon
const KIND_ICON: Record<DocumentKind, React.ComponentProps<typeof Feather>['name']> = {
  '工事明細': 'list',
  '請書':     'file-text',
  '工程表':   'calendar',
  '材料見積': 'clipboard',
  'その他':   'paperclip',
}

export default function ProjectDocumentsScreen() {
  const router = useRouter()
  const { projectId, projectName, returnTo } =
    useLocalSearchParams<{ projectId: string; projectName?: string; returnTo?: string }>()

  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [picking, setPicking] = useState(false)

  const reload = useCallback(async () => {
    if (!projectId) return
    const items = await listDocuments(projectId)
    setDocs(items)
  }, [projectId])

  useFocusEffect(useCallback(() => { void reload() }, [reload]))

  const handleBack = () => {
    const to = String(returnTo || '').trim()
    if (to) {
      router.back()
    } else {
      router.replace('/main-chat' as any)
    }
  }

  // 種別選択 → ファイル選択 の 2 ステップ
  const handleAdd = () => {
    Alert.alert(
      '種別を選択',
      'どの種類の資料ですか？',
      [
        ...DOCUMENT_KINDS.map(kind => ({
          text: kind,
          onPress: () => setTimeout(() => pickDocument(kind), 100),
        })),
        { text: 'キャンセル', style: 'cancel' as const },
      ]
    )
  }

  const pickDocument = async (kind: DocumentKind) => {
    if (!projectId) return
    setPicking(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const asset = result.assets?.[0]
      if (!asset) return
      await addDocument({
        projectId,
        kind,
        filename: asset.name,
        uri: asset.uri,
        size: asset.size ?? undefined,
        mimeType: asset.mimeType ?? undefined,
      })
      await reload()
    } catch (e) {
      console.error('Document pick error', e)
      Alert.alert('エラー', 'ファイルの取得に失敗しました')
    } finally {
      setPicking(false)
    }
  }

  const handleRemove = (doc: ProjectDocument) => {
    Alert.alert(
      '削除しますか？',
      `「${doc.filename}」を削除します。`,
      [
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await removeDocument(doc.id)
            await reload()
          },
        },
        { text: 'キャンセル', style: 'cancel' },
      ]
    )
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backBtnText}>戻る</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>現場資料</Text>
          {projectName ? (
            <Text style={styles.headerSub}>{projectName}</Text>
          ) : null}
        </View>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        {/* 追加ボタン */}
        <TouchableOpacity
          style={[styles.addButton, picking && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={picking}
          activeOpacity={0.8}
        >
          {picking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="plus" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.addButtonText}>
            {picking ? 'ファイル選択中…' : 'ファイルを追加'}
          </Text>
        </TouchableOpacity>

        {/* 説明 */}
        <Text style={styles.hint}>
          工事明細・請書・工程表・材料見積などを追加できます。{'\n'}
          追加した資料は後で AI 参照に使用されます。
        </Text>

        {/* 資料一覧 */}
        {docs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="folder" size={36} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>まだ資料がありません</Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.listHeader}>{docs.length} 件の資料</Text>
            {docs.map(doc => (
              <View key={doc.id} style={styles.docItem}>
                <View style={styles.docIcon}>
                  <Feather name={KIND_ICON[doc.kind]} size={18} color="#60A5FA" />
                </View>
                <View style={styles.docBody}>
                  <Text style={styles.docKind}>{doc.kind}</Text>
                  <Text style={styles.docName} numberOfLines={1}>{doc.filename}</Text>
                  <Text style={styles.docMeta}>
                    {formatDate(doc.createdAt)}
                    {doc.size ? `  ·  ${formatSize(doc.size)}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.docRemoveBtn}
                  onPress={() => handleRemove(doc)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  backBtnText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#4B5563',
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 20,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
  list: {
    gap: 8,
  },
  listHeader: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docBody: {
    flex: 1,
    gap: 2,
  },
  docKind: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
  },
  docName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  docMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  docRemoveBtn: {
    padding: 4,
  },
})
