import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, StyleSheet } from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { router } from 'expo-router'

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    checkUser()
    fetchProjects()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/(auth)/login')
    } else {
      setUser(user)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .limit(5)

      if (error) {
        console.error('Error fetching projects:', error)
      } else {
        setProjects(data || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchProjects()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut()
            if (error) {
              Alert.alert('エラー', 'ログアウトに失敗しました')
            } else {
              router.replace('/(auth)/login')
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>C</Text>
        </View>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    )
  }

  const activeProjects = projects.filter(p => p.status === 'in_progress').length
  const completedProjects = projects.filter(p => p.status === 'completed').length

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>ホーム</Text>
            <Text style={styles.welcomeText}>
              おかえりなさい、{user?.user_metadata?.full_name || user?.email?.split('@')[0]}さん
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statEmoji}>📋</Text>
            </View>
            <Text style={styles.statNumber}>{projects.length}</Text>
            <Text style={styles.statLabel}>プロジェクト</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.statEmoji}>⚡</Text>
            </View>
            <Text style={styles.statNumber}>{activeProjects}</Text>
            <Text style={styles.statLabel}>進行中</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#f3e8ff' }]}>
              <Text style={styles.statEmoji}>✅</Text>
            </View>
            <Text style={styles.statNumber}>{completedProjects}</Text>
            <Text style={styles.statLabel}>完了</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>クイックアクション</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#2563eb' }]}>
            <Text style={styles.actionEmoji}>📝</Text>
            <Text style={styles.actionText}>日報作成</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#f97316' }]}
            onPress={() => router.push('/(tabs)/upload')}
          >
            <Text style={styles.actionEmoji}>📱</Text>
            <Text style={styles.actionText}>写真撮影</Text>
          </TouchableOpacity>
        </View>
        
        {/* Navigation Test */}
        <View style={[styles.quickActionsRow, { marginTop: 16 }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
            onPress={() => router.push('/home')}
          >
            <Text style={styles.actionEmoji}>🧭</Text>
            <Text style={styles.actionText}>ナビゲーションテスト</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Projects */}
      <View style={styles.projectsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近のプロジェクト</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/projects')}>
            <Text style={styles.seeAllText}>すべて見る</Text>
          </TouchableOpacity>
        </View>

        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>プロジェクトがありません</Text>
            <Text style={styles.emptyDescription}>
              新しいプロジェクトを作成して{'\n'}現場管理を始めましょう
            </Text>
            <TouchableOpacity style={styles.createProjectButton}>
              <Text style={styles.createProjectButtonText}>プロジェクト作成</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map((project) => (
              <TouchableOpacity 
                key={project.id} 
                style={styles.projectCard}
                onPress={() => router.push(`/projects/${project.id}`)}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>
                    {project.name}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: project.status === 'in_progress' 
                      ? '#dcfce7' 
                      : project.status === 'completed'
                      ? '#dbeafe'
                      : '#f3f4f6'
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: project.status === 'in_progress' 
                        ? '#10b981' 
                        : project.status === 'completed'
                        ? '#2563eb'
                        : '#6b7280'
                      }
                    ]}>
                      {project.status === 'in_progress' ? '進行中' : 
                       project.status === 'completed' ? '完了' : '未開始'}
                    </Text>
                  </View>
                </View>
                
                {project.address && (
                  <Text style={styles.projectAddress}>📍 {project.address}</Text>
                )}
                
                {project.progress_rate > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${project.progress_rate * 100}%` }]}
                      />
                    </View>
                  </View>
                )}
                
                <View style={styles.projectFooter}>
                  <Text style={styles.budgetText}>
                    予算: ¥{project.total_budget?.toLocaleString() || '未設定'}
                  </Text>
                  <Text style={styles.detailText}>詳細を見る →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  logo: {
    width: 48,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 18,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  welcomeText: {
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    backgroundColor: '#ef4444',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statEmoji: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statNumber: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  actionEmoji: {
    color: 'white',
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
  },
  projectsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyDescription: {
    color: '#6b7280',
    textAlign: 'center',
  },
  createProjectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  createProjectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  projectsList: {
    gap: 12,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  projectAddress: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    height: 8,
  },
  progressFill: {
    backgroundColor: '#2563eb',
    height: 8,
    borderRadius: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  detailText: {
    color: '#2563eb',
    fontWeight: '500',
    fontSize: 14,
  },
})