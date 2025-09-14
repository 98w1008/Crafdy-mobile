import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function EstimatesScreen() {
  const [estimates, setEstimates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEstimates()
  }, [])

  const fetchEstimates = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching estimates:', error)
      } else {
        setEstimates(data || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981'
      case 'pending':
        return '#f59e0b'
      case 'rejected':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return '承認済み'
      case 'pending':
        return '承認待ち'
      case 'rejected':
        return '却下'
      default:
        return '下書き'
    }
  }

  const generateEstimate = async () => {
    router.push('/estimate/new')
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>見積管理</Text>
        <TouchableOpacity style={styles.addButton} onPress={generateEstimate}>
          <Text style={styles.addButtonText}>新規見積</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{estimates.length}</Text>
            <Text style={styles.statLabel}>総見積数</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {estimates.filter(e => e.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>承認済み</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              ¥{estimates
                .filter(e => e.status === 'approved')
                .reduce((sum, e) => sum + (e.total_amount || 0), 0)
                .toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>承認金額</Text>
          </View>
        </View>

        {estimates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>見積がありません</Text>
            <Text style={styles.emptyDescription}>
              AIを使って見積を作成したり、{'\n'}
              OCRでレシートを読み取って{'\n'}
              見積データを管理しましょう
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={generateEstimate}>
              <Text style={styles.createButtonText}>見積もりを作成</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.estimateList}>
            {estimates.map((estimate) => (
              <TouchableOpacity 
                key={estimate.id} 
                style={styles.estimateCard}
                onPress={() => console.log(`見積 ${estimate.id} の詳細表示機能は開発中です`)}
              >
                <View style={styles.estimateHeader}>
                  <View style={styles.estimateInfo}>
                    <Text style={styles.estimateTitle}>{estimate.title}</Text>
                    <Text style={styles.projectName}>
                      {estimate.projects?.name || '未分類'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(estimate.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(estimate.status) }]}>
                      {getStatusLabel(estimate.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.estimateDetails}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>見積金額</Text>
                    <Text style={styles.amountValue}>
                      ¥{estimate.total_amount?.toLocaleString() || '0'}
                    </Text>
                  </View>
                  
                  {estimate.description && (
                    <Text style={styles.estimateDescription} numberOfLines={2}>
                      {estimate.description}
                    </Text>
                  )}
                </View>

                <View style={styles.estimateFooter}>
                  <Text style={styles.dateText}>
                    作成日: {new Date(estimate.created_at).toLocaleDateString('ja-JP')}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => console.log(`見積 ${estimate.id} の編集機能は開発中です`)}
                    >
                      <Text style={styles.editButtonText}>編集</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => console.log(`見積 ${estimate.id} の詳細表示機能は開発中です`)}
                    >
                      <Text style={styles.viewButtonText}>詳細 →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 統一フローの案内 */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>🚀 新しい見積もりシステム</Text>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              右下の「➕見積もり」ボタンから{"\n"}
              簡単3ステップで見積もりが作成できます！
            </Text>
            <View style={styles.stepList}>
              <Text style={styles.stepItem}>① 基本情報入力</Text>
              <Text style={styles.stepItem}>② 資料アップロード</Text>
              <Text style={styles.stepItem}>③ AI結果確認・PDF/Excel出力</Text>
            </View>
            <TouchableOpacity 
              style={styles.tryButton}
              onPress={generateEstimate}
            >
              <Text style={styles.tryButtonText}>新フローを試す →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  estimateList: {
    gap: 16,
    marginBottom: 32,
  },
  estimateCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  estimateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  estimateInfo: {
    flex: 1,
    marginRight: 12,
  },
  estimateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  estimateDetails: {
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  estimateDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  estimateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  quickActions: {
    marginTop: 24,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  noticeCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  noticeText: {
    fontSize: 14,
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  stepList: {
    marginBottom: 16,
    gap: 8,
  },
  stepItem: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
    paddingLeft: 8,
  },
  tryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  tryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})