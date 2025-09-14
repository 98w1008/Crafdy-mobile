/**
 * 現場詳細画面
 * 現場情報表示・編集・写真管理・メモ管理機能
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
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
  WorkSiteNote,
  WORK_TYPE_OPTIONS,
  WORK_SITE_STATUS_OPTIONS,
  PROGRESS_STAGE_OPTIONS,
} from '@/types/work-sites';
import { supabase } from '@/lib/supabase';

const WorkSiteDetail: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workSite, setWorkSite] = useState<WorkSite | null>(null);
  const [attachments, setAttachments] = useState<WorkSiteAttachment[]>([]);
  const [notes, setNotes] = useState<WorkSiteNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // データ取得
  const fetchWorkSiteData = useCallback(async (isRefresh = false) => {
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
        .select('*')
        .eq('work_site_id', id)
        .order('taken_at', { ascending: false });

      if (attachmentsError) throw attachmentsError;
      setAttachments(attachmentsData || []);

      // メモ取得
      const { data: notesData, error: notesError } = await supabase
        .from('work_site_notes')
        .select(`
          *,
          user:user_id (
            full_name
          )
        `)
        .eq('work_site_id', id)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);

    } catch (error) {
      console.error('現場詳細データ取得エラー:', error);
      Alert.alert('エラー', '現場データの取得に失敗しました');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkSiteData();
  }, [fetchWorkSiteData]);

  // 電話発信
  const makePhoneCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('エラー', '電話アプリを開けませんでした');
        }
      })
      .catch(err => console.error('電話発信エラー:', err));
  };

  // メール送信
  const sendEmail = (email: string) => {
    const url = `mailto:${email}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('エラー', 'メールアプリを開けませんでした');
        }
      })
      .catch(err => console.error('メール送信エラー:', err));
  };

  // 地図アプリで開く
  const openInMaps = () => {
    if (!workSite?.latitude || !workSite?.longitude) {
      Alert.alert('エラー', '位置情報が設定されていません');
      return;
    }

    const url = `https://maps.apple.com/?q=${workSite.latitude},${workSite.longitude}`;
    Linking.openURL(url);
  };

  // ステータスバッジの色を取得
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'planning': return '#FFA500';
      case 'in_progress': return '#4CAF50';
      case 'completed': return '#2196F3';
      case 'on_hold': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return colors.text;
    }
  };

  // 進捗ステージのラベルを取得
  const getProgressStageLabel = (stage?: string): string => {
    const option = PROGRESS_STAGE_OPTIONS.find(opt => opt.value === stage);
    return option?.label || stage || '';
  };

  // 添付ファイルのタイプ別件数を計算
  const getAttachmentCounts = () => {
    const counts = {
      progress_photo: 0,
      drawing: 0,
      document: 0,
      safety_report: 0,
      inspection_photo: 0,
    };

    attachments.forEach(attachment => {
      if (counts.hasOwnProperty(attachment.file_type)) {
        counts[attachment.file_type as keyof typeof counts]++;
      }
    });

    return counts;
  };

  if (loading || !workSite) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const attachmentCounts = getAttachmentCounts();
  const statusOption = WORK_SITE_STATUS_OPTIONS.find(opt => opt.value === workSite.status);
  const typeOption = WORK_TYPE_OPTIONS.find(opt => opt.value === workSite.project_type);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {workSite.name}
        </Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchWorkSiteData(true)}
            tintColor={colors.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 基本情報カード */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>基本情報</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(workSite.status) }]}>
              <Text style={styles.statusText}>{statusOption?.label || workSite.status}</Text>
            </View>
          </View>

          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>現場名</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workSite.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>工事種別</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {typeOption?.label || workSite.project_type}
              </Text>
            </View>

            <TouchableOpacity style={styles.infoRow} onPress={openInMaps}>
              <Text style={[styles.infoLabel, { color: colors.text }]}>住所</Text>
              <Text style={[styles.infoValue, styles.linkText, { color: colors.tint }]}>
                {workSite.address}
              </Text>
            </TouchableOpacity>

            {workSite.client_name && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>発注者</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{workSite.client_name}</Text>
              </View>
            )}

            {workSite.client_contact && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => makePhoneCall(workSite.client_contact!)}
              >
                <Text style={[styles.infoLabel, { color: colors.text }]}>連絡先</Text>
                <Text style={[styles.infoValue, styles.linkText, { color: colors.tint }]}>
                  {workSite.client_contact}
                </Text>
              </TouchableOpacity>
            )}

            {workSite.client_email && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => sendEmail(workSite.client_email!)}
              >
                <Text style={[styles.infoLabel, { color: colors.text }]}>メール</Text>
                <Text style={[styles.infoValue, styles.linkText, { color: colors.tint }]}>
                  {workSite.client_email}
                </Text>
              </TouchableOpacity>
            )}

            {(workSite.construction_start || workSite.construction_end) && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>工期</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {workSite.construction_start ? 
                    new Date(workSite.construction_start).toLocaleDateString('ja-JP') : ''
                  }
                  {workSite.construction_start && workSite.construction_end ? ' 〜 ' : ''}
                  {workSite.construction_end ? 
                    new Date(workSite.construction_end).toLocaleDateString('ja-JP') : ''
                  }
                </Text>
              </View>
            )}

            {workSite.budget && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.text }]}>予算</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  ¥{workSite.budget.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 写真・資料カード */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>写真・資料</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push(`/work-sites/gallery/${id}`)}
            >
              <Text style={[styles.viewAllText, { color: colors.tint }]}>すべて表示</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <View style={styles.attachmentSummary}>
            <View style={styles.attachmentItem}>
              <Ionicons name="camera" size={20} color={colors.text} />
              <Text style={[styles.attachmentLabel, { color: colors.text }]}>進捗写真</Text>
              <Text style={[styles.attachmentCount, { color: colors.tint }]}>
                {attachmentCounts.progress_photo}
              </Text>
            </View>

            <View style={styles.attachmentItem}>
              <Ionicons name="document-text" size={20} color={colors.text} />
              <Text style={[styles.attachmentLabel, { color: colors.text }]}>図面</Text>
              <Text style={[styles.attachmentCount, { color: colors.tint }]}>
                {attachmentCounts.drawing}
              </Text>
            </View>

            <View style={styles.attachmentItem}>
              <Ionicons name="folder" size={20} color={colors.text} />
              <Text style={[styles.attachmentLabel, { color: colors.text }]}>書類</Text>
              <Text style={[styles.attachmentCount, { color: colors.tint }]}>
                {attachmentCounts.document}
              </Text>
            </View>

            <View style={styles.attachmentItem}>
              <Ionicons name="shield-checkmark" size={20} color={colors.text} />
              <Text style={[styles.attachmentLabel, { color: colors.text }]}>安全報告</Text>
              <Text style={[styles.attachmentCount, { color: colors.tint }]}>
                {attachmentCounts.safety_report}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.uploadButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              // TODO: ファイルアップロード処理
              Alert.alert('開発中', 'ファイルアップロード機能は開発中です');
            }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.uploadButtonText}>写真・資料を追加</Text>
          </TouchableOpacity>
        </View>

        {/* メモカード */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>メモ</Text>
            <TouchableOpacity style={styles.addNoteButton}>
              <Ionicons name="add" size={20} color={colors.tint} />
            </TouchableOpacity>
          </View>

          {notes.length > 0 ? (
            <View style={styles.notesList}>
              {notes.slice(0, 3).map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteContent, { color: colors.text }]} numberOfLines={2}>
                      {note.content}
                    </Text>
                    {note.is_important && (
                      <Ionicons name="star" size={16} color="#FFA500" />
                    )}
                  </View>
                  <Text style={[styles.noteDate, { color: colors.text + '80' }]}>
                    {new Date(note.created_at).toLocaleDateString('ja-JP')} - {(note.user as any)?.full_name || 'Unknown'}
                  </Text>
                </View>
              ))}
              {notes.length > 3 && (
                <TouchableOpacity style={styles.moreNotesButton}>
                  <Text style={[styles.moreNotesText, { color: colors.tint }]}>
                    他{notes.length - 3}件のメモを表示
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyNotes}>
              <Ionicons name="document-text-outline" size={32} color={colors.text + '50'} />
              <Text style={[styles.emptyText, { color: colors.text + '80' }]}>
                メモがまだありません
              </Text>
            </View>
          )}
        </View>

        {/* 備考・特記事項カード */}
        {(workSite.notes || workSite.safety_requirements || workSite.special_instructions || workSite.access_instructions) && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>備考・特記事項</Text>

            {workSite.notes && (
              <View style={styles.remarksSection}>
                <Text style={[styles.remarksLabel, { color: colors.text }]}>一般備考</Text>
                <Text style={[styles.remarksText, { color: colors.text }]}>{workSite.notes}</Text>
              </View>
            )}

            {workSite.safety_requirements && (
              <View style={styles.remarksSection}>
                <Text style={[styles.remarksLabel, { color: colors.text }]}>安全要求事項</Text>
                <Text style={[styles.remarksText, { color: colors.text }]}>{workSite.safety_requirements}</Text>
              </View>
            )}

            {workSite.special_instructions && (
              <View style={styles.remarksSection}>
                <Text style={[styles.remarksLabel, { color: colors.text }]}>特別指示事項</Text>
                <Text style={[styles.remarksText, { color: colors.text }]}>{workSite.special_instructions}</Text>
              </View>
            )}

            {workSite.access_instructions && (
              <View style={styles.remarksSection}>
                <Text style={[styles.remarksLabel, { color: colors.text }]}>アクセス方法</Text>
                <Text style={[styles.remarksText, { color: colors.text }]}>{workSite.access_instructions}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  menuButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  infoRows: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  attachmentSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: width / 2 - 40,
    gap: 8,
  },
  attachmentLabel: {
    fontSize: 14,
    flex: 1,
  },
  attachmentCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addNoteButton: {
    padding: 4,
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    gap: 6,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  noteContent: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
  },
  moreNotesButton: {
    paddingVertical: 8,
  },
  moreNotesText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  remarksSection: {
    marginBottom: 16,
  },
  remarksLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  remarksText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default WorkSiteDetail;