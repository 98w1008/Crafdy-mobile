/**
 * 現場選択モーダルの使用例デモンストレーション
 * 日報作成・勤怠登録等での実装例
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { WorkSite } from '@/types/work-sites';
import WorkSiteSelectionModal from './WorkSiteSelectionModal';

interface WorkSiteSelectionDemoProps {
  title?: string;
  scenario?: string;
}

const WorkSiteSelectionDemo: React.FC<WorkSiteSelectionDemoProps> = ({
  title = '現場選択デモンストレーション',
  scenario = 'daily_report',
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [selectedWorkSite, setSelectedWorkSite] = useState<WorkSite | null>(null);
  const [showWorkSiteModal, setShowWorkSiteModal] = useState(false);

  // シナリオ別の設定
  const getScenarioConfig = () => {
    switch (scenario) {
      case 'daily_report':
        return {
          title: '日報作成',
          description: '作業を行った現場を選択してください',
          buttonText: '現場を選択',
          allowNew: true,
        };
      case 'attendance':
        return {
          title: '勤怠登録',
          description: '出勤する現場を選択してください',
          buttonText: '出勤現場を選択',
          allowNew: false,
        };
      case 'material_delivery':
        return {
          title: '資材配送',
          description: '配送先の現場を選択してください',
          buttonText: '配送先を選択',
          allowNew: false,
        };
      case 'inspection':
        return {
          title: '検査報告',
          description: '検査を実施した現場を選択してください',
          buttonText: '検査現場を選択',
          allowNew: false,
        };
      default:
        return {
          title: '現場選択',
          description: '現場を選択してください',
          buttonText: '現場を選択',
          allowNew: true,
        };
    }
  };

  const config = getScenarioConfig();

  // 現場選択処理
  const handleWorkSiteSelected = (workSite: WorkSite) => {
    setSelectedWorkSite(workSite);
    setShowWorkSiteModal(false);
    
    Alert.alert(
      '現場選択完了',
      `「${workSite.name}」を選択しました。`,
      [{ text: 'OK' }]
    );
  };

  // 現場変更処理
  const handleChangeWorkSite = () => {
    setShowWorkSiteModal(true);
  };

  // 作業継続処理（シナリオ別の例）
  const handleContinueWork = () => {
    if (!selectedWorkSite) {
      Alert.alert('エラー', '現場を選択してください');
      return;
    }

    switch (scenario) {
      case 'daily_report':
        Alert.alert('日報作成', `${selectedWorkSite.name}での日報作成を開始します`);
        break;
      case 'attendance':
        Alert.alert('勤怠登録', `${selectedWorkSite.name}に出勤登録しました`);
        break;
      case 'material_delivery':
        Alert.alert('配送開始', `${selectedWorkSite.name}への配送を開始します`);
        break;
      case 'inspection':
        Alert.alert('検査開始', `${selectedWorkSite.name}の検査報告を開始します`);
        break;
      default:
        Alert.alert('作業開始', `${selectedWorkSite.name}での作業を開始します`);
        break;
    }
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* シナリオ説明 */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{config.title}</Text>
            <Text style={[styles.cardDescription, { color: colors.text }]}>
              {config.description}
            </Text>
          </View>

          {/* 現場選択状態 */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>選択された現場</Text>
            
            {selectedWorkSite ? (
              <View style={styles.selectedWorkSite}>
                <View style={styles.workSiteInfo}>
                  <Text style={[styles.workSiteName, { color: colors.text }]}>
                    {selectedWorkSite.name}
                  </Text>
                  <Text style={[styles.workSiteAddress, { color: colors.text }]}>
                    {selectedWorkSite.address}
                  </Text>
                  <Text style={[styles.workSiteType, { color: colors.text + '80' }]}>
                    {selectedWorkSite.project_type} | {selectedWorkSite.status === 'in_progress' ? '施工中' : selectedWorkSite.status}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.changeButton, { borderColor: colors.tint }]}
                  onPress={handleChangeWorkSite}
                >
                  <Ionicons name="pencil" size={16} color={colors.tint} />
                  <Text style={[styles.changeButtonText, { color: colors.tint }]}>変更</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noWorkSite}>
                <Ionicons name="business-outline" size={48} color={colors.text + '50'} />
                <Text style={[styles.noWorkSiteText, { color: colors.text + '80' }]}>
                  現場が選択されていません
                </Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: colors.tint }]}
                  onPress={() => setShowWorkSiteModal(true)}
                >
                  <Ionicons name="location" size={20} color="white" />
                  <Text style={styles.selectButtonText}>{config.buttonText}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 使用例コード */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>実装例</Text>
            <View style={[styles.codeBlock, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.text + '90' }]}>
{`const [selectedWorkSite, setSelectedWorkSite] = useState<WorkSite | null>(null);
const [showWorkSiteModal, setShowWorkSiteModal] = useState(false);

<WorkSiteSelectionModal
  visible={showWorkSiteModal}
  onSelect={(workSite) => {
    setSelectedWorkSite(workSite);
    setShowWorkSiteModal(false);
  }}
  onClose={() => setShowWorkSiteModal(false)}
  allowNewSiteRegistration={true}
  title="現場を選択"
/>`}
              </Text>
            </View>
          </View>

          {/* 機能説明 */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>主要機能</Text>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="search" size={20} color={colors.tint} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  現場名・住所・発注者での検索機能
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="funnel" size={20} color={colors.tint} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  ステータス・工事種別でのフィルタ機能
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="add-circle" size={20} color={colors.tint} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  新規現場登録機能（多段階入力）
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="location" size={20} color={colors.tint} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  GPS・地図連携での位置情報設定
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="refresh" size={20} color={colors.tint} />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  リアルタイム同期・オフライン対応
                </Text>
              </View>
            </View>
          </View>

          {/* アクションボタン */}
          {selectedWorkSite && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.tint }]}
              onPress={handleContinueWork}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.continueButtonText}>作業を開始</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* 現場選択モーダル */}
      <WorkSiteSelectionModal
        visible={showWorkSiteModal}
        onSelect={handleWorkSiteSelected}
        onClose={() => setShowWorkSiteModal(false)}
        allowNewSiteRegistration={config.allowNew}
        title={config.title}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedWorkSite: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  workSiteInfo: {
    flex: 1,
    marginRight: 12,
  },
  workSiteName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workSiteAddress: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  workSiteType: {
    fontSize: 12,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  noWorkSite: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  noWorkSiteText: {
    fontSize: 14,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  codeBlock: {
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WorkSiteSelectionDemo;