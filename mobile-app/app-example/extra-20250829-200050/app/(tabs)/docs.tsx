import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'

interface Document {
  id: string
  name: string
  type: 'contract' | 'drawing' | 'estimate' | 'report' | 'photo' | 'other'
  size: number
  createdAt: string
  projectName?: string
  uploadedBy: string
}

export default function DocsTab() {
  const { user, profile } = useAuth()
  const userRole = useRole()

  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: '建築契約書_新宿マンション.pdf',
      type: 'contract',
      size: 2.4 * 1024 * 1024, // 2.4MB
      createdAt: '2024-12-15T10:30:00Z',
      projectName: '新宿マンション建設',
      uploadedBy: '田中太郎'
    },
    {
      id: '2',
      name: '施工図面_1F平面図.pdf',
      type: 'drawing', 
      size: 8.7 * 1024 * 1024, // 8.7MB
      createdAt: '2024-12-14T14:20:00Z',
      projectName: '新宿マンション建設',
      uploadedBy: '佐藤花子'
    },
    {
      id: '3',
      name: '見積書_材料費_20241210.xlsx',
      type: 'estimate',
      size: 156 * 1024, // 156KB
      createdAt: '2024-12-10T16:45:00Z',
      projectName: 'オフィスビル改修',
      uploadedBy: '山田次郎'
    },
    {
      id: '4',
      name: '安全点検報告書_12月.pdf',
      type: 'report',
      size: 640 * 1024, // 640KB
      createdAt: '2024-12-08T09:15:00Z',
      uploadedBy: '田中太郎'
    },
  ])

  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  const getDocumentIcon = (type: Document['type']): string => {
    switch (type) {
      case 'contract': return '📄'
      case 'drawing': return '📐'
      case 'estimate': return '💰'
      case 'report': return '📋'
      case 'photo': return '📷'
      default: return '📁'
    }
  }

  const getDocumentTypeText = (type: Document['type']): string => {
    switch (type) {
      case 'contract': return '契約書'
      case 'drawing': return '図面'
      case 'estimate': return '見積書'
      case 'report': return '報告書'
      case 'photo': return '写真'
      default: return 'その他'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filters = [
    { id: 'all', label: 'すべて', count: documents.length },
    { id: 'contract', label: '契約書', count: documents.filter(d => d.type === 'contract').length },
    { id: 'drawing', label: '図面', count: documents.filter(d => d.type === 'drawing').length },
    { id: 'estimate', label: '見積書', count: documents.filter(d => d.type === 'estimate').length },
    { id: 'report', label: '報告書', count: documents.filter(d => d.type === 'report').length },
  ]

  const filteredDocuments = selectedFilter === 'all' 
    ? documents 
    : documents.filter(doc => doc.type === selectedFilter)

  const renderDocument = ({ item }: { item: Document }) => (
    <Card variant="default" style={styles.documentCard} pressable onPress={() => {
      Alert.alert('ドキュメント', `${item.name}\n\nサイズ: ${formatFileSize(item.size)}\nアップロード: ${item.uploadedBy}`)
    }}>
      <View style={styles.documentHeader}>
        <View style={styles.documentIcon}>
          <StyledText variant="title" style={styles.iconText}>
            {getDocumentIcon(item.type)}
          </StyledText>
        </View>
        <View style={styles.documentInfo}>
          <StyledText variant="body" weight="semibold" color="primary" numberOfLines={1}>
            {item.name}
          </StyledText>
          <View style={styles.documentMeta}>
            <StyledText variant="caption" color="secondary">
              {getDocumentTypeText(item.type)} • {formatFileSize(item.size)}
            </StyledText>
            <StyledText variant="caption" color="tertiary">
              {formatDate(item.createdAt)}
            </StyledText>
          </View>
        </View>
      </View>

      {item.projectName && (
        <View style={styles.projectTag}>
          <StyledText variant="caption" color="tertiary">
            📁 {item.projectName}
          </StyledText>
        </View>
      )}

      <View style={styles.documentFooter}>
        <StyledText variant="caption" color="tertiary">
          👤 {item.uploadedBy}
        </StyledText>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('開発中', 'ダウンロード機能は開発中です')}
        >
          <StyledText variant="caption" color="primary">
            ↓ ダウンロード
          </StyledText>
        </TouchableOpacity>
      </View>
    </Card>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <StyledText variant="heading2" weight="bold" color="primary">
          ドキュメント
        </StyledText>
        <StyledText variant="body" color="secondary">
          プロジェクトファイル管理
        </StyledText>
      </View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <StyledButton
          title="+ アップロード"
          variant="primary"
          size="md"
          onPress={() => Alert.alert('開発中', 'ファイルアップロード機能は開発中です')}
          style={styles.uploadButton}
        />
      </View>

      {/* フィルター */}
      <ScrollView 
        horizontal
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <StyledText 
              variant="body" 
              weight="medium"
              color={selectedFilter === filter.id ? "onPrimary" : "secondary"}
            >
              {filter.label} ({filter.count})
            </StyledText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ドキュメント一覧 */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        style={styles.documentsList}
        contentContainerStyle={styles.documentsContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Card variant="outlined" style={styles.emptyState}>
            <StyledText variant="heading3" align="center" style={styles.emptyIcon}>
              📁
            </StyledText>
            <StyledText variant="title" weight="semibold" align="center" color="primary">
              ドキュメントがありません
            </StyledText>
            <StyledText variant="body" color="secondary" align="center" style={styles.emptyDescription}>
              ファイルをアップロードして管理を始めましょう
            </StyledText>
          </Card>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  uploadButton: {
    alignSelf: 'flex-start',
  },
  filterContainer: {
    backgroundColor: Colors.base.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.base.surfaceSubtle,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  filterChipActive: {
    backgroundColor: Colors.primary.DEFAULT,
    borderColor: Colors.primary.DEFAULT,
  },
  documentsList: {
    flex: 1,
  },
  documentsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  documentCard: {
    marginBottom: Spacing.md,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  documentIcon: {
    width: 48,
    height: 48,
    backgroundColor: Colors.base.surfaceSubtle,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 24,
  },
  documentInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  documentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectTag: {
    marginBottom: Spacing.sm,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary.alpha[10],
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginTop: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.lg,
  },
  emptyDescription: {
    marginTop: Spacing.sm,
  },
})