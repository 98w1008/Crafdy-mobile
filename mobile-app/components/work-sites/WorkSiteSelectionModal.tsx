/**
 * 現場選択モーダル
 * 既存現場の一覧表示・検索・フィルタ機能
 * 新規現場登録フローへの導線も提供
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  WorkSite,
  WorkSiteSearchFilters,
  WorkSiteStatus,
  WorkType,
  WORK_TYPE_OPTIONS,
  WORK_SITE_STATUS_OPTIONS,
} from '@/types/work-sites';
import { supabase } from '@/lib/supabase';
import NewWorkSiteModal from './NewWorkSiteModal';

interface WorkSiteSelectionModalProps {
  visible: boolean;
  onSelect: (workSite: WorkSite) => void;
  onClose: () => void;
  allowNewSiteRegistration?: boolean;
  currentWorkSiteId?: string; // 現在選択中の現場ID（除外用）
  title?: string;
}

interface WorkSiteCardProps {
  workSite: WorkSite;
  onPress: () => void;
  isSelected: boolean;
}

const WorkSiteCard: React.FC<WorkSiteCardProps> = ({ workSite, onPress, isSelected }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getStatusColor = (status: WorkSiteStatus): string => {
    switch (status) {
      case 'planning': return '#FFA500';
      case 'in_progress': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'on_hold': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return colors.text;
    }
  };

  const getStatusLabel = (status: WorkSiteStatus): string => {
    const option = WORK_SITE_STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getTypeLabel = (type: WorkType): string => {
    const option = WORK_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label || type;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.workSiteCard,
        {
          backgroundColor: colors.background,
          borderColor: isSelected ? colors.tint : colors.border,
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.siteName, { color: colors.text }]} numberOfLines={1}>
          {workSite.name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workSite.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(workSite.status)}</Text>
        </View>
      </View>

      <Text style={[styles.siteAddress, { color: colors.text }]} numberOfLines={2}>
        <Ionicons name="location-outline" size={14} color={colors.text} />
        {' '}{workSite.address}
      </Text>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.text }]}>工事種別:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {getTypeLabel(workSite.project_type)}
          </Text>
        </View>

        {workSite.client_name && (
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text }]}>発注者:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
              {workSite.client_name}
            </Text>
          </View>
        )}

        {(workSite.construction_start || workSite.construction_end) && (
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.text }]}>工期:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(workSite.construction_start)} 〜 {formatDate(workSite.construction_end)}
            </Text>
          </View>
        )}
      </View>

      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const WorkSiteSelectionModal: React.FC<WorkSiteSelectionModalProps> = ({
  visible,
  onSelect,
  onClose,
  allowNewSiteRegistration = true,
  currentWorkSiteId,
  title = '現場を選択',
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [filteredWorkSites, setFilteredWorkSites] = useState<WorkSite[]>([]);
  const [selectedWorkSite, setSelectedWorkSite] = useState<WorkSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<WorkSiteSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);

  // 現場データを取得
  const fetchWorkSites = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証が必要です');

      let query = supabase
        .from('work_sites')
        .select('*')
        .order('created_at', { ascending: false });

      // 現在の現場を除外
      if (currentWorkSiteId) {
        query = query.neq('id', currentWorkSiteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setWorkSites(data || []);
      setFilteredWorkSites(data || []);
    } catch (error) {
      console.error('現場データ取得エラー:', error);
      Alert.alert('エラー', '現場データの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentWorkSiteId]);

  // 検索・フィルタリング処理
  const applyFilters = useCallback(() => {
    let filtered = workSites;

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(query) ||
        site.address.toLowerCase().includes(query) ||
        (site.client_name && site.client_name.toLowerCase().includes(query))
      );
    }

    // ステータスでフィルタ
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(site => filters.status!.includes(site.status));
    }

    // 工事種別でフィルタ
    if (filters.project_type && filters.project_type.length > 0) {
      filtered = filtered.filter(site => filters.project_type!.includes(site.project_type));
    }

    // 工期でフィルタ
    if (filters.date_range?.start || filters.date_range?.end) {
      filtered = filtered.filter(site => {
        if (!site.construction_start) return false;
        
        const startDate = new Date(site.construction_start);
        
        if (filters.date_range?.start && startDate < filters.date_range.start) {
          return false;
        }
        
        if (filters.date_range?.end && startDate > filters.date_range.end) {
          return false;
        }
        
        return true;
      });
    }

    setFilteredWorkSites(filtered);
  }, [workSites, searchQuery, filters]);

  useEffect(() => {
    if (visible) {
      fetchWorkSites();
    }
  }, [visible, fetchWorkSites]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // 現場選択処理
  const handleSelectWorkSite = (workSite: WorkSite) => {
    setSelectedWorkSite(workSite);
  };

  // 選択確定処理
  const handleConfirmSelection = () => {
    if (selectedWorkSite) {
      onSelect(selectedWorkSite);
    }
  };

  // 新規現場作成完了処理
  const handleNewWorkSiteCreated = (newWorkSite: WorkSite) => {
    setShowNewSiteModal(false);
    setWorkSites(prev => [newWorkSite, ...prev]);
    setSelectedWorkSite(newWorkSite);
  };

  const renderWorkSiteItem = ({ item }: { item: WorkSite }) => (
    <WorkSiteCard
      workSite={item}
      onPress={() => handleSelectWorkSite(item)}
      isSelected={selectedWorkSite?.id === item.id}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="business-outline" size={64} color={colors.text} opacity={0.3} />
      <Text style={[styles.emptyText, { color: colors.text }]}>
        {searchQuery || Object.keys(filters).length > 0
          ? '条件に一致する現場がありません'
          : '現場が登録されていません'
        }
      </Text>
      {allowNewSiteRegistration && (
        <TouchableOpacity
          style={[styles.newSiteButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowNewSiteModal(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.newSiteButtonText}>新規現場を登録</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={styles.filterButton}
            >
              <Ionicons
                name={showFilters ? "options" : "options-outline"}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* 検索バー */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.text} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="現場名、住所、発注者で検索"
                placeholderTextColor={colors.text + '80'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* フィルタパネル */}
          {showFilters && (
            <View style={[styles.filtersPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>フィルタ</Text>
              {/* フィルタ実装は簡略化 */}
              <TouchableOpacity
                style={[styles.clearFiltersButton, { borderColor: colors.border }]}
                onPress={() => setFilters({})}
              >
                <Text style={[styles.clearFiltersText, { color: colors.text }]}>クリア</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 現場リスト */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>読み込み中...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredWorkSites}
                renderItem={renderWorkSiteItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchWorkSites(true)}
                    tintColor={colors.tint}
                  />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* ボトムバー */}
          <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            {allowNewSiteRegistration && (
              <TouchableOpacity
                style={[styles.newSiteBottomButton, { borderColor: colors.tint }]}
                onPress={() => setShowNewSiteModal(true)}
              >
                <Ionicons name="add-outline" size={20} color={colors.tint} />
                <Text style={[styles.newSiteBottomButtonText, { color: colors.tint }]}>
                  新規現場登録
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: selectedWorkSite ? colors.tint : colors.border,
                  opacity: selectedWorkSite ? 1 : 0.5,
                }
              ]}
              onPress={handleConfirmSelection}
              disabled={!selectedWorkSite}
            >
              <Text style={styles.selectButtonText}>
                {selectedWorkSite ? '選択' : '現場を選択してください'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 新規現場登録モーダル */}
      <NewWorkSiteModal
        visible={showNewSiteModal}
        onClose={() => setShowNewSiteModal(false)}
        onWorkSiteCreated={handleNewWorkSiteCreated}
      />
    </>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersPanel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  workSiteCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  siteName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  siteAddress: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardDetails: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 70,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  newSiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newSiteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  newSiteBottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  newSiteBottomButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  selectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkSiteSelectionModal;