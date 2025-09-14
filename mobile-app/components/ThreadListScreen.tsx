import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Thread, ThreadType } from '@/types/thread'

interface Project {
  id: string
  name: string
  description: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  company_id: string
}

interface Company {
  id: string
  name: string
  address: string | null
  created_at: string
}

export default function ThreadListScreen() {
  const { user, profile, loading: authLoading } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchThreadsData = async () => {
    if (!user || !profile?.company_id) {
      setError('ユーザー情報の取得に失敗しました')
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      // プロジェクトデータを取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, status, created_at, updated_at, company_id')
        .eq('company_id', profile.company_id)
        .order('updated_at', { ascending: false })

      if (projectsError) {
        console.error('プロジェクト取得エラー:', projectsError)
        throw new Error('プロジェクトデータの取得に失敗しました')
      }

      // 会社データを取得
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, address, created_at')
        .eq('id', profile.company_id)
        .single()

      if (companyError) {
        console.error('会社情報取得エラー:', companyError)
        throw new Error('会社情報の取得に失敗しました')
      }

      // データを統一されたThread形式に変換
      const threadsList: Thread[] = []

      // 会社スレッドを追加
      if (companyData) {
        threadsList.push({
          id: `company-${companyData.id}`,
          name: `${companyData.name} 本社`,
          type: 'company' as ThreadType,
          icon: '🏢',
          lastMessage: '会社の総合的な情報を管理します',
          lastMessageTime: formatTime(companyData.created_at),
          unreadCount: 0,
        })
      }

      // プロジェクトスレッドを追加
      if (projectsData) {
        projectsData.forEach((project: Project) => {
          threadsList.push({
            id: `project-${project.id}`,
            name: project.name,
            type: 'project' as ThreadType,
            icon: getProjectIcon(project.status),
            lastMessage: project.description || '新しい現場プロジェクトです',
            lastMessageTime: formatTime(project.updated_at),
            unreadCount: Math.floor(Math.random() * 5), // TODO: 実際の未読数を実装
          })
        })
      }

      setThreads(threadsList)
    } catch (error: any) {
      console.error('スレッドデータ取得エラー:', error)
      setError(error.message || 'データの取得に失敗しました')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchThreadsData()
  }

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchThreadsData()
    }
  }, [authLoading, user, profile])

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('ja-JP', { 
        weekday: 'short' 
      })
    } else {
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const getProjectIcon = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '🚧'
      case 'completed':
        return '✅'
      case 'not_started':
        return '📋'
      default:
        return '📁'
    }
  }

  const handleThreadPress = (thread: Thread) => {
    if (thread.type === 'project') {
      const projectId = thread.id.replace('project-', '')
      router.push(`/projects/${projectId}/chat`)
    } else if (thread.type === 'company') {
      // TODO: 会社スレッド画面を実装
      Alert.alert('準備中', '会社スレッドは準備中です')
    }
  }

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity
      style={styles.threadItem}
      onPress={() => handleThreadPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.threadIcon}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.threadTime}>
            {item.lastMessageTime}
          </Text>
        </View>
        
        <View style={styles.threadFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderSeparator = () => <View style={styles.separator} />

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E73E0" />
        <Text style={styles.loadingText}>スレッドを読み込み中...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchThreadsData}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>スレッド</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* スレッドリスト */}
      <FlatList
        data={threads}
        renderItem={renderThread}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={renderSeparator}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#0E73E0']}
            tintColor="#0E73E0"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={threads.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>スレッドがありません</Text>
            <Text style={styles.emptyMessage}>新しいプロジェクトを作成してください</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B1B1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0E73E0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F6F8',
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: '#1B1B1F',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B1B1F',
  },
  searchButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 20,
  },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  threadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1B1F',
    flex: 1,
    marginRight: 8,
  },
  threadTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#0E73E0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F6F8',
    marginLeft: 76,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B1B1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
})