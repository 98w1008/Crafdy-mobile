/**
 * 日報作成画面
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native'
import {
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  Chip,
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

export default function NewDailyReportScreen() {
  const [workContent, setWorkContent] = useState('')
  const [issues, setIssues] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [weather, setWeather] = useState('sunny')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const weatherOptions = [
    { key: 'sunny', label: '晴れ', icon: '☀️' },
    { key: 'cloudy', label: '曇り', icon: '☁️' },
    { key: 'rainy', label: '雨', icon: '🌧️' },
    { key: 'snow', label: '雪', icon: '❄️' },
  ]

  const handleSubmit = async () => {
    if (!workContent.trim()) {
      Alert.alert('入力エラー', '作業内容を入力してください')
      return
    }

    setIsSubmitting(true)
    
    try {
      // TODO: Supabaseに日報を保存
      await new Promise(resolve => setTimeout(resolve, 1500)) // Mock API
      
      if (Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      
      Alert.alert('送信完了', '日報を送信しました', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ])
    } catch (error) {
      Alert.alert('エラー', '送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="close"
        size={24}
        onPress={() => router.back()}
      />
      <Text variant="headlineSmall" style={styles.headerTitle}>日報作成</Text>
      <View style={{ width: 48 }} />
    </Surface>
  )

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content}>
        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>本日の天気</Text>
          <View style={styles.weatherContainer}>
            {weatherOptions.map((option) => (
              <Chip
                key={option.key}
                selected={weather === option.key}
                onPress={() => setWeather(option.key)}
                style={styles.weatherChip}
              >
                {option.icon} {option.label}
              </Chip>
            ))}
          </View>
        </Surface>

        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>作業内容 *</Text>
          <TextInput
            mode="outlined"
            placeholder="本日の作業内容を詳しく記入してください"
            value={workContent}
            onChangeText={setWorkContent}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
        </Surface>

        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>課題・問題点</Text>
          <TextInput
            mode="outlined"
            placeholder="発生した課題や改善点があれば記入してください"
            value={issues}
            onChangeText={setIssues}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </Surface>

        <Surface style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>明日の予定</Text>
          <TextInput
            mode="outlined"
            placeholder="明日の作業予定を記入してください"
            value={tomorrow}
            onChangeText={setTomorrow}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </Surface>

        <View style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !workContent.trim()}
            style={styles.submitButton}
          >
            日報を送信
          </Button>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  weatherContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weatherChip: {
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: 'white',
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  submitButton: {
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 80,
  },
})