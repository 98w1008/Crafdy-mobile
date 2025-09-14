/**
 * 現場写真ギャラリー画面
 * 現場の添付ファイル一覧表示・フィルタ・プレビュー機能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  WorkSite,
  WorkSiteAttachment,
  AttachmentType,
  ProgressStage,
  ATTACHMENT_TYPE_OPTIONS,
  PROGRESS_STAGE_OPTIONS,
} from '@/types/work-sites';
import { supabase } from '@/lib/supabase';

const WorkSiteGallery: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workSite, setWorkSite] = useState<WorkSite | null>(null);
  const [attachments, setAttachments] = useState<WorkSiteAttachment[]>([]);
  const [filteredAttachments, setFilteredAttachments] = useState<WorkSiteAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // フィルタ状態
  const [selectedFileType, setSelectedFileType] = useState<AttachmentType | 'all'>('all');
  const [selectedProgressStage, setSelectedProgressStage] = useState<ProgressStage | 'all'>('all');
  
  // プレビューモーダル
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    attachment: WorkSiteAttachment | null;
    index: number;
  }>({
    visible: false,
    attachment: null,
    index: 0,
  });

  // データ取得
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!id) return;
      
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 現場情報取得
      const { data: workSiteData, error: workSiteError } = await supabase
        .from('work_sites')
        .select('*')
        .eq('id', id)
        .single();

      if (workSiteError) throw workSiteError;
      setWorkSite(workSiteData);

      // 添付ファイル取得
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('work_site_attachments')
        .select(`
          *,
          user:uploaded_by (
            full_name
          )
        `)
        .eq('work_site_id', id)
        .order('taken_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);
      setFilteredAttachments(attachmentsData || []);

    } catch (error) {
      console.error('ギャラリーデータ取得エラー:', error);
      Alert.alert('エラー', 'データの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // フィルタリング処理
  useEffect(() => {
    let filtered = attachments;

    if (selectedFileType !== 'all') {
      filtered = filtered.filter(item => item.file_type === selectedFileType);
    }

    if (selectedProgressStage !== 'all') {
      filtered = filtered.filter(item => item.progress_stage === selectedProgressStage);
    }

    setFilteredAttachments(filtered);
  }, [attachments, selectedFileType, selectedProgressStage]);

  // プレビューモーダルを開く
  const openPreview = (attachment: WorkSiteAttachment, index: number) => {
    setPreviewModal({
      visible: true,
      attachment,
      index,
    });
  };

  // プレビューモーダルを閉じる
  const closePreview = () => {
    setPreviewModal({
      visible: false,
      attachment: null,
      index: 0,
    });
  };

  // 次の画像に移動
  const goToNextImage = () => {
    const nextIndex = previewModal.index + 1;
    if (nextIndex < filteredAttachments.length) {
      setPreviewModal({
        visible: true,
        attachment: filteredAttachments[nextIndex],
        index: nextIndex,
      });
    }
  };

  // 前の画像に移動
  const goToPrevImage = () => {
    const prevIndex = previewModal.index - 1;
    if (prevIndex >= 0) {
      setPreviewModal({
        visible: true,
        attachment: filteredAttachments[prevIndex],
        index: prevIndex,
      });
    }
  };

  // ファイルタイプのラベル取得
  const getFileTypeLabel = (type: AttachmentType): string => {
    const option = ATTACHMENT_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label || type;
  };

  // 進捗ステージのラベル取得
  const getProgressStageLabel = (stage?: ProgressStage): string => {
    if (!stage) return '';
    const option = PROGRESS_STAGE_OPTIONS.find(opt => opt.value === stage);
    return option?.label || stage;
  };

  // ファイルタイプアイコン取得
  const getFileTypeIcon = (type: AttachmentType): string => {
    switch (type) {
      case 'progress_photo': return 'camera';
      case 'drawing': return 'document-text';
      case 'document': return 'folder';
      case 'safety_report': return 'shield-checkmark';
      case 'inspection_photo': return 'checkmark-circle';
      default: return 'document';
    }
  };

  // 添付ファイルアイテムのレンダリング
  const renderAttachmentItem = ({ item, index }: { item: WorkSiteAttachment; index: number }) => {
    const isImage = item.mime_type?.startsWith('image/');
    
    return (
      <TouchableOpacity
        style={[styles.attachmentItem, { backgroundColor: colors.card }]}
        onPress={() => openPreview(item, index)}
        activeOpacity={0.8}
      >
        {isImage ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.thumbnail_url || item.file_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={[styles.fileTypeBadge, { backgroundColor: colors.tint }]}>
              <Ionicons name={getFileTypeIcon(item.file_type)} size={12} color="white" />
            </View>
          </View>
        ) : (
          <View style={[styles.documentContainer, { borderColor: colors.border }]}>
            <Ionicons name={getFileTypeIcon(item.file_type)} size={32} color={colors.text} />
          </View>
        )}

        <View style={styles.attachmentInfo}>
          <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>
            {item.file_name}
          </Text>
          
          <View style={styles.attachmentMeta}>
            <Text style={[styles.fileType, { color: colors.text }]}>
              {getFileTypeLabel(item.file_type)}
            </Text>
            
            {item.progress_stage && (
              <Text style={[styles.progressStage, { color: colors.tint }]}>
                {getProgressStageLabel(item.progress_stage)}
              </Text>
            )}
          </View>

          <Text style={[styles.uploadDate, { color: colors.text + '80' }]}>
            {new Date(item.taken_at).toLocaleDateString('ja-JP')}
            {item.user && ` - ${(item.user as any).full_name}`}
          </Text>

          {item.description && (
            <Text style={[styles.description, { color: colors.text }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // フィルタボタンのレンダリング
  const renderFilterButton = (
    label: string,
    value: string,
    currentValue: string,
    onPress: (value: any) => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: value === currentValue ? colors.tint : colors.card,
          borderColor: value === currentValue ? colors.tint : colors.border,
        }
      ]}
      onPress={() => onPress(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: value === currentValue ? 'white' : colors.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // 空の状態のレンダリング
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="image-outline" size={64} color={colors.text + '50'} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {selectedFileType !== 'all' || selectedProgressStage !== 'all'
          ? '条件に一致するファイルがありません'
          : 'ファイルがまだ追加されていません'
        }
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.text + '80' }]}>
        写真や資料を追加して現場の記録を残しましょう
      </Text>
    </View>
  );

  if (loading || !workSite) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ヘッダー */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>写真・資料</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text + '80' }]}>{workSite.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Alert.alert('開発中', 'ファイルアップロード機能は開発中です');
            }}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* フィルタセクション */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>ファイル種別:</Text>
          <View style={styles.filterRow}>
            {renderFilterButton('すべて', 'all', selectedFileType, setSelectedFileType)}
            {ATTACHMENT_TYPE_OPTIONS.map(option => 
              renderFilterButton(option.label, option.value, selectedFileType, setSelectedFileType)
            )}
          </View>

          <Text style={[styles.filterLabel, { color: colors.text }]}>進捗段階:</Text>
          <View style={styles.filterRow}>
            {renderFilterButton('すべて', 'all', selectedProgressStage, setSelectedProgressStage)}
            {PROGRESS_STAGE_OPTIONS.map(option => 
              renderFilterButton(option.label, option.value, selectedProgressStage, setSelectedProgressStage)
            )}
          </View>
        </View>

        {/* ファイル一覧 */}
        <FlatList
          data={filteredAttachments}
          renderItem={renderAttachmentItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {/* プレビューモーダル */}
      <Modal
        visible={previewModal.visible}
        animationType="fade"
        onRequestClose={closePreview}
        statusBarTranslucent
      >
        <View style={styles.previewContainer}>
          {/* プレビューヘッダー */}
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={closePreview} style={styles.previewCloseButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.previewHeaderCenter}>
              <Text style={styles.previewTitle}>
                {previewModal.index + 1} / {filteredAttachments.length}
              </Text>
              {previewModal.attachment && (
                <Text style={styles.previewSubtitle}>
                  {getFileTypeLabel(previewModal.attachment.file_type)}
                </Text>
              )}
            </View>
            <View style={styles.previewHeaderRight} />
          </View>

          {/* プレビューコンテンツ */}
          {previewModal.attachment && (
            <View style={styles.previewContent}>
              {previewModal.attachment.mime_type?.startsWith('image/') ? (
                <Image
                  source={{ uri: previewModal.attachment.file_url }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewDocument}>
                  <Ionicons
                    name={getFileTypeIcon(previewModal.attachment.file_type)}
                    size={64}
                    color="white"
                  />
                  <Text style={styles.previewDocumentName}>
                    {previewModal.attachment.file_name}
                  </Text>
                </View>
              )}

              {/* ナビゲーションボタン */}
              {previewModal.index > 0 && (
                <TouchableOpacity style={styles.prevButton} onPress={goToPrevImage}>
                  <Ionicons name="chevron-back" size={32} color="white" />
                </TouchableOpacity>
              )}
              
              {previewModal.index < filteredAttachments.length - 1 && (
                <TouchableOpacity style={styles.nextButton} onPress={goToNextImage}>
                  <Ionicons name="chevron-forward" size={32} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* プレビュー情報 */}
          {previewModal.attachment && (
            <View style={styles.previewInfo}>
              <Text style={styles.previewFileName}>
                {previewModal.attachment.file_name}
              </Text>
              
              <View style={styles.previewMeta}>
                <Text style={styles.previewMetaText}>
                  {new Date(previewModal.attachment.taken_at).toLocaleDateString('ja-JP')}
                </Text>
                {previewModal.attachment.progress_stage && (
                  <Text style={styles.previewMetaText}>
                    {getProgressStageLabel(previewModal.attachment.progress_stage)}
                  </Text>
                )}
              </View>

              {previewModal.attachment.description && (
                <Text style={styles.previewDescription}>
                  {previewModal.attachment.description}
                </Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

const { width, height } = Dimensions.get('window');

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
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-around',
  },
  attachmentItem: {
    flex: 0.48,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageContainer: {
    aspectRatio: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  fileTypeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  documentContainer: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  attachmentInfo: {
    padding: 12,
    gap: 6,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  attachmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileType: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressStage: {
    fontSize: 12,
    fontWeight: '500',
  },
  uploadDate: {
    fontSize: 11,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // プレビューモーダルスタイル
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  previewCloseButton: {
    padding: 4,
  },
  previewHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  previewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
  previewHeaderRight: {
    width: 32,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: width,
    height: height - 200,
  },
  previewDocument: {
    alignItems: 'center',
    gap: 16,
  },
  previewDocumentName: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  prevButton: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  nextButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -16,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  previewInfo: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 8,
  },
  previewFileName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewMetaText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
  },
  previewDescription: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WorkSiteGallery;