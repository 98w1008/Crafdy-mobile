/**
 * 新規現場登録モーダル
 * 多段階ステップでの現場情報入力・位置情報設定・保存機能
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  WorkSite,
  WorkSiteFormData,
  WorkSiteFormErrors,
  WorkType,
  LocationData,
  WORK_TYPE_OPTIONS,
} from '@/types/work-sites';
import { supabase } from '@/lib/supabase';
import locationService from '@/lib/location-service';
import addressSearchService from '@/lib/address-search';
import LocationPicker from './LocationPicker';

interface NewWorkSiteModalProps {
  visible: boolean;
  onClose: () => void;
  onWorkSiteCreated: (workSite: WorkSite) => void;
}

type Step = 'basic_info' | 'location' | 'additional_info' | 'confirmation';

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'basic_info', title: '基本情報', description: '現場名と発注者情報を入力' },
  { id: 'location', title: '住所・位置', description: '住所と位置情報を設定' },
  { id: 'additional_info', title: '詳細情報', description: '工期や予算等の詳細を入力' },
  { id: 'confirmation', title: '確認', description: '入力内容を確認して登録' },
];

const NewWorkSiteModal: React.FC<NewWorkSiteModalProps> = ({
  visible,
  onClose,
  onWorkSiteCreated,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);

  // ステップ管理
  const [currentStep, setCurrentStep] = useState<Step>('basic_info');
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);

  // フォームデータ
  const [formData, setFormData] = useState<WorkSiteFormData>({
    name: '',
    address: '',
    project_type: '新築',
  });

  // エラー状態
  const [errors, setErrors] = useState<WorkSiteFormErrors>({});
  
  // UI状態
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // フォームデータ更新
  const updateFormData = (updates: Partial<WorkSiteFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // エラーをクリア
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key as keyof WorkSiteFormErrors];
    });
    setErrors(newErrors);
  };

  // バリデーション
  const validateStep = (step: Step): WorkSiteFormErrors => {
    const stepErrors: WorkSiteFormErrors = {};

    switch (step) {
      case 'basic_info':
        if (!formData.name.trim()) {
          stepErrors.name = '現場名を入力してください';
        } else if (formData.name.trim().length < 3) {
          stepErrors.name = '現場名は3文字以上で入力してください';
        }

        if (!formData.project_type) {
          stepErrors.project_type = '工事種別を選択してください';
        }
        break;

      case 'location':
        if (!formData.address.trim()) {
          stepErrors.address = '住所を入力してください';
        } else if (formData.address.trim().length < 5) {
          stepErrors.address = '住所を正確に入力してください';
        }
        break;

      case 'additional_info':
        if (formData.construction_start && formData.construction_end) {
          if (formData.construction_start >= formData.construction_end) {
            stepErrors.construction_end = '完了予定日は開始予定日より後の日付を選択してください';
          }
        }

        if (formData.client_email && !isValidEmail(formData.client_email)) {
          stepErrors.client_email = '正しいメールアドレスを入力してください';
        }

        if (formData.budget && formData.budget < 0) {
          stepErrors.budget = '予算は0以上の値を入力してください';
        }
        break;
    }

    return stepErrors;
  };

  // メールアドレス検証
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ステップ進行
  const nextStep = () => {
    const stepErrors = validateStep(currentStep);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // ステップ戻る
  const previousStep = () => {
    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // 現在位置を取得
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await locationService.getCurrentPosition();
      const address = await locationService.reverseGeocode(location.latitude, location.longitude);
      
      updateFormData({
        address: address.address || formData.address,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: address.address,
          postal_code: address.postalCode,
        },
      });
    } catch (error) {
      Alert.alert('エラー', '現在位置を取得できませんでした');
    } finally {
      setLoading(false);
    }
  };

  // 住所から位置情報を取得
  const geocodeAddress = async () => {
    if (!formData.address.trim()) return;

    try {
      setLoading(true);
      const results = await addressSearchService.geocodeAddress(formData.address);
      
      if (results.length > 0) {
        const result = results[0];
        updateFormData({
          location: {
            latitude: result.latitude,
            longitude: result.longitude,
            address: result.formatted_address || result.address,
            postal_code: result.postal_code,
          },
        });
      } else {
        Alert.alert('住所検索', '住所に対応する位置情報が見つかりませんでした');
      }
    } catch (error) {
      Alert.alert('エラー', '住所の位置情報取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 位置選択完了
  const handleLocationSelected = (locationData: LocationData) => {
    updateFormData({ location: locationData });
    setShowLocationPicker(false);
  };

  // 現場登録実行
  const createWorkSite = async () => {
    try {
      setLoading(true);

      // 最終バリデーション
      const allErrors = {
        ...validateStep('basic_info'),
        ...validateStep('location'),
        ...validateStep('additional_info'),
      };

      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        Alert.alert('入力エラー', '入力内容を確認してください');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証が必要です');

      // ユーザーの会社IDを取得
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userData?.company_id) {
        throw new Error('会社情報が見つかりません');
      }

      // 現場データを作成
      const workSiteData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: formData.location?.latitude || null,
        longitude: formData.location?.longitude || null,
        postal_code: formData.location?.postal_code || null,
        client_name: formData.client_name?.trim() || null,
        client_contact: formData.client_contact?.trim() || null,
        client_email: formData.client_email?.trim() || null,
        project_type: formData.project_type,
        construction_start: formData.construction_start?.toISOString().split('T')[0] || null,
        construction_end: formData.construction_end?.toISOString().split('T')[0] || null,
        budget: formData.budget || null,
        notes: formData.notes?.trim() || null,
        safety_requirements: formData.safety_requirements?.trim() || null,
        special_instructions: formData.special_instructions?.trim() || null,
        access_instructions: formData.access_instructions?.trim() || null,
        company_id: userData.company_id,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('work_sites')
        .insert([workSiteData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('成功', '現場を登録しました', [
        {
          text: 'OK',
          onPress: () => {
            onWorkSiteCreated(data);
            handleClose();
          },
        },
      ]);
    } catch (error) {
      console.error('現場登録エラー:', error);
      Alert.alert('エラー', '現場の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // モーダル閉じる
  const handleClose = () => {
    setCurrentStep('basic_info');
    setFormData({
      name: '',
      address: '',
      project_type: '新築',
    });
    setErrors({});
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setShowLocationPicker(false);
    onClose();
  };

  // 基本情報ステップ
  const renderBasicInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>基本情報</Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>現場名 *</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, borderColor: errors.name ? '#F44336' : colors.border, color: colors.text }
          ]}
          placeholder="例: 渋谷区新築工事"
          placeholderTextColor={colors.text + '80'}
          value={formData.name}
          onChangeText={(value) => updateFormData({ name: value })}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>工事種別 *</Text>
        <View style={styles.projectTypeContainer}>
          {WORK_TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.projectTypeOption,
                {
                  backgroundColor: formData.project_type === option.value ? colors.tint : colors.card,
                  borderColor: formData.project_type === option.value ? colors.tint : colors.border,
                }
              ]}
              onPress={() => updateFormData({ project_type: option.value })}
            >
              <Text
                style={[
                  styles.projectTypeText,
                  { color: formData.project_type === option.value ? 'white' : colors.text }
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.project_type && <Text style={styles.errorText}>{errors.project_type}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>発注者名</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
          ]}
          placeholder="発注者名を入力"
          placeholderTextColor={colors.text + '80'}
          value={formData.client_name || ''}
          onChangeText={(value) => updateFormData({ client_name: value })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>発注者連絡先</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
          ]}
          placeholder="電話番号を入力"
          placeholderTextColor={colors.text + '80'}
          value={formData.client_contact || ''}
          onChangeText={(value) => updateFormData({ client_contact: value })}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  // 住所・位置ステップ
  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>住所・位置情報</Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>住所 *</Text>
        <View style={styles.addressInputContainer}>
          <TextInput
            style={[
              styles.textInput,
              styles.addressInput,
              { backgroundColor: colors.card, borderColor: errors.address ? '#F44336' : colors.border, color: colors.text }
            ]}
            placeholder="住所を入力してください"
            placeholderTextColor={colors.text + '80'}
            value={formData.address}
            onChangeText={(value) => updateFormData({ address: value })}
            multiline
          />
          <TouchableOpacity
            style={[styles.locationButton, { backgroundColor: colors.tint }]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="location" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
      </View>

      <View style={styles.locationActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={geocodeAddress}
          disabled={!formData.address.trim() || loading}
        >
          <Ionicons name="search" size={20} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>住所検索</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowLocationPicker(true)}
        >
          <Ionicons name="map" size={20} color={colors.text} />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>地図で選択</Text>
        </TouchableOpacity>
      </View>

      {formData.location && (
        <View style={[styles.locationInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.locationInfoTitle, { color: colors.text }]}>設定済み位置情報</Text>
          <Text style={[styles.locationInfoText, { color: colors.text }]}>
            緯度: {formData.location.latitude.toFixed(6)}
          </Text>
          <Text style={[styles.locationInfoText, { color: colors.text }]}>
            経度: {formData.location.longitude.toFixed(6)}
          </Text>
          {formData.location.address && (
            <Text style={[styles.locationInfoText, { color: colors.text }]}>
              住所: {formData.location.address}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  // 詳細情報ステップ
  const renderAdditionalInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>詳細情報</Text>

      <View style={styles.dateRow}>
        <View style={styles.dateInputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>着工予定日</Text>
          <TouchableOpacity
            style={[
              styles.dateInput,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={[styles.dateText, { color: formData.construction_start ? colors.text : colors.text + '80' }]}>
              {formData.construction_start ? 
                formData.construction_start.toLocaleDateString('ja-JP') : 
                '日付を選択'
              }
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.dateInputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>完了予定日</Text>
          <TouchableOpacity
            style={[
              styles.dateInput,
              { 
                backgroundColor: colors.card, 
                borderColor: errors.construction_end ? '#F44336' : colors.border 
              }
            ]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={[styles.dateText, { color: formData.construction_end ? colors.text : colors.text + '80' }]}>
              {formData.construction_end ? 
                formData.construction_end.toLocaleDateString('ja-JP') : 
                '日付を選択'
              }
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      {errors.construction_end && <Text style={styles.errorText}>{errors.construction_end}</Text>}

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>発注者メールアドレス</Text>
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: colors.card, 
              borderColor: errors.client_email ? '#F44336' : colors.border,
              color: colors.text 
            }
          ]}
          placeholder="メールアドレスを入力"
          placeholderTextColor={colors.text + '80'}
          value={formData.client_email || ''}
          onChangeText={(value) => updateFormData({ client_email: value })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.client_email && <Text style={styles.errorText}>{errors.client_email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>予算（円）</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
          ]}
          placeholder="予算を入力"
          placeholderTextColor={colors.text + '80'}
          value={formData.budget?.toString() || ''}
          onChangeText={(value) => {
            const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
            updateFormData({ budget: isNaN(numericValue) ? undefined : numericValue });
          }}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>備考・特記事項</Text>
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }
          ]}
          placeholder="備考や特記事項があれば入力してください"
          placeholderTextColor={colors.text + '80'}
          value={formData.notes || ''}
          onChangeText={(value) => updateFormData({ notes: value })}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  // 確認ステップ
  const renderConfirmationStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>入力内容確認</Text>

      <View style={[styles.confirmationCard, { backgroundColor: colors.card }]}>
        <View style={styles.confirmationRow}>
          <Text style={[styles.confirmationLabel, { color: colors.text }]}>現場名</Text>
          <Text style={[styles.confirmationValue, { color: colors.text }]}>{formData.name}</Text>
        </View>

        <View style={styles.confirmationRow}>
          <Text style={[styles.confirmationLabel, { color: colors.text }]}>工事種別</Text>
          <Text style={[styles.confirmationValue, { color: colors.text }]}>
            {WORK_TYPE_OPTIONS.find(opt => opt.value === formData.project_type)?.label}
          </Text>
        </View>

        <View style={styles.confirmationRow}>
          <Text style={[styles.confirmationLabel, { color: colors.text }]}>住所</Text>
          <Text style={[styles.confirmationValue, { color: colors.text }]}>{formData.address}</Text>
        </View>

        {formData.client_name && (
          <View style={styles.confirmationRow}>
            <Text style={[styles.confirmationLabel, { color: colors.text }]}>発注者</Text>
            <Text style={[styles.confirmationValue, { color: colors.text }]}>{formData.client_name}</Text>
          </View>
        )}

        {formData.construction_start && (
          <View style={styles.confirmationRow}>
            <Text style={[styles.confirmationLabel, { color: colors.text }]}>着工予定</Text>
            <Text style={[styles.confirmationValue, { color: colors.text }]}>
              {formData.construction_start.toLocaleDateString('ja-JP')}
            </Text>
          </View>
        )}

        {formData.construction_end && (
          <View style={styles.confirmationRow}>
            <Text style={[styles.confirmationLabel, { color: colors.text }]}>完了予定</Text>
            <Text style={[styles.confirmationValue, { color: colors.text }]}>
              {formData.construction_end.toLocaleDateString('ja-JP')}
            </Text>
          </View>
        )}

        {formData.location && (
          <View style={styles.confirmationRow}>
            <Text style={[styles.confirmationLabel, { color: colors.text }]}>位置情報</Text>
            <Text style={[styles.confirmationValue, { color: colors.text }]}>設定済み</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.tint }]}
        onPress={createWorkSite}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color="white" />
            <Text style={styles.createButtonText}>現場を登録</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // 日付ピッカー
  const renderDatePicker = () => (
    <>
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.construction_start || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              updateFormData({ construction_start: selectedDate });
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.construction_end || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              updateFormData({ construction_end: selectedDate });
            }
          }}
        />
      )}
    </>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>新規現場登録</Text>
            <View style={styles.headerRight} />
          </View>

          {/* プログレスバー */}
          <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
            <View style={styles.progressBar}>
              {STEPS.map((step, index) => (
                <View
                  key={step.id}
                  style={[
                    styles.progressStep,
                    {
                      backgroundColor: index <= currentStepIndex ? colors.tint : colors.border,
                    }
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {currentStepIndex + 1} / {STEPS.length} - {STEPS[currentStepIndex].title}
            </Text>
          </View>

          {/* コンテンツ */}
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {currentStep === 'basic_info' && renderBasicInfoStep()}
              {currentStep === 'location' && renderLocationStep()}
              {currentStep === 'additional_info' && renderAdditionalInfoStep()}
              {currentStep === 'confirmation' && renderConfirmationStep()}
            </ScrollView>

            {/* ボタン */}
            {currentStep !== 'confirmation' && (
              <View style={[styles.buttonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.backButton,
                    { 
                      backgroundColor: colors.card, 
                      borderColor: colors.border,
                      opacity: currentStepIndex > 0 ? 1 : 0.5 
                    }
                  ]}
                  onPress={previousStep}
                  disabled={currentStepIndex === 0}
                >
                  <Text style={[styles.backButtonText, { color: colors.text }]}>戻る</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.nextButton, { backgroundColor: colors.tint }]}
                  onPress={nextStep}
                >
                  <Text style={styles.nextButtonText}>次へ</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>

          {renderDatePicker()}
        </SafeAreaView>
      </Modal>

      {/* 位置選択モーダル */}
      <LocationPicker
        visible={showLocationPicker}
        initialLocation={formData.location}
        onLocationSelected={handleLocationSelected}
        onClose={() => setShowLocationPicker(false)}
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
  headerRight: {
    width: 32,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 4,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  projectTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  projectTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  projectTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addressInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addressInput: {
    flex: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  locationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationInfo: {
    padding: 16,
    borderRadius: 8,
    gap: 6,
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfoText: {
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
    gap: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  confirmationCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
  },
  confirmationValue: {
    flex: 1,
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewWorkSiteModal;