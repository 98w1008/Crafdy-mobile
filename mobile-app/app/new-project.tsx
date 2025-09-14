import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth, useRole } from '@/contexts/AuthContext'
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/Colors'
import { StyledText, StyledButton, Card } from '@/components/ui'
import * as DocumentPicker from 'expo-document-picker'
import * as Haptics from 'expo-haptics'

interface ProjectDocument {
  id: string
  name: string
  uri: string
  type: string
  size: number
  required: boolean
  uploaded: boolean
}

interface ProjectData {
  name: string
  description: string
  location: string
  budget: string
  startDate: string
  endDate: string
  clientName: string
  clientContact: string
}

export default function NewProjectScreen() {
  const { user, profile } = useAuth()
  const userRole = useRole()
  const [step, setStep] = useState<'upload' | 'analysis' | 'generation' | 'dialogue' | 'confirmation'>('upload')
  const [loading, setLoading] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [aiQuestions, setAiQuestions] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [aiResponses, setAiResponses] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    location: '',
    budget: '',
    startDate: '',
    endDate: '',
    clientName: '',
    clientContact: ''
  })

  // AI解析に必要な最重要書類（この3つでプロジェクト概要を生成）
  const [primaryDocuments, setPrimaryDocuments] = useState<ProjectDocument[]>([
    {
      id: 'contract',
      name: '工事請負契約書',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: true,
      uploaded: false
    },
    {
      id: 'design',
      name: '設計図面・建築図面',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: true,
      uploaded: false
    },
    {
      id: 'estimate',
      name: '材料見積もり書',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: true,
      uploaded: false
    }
  ])

  // 追加書類（AI解析後にオプションでアップロード）
  const [additionalDocuments, setAdditionalDocuments] = useState<ProjectDocument[]>([
    {
      id: 'permit',
      name: '建築確認済証',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    },
    {
      id: 'schedule',
      name: '工程表・スケジュール',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    },
    {
      id: 'details',
      name: '工事明細書',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    },
    {
      id: 'layout',
      name: '現場配置図',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    },
    {
      id: 'specs',
      name: '材料仕様書',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    },
    {
      id: 'safety',
      name: '安全管理計画書',
      uri: '',
      type: 'application/pdf',
      size: 0,
      required: false,
      uploaded: false
    }
  ])

  const handleInputChange = (field: keyof ProjectData, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }))
  }

  const validateBasicInfo = (): boolean => {
    const required = ['name', 'description', 'location', 'budget', 'startDate', 'clientName']
    const missing = required.filter(field => !projectData[field as keyof ProjectData])
    
    if (missing.length > 0) {
      Alert.alert('入力エラー', '必須項目をすべて入力してください')
      return false
    }
    
    return true
  }

  // AI解析開始
  const startAIAnalysis = async () => {
    setStep('analysis')
    setLoading(true)
    setAnalysisProgress(0)
    
    try {
      // 段階的な解析プロセスをシミュレート
      const analysisSteps = [
        { progress: 20, message: '契約書を解析中...' },
        { progress: 40, message: '設計図面を読み取り中...' },
        { progress: 60, message: '見積もりデータを抽出中...' },
        { progress: 80, message: 'プロジェクト情報を生成中...' },
        { progress: 100, message: '解析完了' }
      ]
      
      for (const step of analysisSteps) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        setAnalysisProgress(step.progress)
      }
      
      // AI解析結果をプロジェクトデータに反映（模擬）
      const aiGeneratedData = await generateProjectFromDocuments()
      setProjectData(aiGeneratedData)
      
      // 不足情報についての質問を生成
      const questions = generateAIQuestions(aiGeneratedData)
      setAiQuestions(questions)
      
      setStep('generation')
      
    } catch (error) {
      console.error('AI解析エラー:', error)
      Alert.alert('エラー', 'AI解析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 書類からプロジェクト情報を生成（模擬AI処理）
  const generateProjectFromDocuments = async (): Promise<ProjectData> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      name: '新宿オフィスビル建設プロジェクト',
      description: '地上15階建て、延床面積12,000㎡のオフィスビル新築工事。鉄骨造、外装はカーテンウォール仕様。',
      location: '東京都新宿区西新宿2-8-1',
      budget: '158000',
      startDate: '2024-04-01',
      endDate: '2025-03-31',
      clientName: '株式会社新宿開発',
      clientContact: '03-3348-1234'
    }
  }

  // AI質問生成
  const generateAIQuestions = (data: ProjectData): string[] => {
    const questions = []
    
    if (!data.clientContact) {
      questions.push('発注者の連絡先（電話番号またはメールアドレス）を教えてください。')
    }
    
    questions.push('現場の安全管理責任者はどなたになりますか？')
    questions.push('工事期間中の作業時間帯に制限はありますか？（例：平日8-17時のみ）')
    questions.push('近隣への騒音配慮で特別な対策が必要でしょうか？')
    questions.push('材料搬入のためのクレーン設置場所は確保済みですか？')
    
    return questions
  }

  const handleNext = () => {
    const uploadedPrimary = primaryDocuments.filter(doc => doc.uploaded)
    
    if (step === 'upload') {
      if (uploadedPrimary.length < 3) {
        Alert.alert(
          '書類が不足しています',
          'AIによるプロジェクト生成には、契約書・設計図面・見積書の3点が必要です。',
          [{ text: 'OK' }]
        )
        return
      }
      
      startAIAnalysis()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } else if (step === 'generation') {
      if (aiQuestions.length > 0) {
        setStep('dialogue')
        setCurrentQuestionIndex(0)
      } else {
        setStep('confirmation')
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } else if (step === 'dialogue') {
      setStep('confirmation')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  // AI対話処理
  const handleAIResponse = () => {
    if (!inputText.trim()) return
    
    const newResponses = [...aiResponses]
    newResponses[currentQuestionIndex] = inputText
    setAiResponses(newResponses)
    setInputText('')
    
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // すべての質問が完了
      setStep('confirmation')
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const skipCurrentQuestion = () => {
    if (currentQuestionIndex < aiQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setStep('confirmation')
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleBack = () => {
    if (step === 'generation') {
      setStep('upload')
    } else if (step === 'dialogue') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1)
      } else {
        setStep('generation')
      }
    } else if (step === 'confirmation') {
      if (aiQuestions.length > 0) {
        setStep('dialogue')
        setCurrentQuestionIndex(Math.max(0, aiQuestions.length - 1))
      } else {
        setStep('generation')
      }
    } else {
      router.back()
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const pickPrimaryDocument = async (documentId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        setPrimaryDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { 
                ...doc, 
                uri: asset.uri, 
                name: asset.name || doc.name,
                size: asset.size || 0,
                uploaded: true 
              }
            : doc
        ))
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch (error) {
      console.error('ドキュメント選択エラー:', error)
      Alert.alert('エラー', 'ドキュメントの選択に失敗しました')
    }
  }

  const removePrimaryDocument = (documentId: string) => {
    setPrimaryDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, uri: '', uploaded: false, size: 0 }
        : doc
    ))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const createProject = async () => {
    setLoading(true)
    
    try {
      // ここで実際にはSupabaseにプロジェクトを作成
      const newProject = {
        ...projectData,
        aiResponses: aiResponses,
        documents: primaryDocuments.filter(doc => doc.uploaded),
        created_by: user?.id,
        created_at: new Date().toISOString(),
        status: 'planning'
      }
      
      console.log('🏗️ Creating AI-generated project:', newProject)
      
      // 作成処理をシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert(
        'プロジェクト作成完了',
        `「${projectData.name}」のプロジェクトが作成されました。`,
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)/projects') }
        ]
      )
      
    } catch (error) {
      console.error('プロジェクト作成エラー:', error)
      Alert.alert('エラー', 'プロジェクトの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 📄 書類アップロード画面
  const renderUploadStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="premium" elevationLevel={3} style={styles.headerCard}>
        <View style={styles.stepHeader}>
          <StyledText variant="title" weight="semibold">
            AI自動生成
          </StyledText>
        </View>
        <StyledText variant="body" color="secondary" align="center">
          3つの重要書類をアップロードするだけで、
        </StyledText>
        <StyledText variant="body" color="secondary" align="center">
          AIがプロジェクト情報を自動生成します
        </StyledText>
        <StyledText variant="caption" color="tertiary" align="center" style={{ marginTop: Spacing.sm }}>
          PDF、Excel、Word、画像形式に対応
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.documentsCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.documentsTitle}>
          AI解析に必要な書類
        </StyledText>
        <StyledText variant="caption" color="secondary" style={{ marginBottom: Spacing.md }}>
          以下の3点をアップロードしてください
        </StyledText>
        
        {primaryDocuments.map((doc, index) => (
          <View key={doc.id} style={styles.documentItem}>
            <View style={styles.documentInfo}>
              <View style={styles.documentHeader}>
                <StyledText variant="body" weight="medium">
                  {index + 1}. {doc.name}
                </StyledText>
                {doc.uploaded && (
                  <StyledText variant="caption" color="success">完了</StyledText>
                )}
              </View>
              <StyledText variant="caption" color="secondary">
                {doc.id === 'contract' && 'プロジェクト名、期間、予算などを抽出'}
                {doc.id === 'design' && '建築仕様、規模、構造などを分析'}
                {doc.id === 'estimate' && '材料費、工事費などのコスト情報を取得'}
              </StyledText>
            </View>
            
            {doc.uploaded ? (
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePrimaryDocument(doc.id)}
                >
                  <StyledText variant="caption" color="error">変更</StyledText>
                </TouchableOpacity>
              </View>
            ) : (
              <StyledButton
                title="選択"
                variant="primary"
                size="sm"
                onPress={() => pickPrimaryDocument(doc.id)}
              />
            )}
          </View>
        ))}

        <Card variant="info" style={{ marginTop: Spacing.lg }}>
          <StyledText variant="caption" color="info" align="center">
            アップロード後、AIが自動でプロジェクト情報を生成します
          </StyledText>
        </Card>
      </Card>
    </View>
  )

  // 🤖 AI解析中画面
  const renderAnalysisStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="primary" elevationLevel={3} style={styles.headerCard}>
        <View style={styles.stepHeader}>
          <StyledText variant="title" weight="semibold" align="center">
            AIが書類を解析中
          </StyledText>
        </View>
        <StyledText variant="body" color="secondary" align="center">
          アップロードされた書類から
        </StyledText>
        <StyledText variant="body" color="secondary" align="center">
          プロジェクト情報を自動生成しています
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.analysisCard}>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <StyledText variant="subtitle" weight="semibold">
              解析進捗: {analysisProgress}%
            </StyledText>
          </View>
          
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${analysisProgress}%` }
            ]} />
          </View>
          
          <View style={styles.analysisSteps}>
            <View style={[styles.analysisStep, analysisProgress >= 20 && styles.analysisStepCompleted]}>
              <StyledText variant="body">契約書の解析</StyledText>
              {analysisProgress >= 20 && <StyledText variant="caption" color="success">✓</StyledText>}
            </View>
            <View style={[styles.analysisStep, analysisProgress >= 40 && styles.analysisStepCompleted]}>
              <StyledText variant="body">設計図面の読み取り</StyledText>
              {analysisProgress >= 40 && <StyledText variant="caption" color="success">✓</StyledText>}
            </View>
            <View style={[styles.analysisStep, analysisProgress >= 60 && styles.analysisStepCompleted]}>
              <StyledText variant="body">見積もりデータの抽出</StyledText>
              {analysisProgress >= 60 && <StyledText variant="caption" color="success">✓</StyledText>}
            </View>
            <View style={[styles.analysisStep, analysisProgress >= 80 && styles.analysisStepCompleted]}>
              <StyledText variant="body">プロジェクト情報の生成</StyledText>
              {analysisProgress >= 80 && <StyledText variant="caption" color="success">✓</StyledText>}
            </View>
          </View>
        </View>
      </Card>
    </View>
  )

  // ✨ AI生成結果画面
  const renderGenerationStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="success" elevationLevel={3} style={styles.headerCard}>
        <View style={styles.stepHeader}>
          <StyledText variant="title" weight="semibold">
            AI生成完了！
          </StyledText>
        </View>
        <StyledText variant="body" color="secondary" align="center">
          書類からプロジェクト情報を自動生成しました
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.generationCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.generationTitle}>
          生成されたプロジェクト情報
        </StyledText>
        
        <View style={styles.generatedData}>
          <View style={styles.dataRow}>
            <StyledText variant="body" weight="medium" color="primary">プロジェクト名</StyledText>
            <StyledText variant="body">{projectData.name}</StyledText>
          </View>
          
          <View style={styles.dataRow}>
            <StyledText variant="body" weight="medium" color="primary">所在地</StyledText>
            <StyledText variant="body">{projectData.location}</StyledText>
          </View>
          
          <View style={styles.dataRow}>
            <StyledText variant="body" weight="medium" color="primary">予算</StyledText>
            <StyledText variant="body" color="success" weight="semibold">
              ¥{parseInt(projectData.budget).toLocaleString()}万円
            </StyledText>
          </View>
          
          <View style={styles.dataRow}>
            <StyledText variant="body" weight="medium" color="primary">工期</StyledText>
            <StyledText variant="body">
              {projectData.startDate} ～ {projectData.endDate}
            </StyledText>
          </View>
          
          <View style={styles.dataRow}>
            <StyledText variant="body" weight="medium" color="primary">発注者</StyledText>
            <StyledText variant="body">{projectData.clientName}</StyledText>
          </View>
        </View>

        <View style={styles.divider} />
        
        <StyledText variant="body" weight="medium" color="primary" style={{ marginBottom: Spacing.sm }}>
          概要
        </StyledText>
        <StyledText variant="body" color="secondary" style={{ lineHeight: 22 }}>
          {projectData.description}
        </StyledText>
      </Card>

      {aiQuestions.length > 0 && (
        <Card variant="warning" style={{ marginTop: Spacing.md }}>
          <StyledText variant="caption" color="warning" align="center">
            詳細情報の確認のため、いくつか質問があります
          </StyledText>
        </Card>
      )}
    </View>
  )

  // 💬 AI対話画面
  const renderDialogueStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="info" elevationLevel={3} style={styles.headerCard}>
        <View style={styles.stepHeader}>
          <StyledText variant="title" weight="semibold">
            詳細情報の確認
          </StyledText>
        </View>
        <StyledText variant="body" color="secondary" align="center">
          より正確なプロジェクト管理のため、
        </StyledText>
        <StyledText variant="body" color="secondary" align="center">
          いくつか確認させてください
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.dialogueCard}>
        <View style={styles.questionProgress}>
          <StyledText variant="caption" color="tertiary">
            質問 {currentQuestionIndex + 1} / {aiQuestions.length}
          </StyledText>
          <View style={styles.progressDots}>
            {aiQuestions.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index <= currentQuestionIndex ? styles.progressDotActive : styles.progressDotInactive
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.questionContainer}>
          <StyledText variant="title" weight="semibold" style={styles.questionText}>
            {aiQuestions[currentQuestionIndex]}
          </StyledText>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.dialogueInput}
            placeholder="ここに回答を入力してください..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            placeholderTextColor={Colors.textTertiary}
            autoFocus
          />
          
          <View style={styles.dialogueActions}>
            <StyledButton
              title="スキップ"
              variant="outline"
              size="md"
              onPress={skipCurrentQuestion}
              style={{ flex: 1 }}
            />
            <StyledButton
              title="次へ"
              variant="primary"
              size="md"
              onPress={handleAIResponse}
              disabled={!inputText.trim()}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </Card>

      {aiResponses.length > 0 && (
        <Card variant="outlined" style={{ marginTop: Spacing.md }}>
          <StyledText variant="caption" color="secondary" style={{ marginBottom: Spacing.sm }}>
            これまでの回答:
          </StyledText>
          {aiResponses.map((response, index) => response && (
            <StyledText key={index} variant="caption" color="tertiary">
              {index + 1}. {response}
            </StyledText>
          ))}
        </Card>
      )}
    </View>
  )

  // ✅ 最終確認画面
  const renderConfirmationStep = () => (
    <View style={styles.stepContainer}>
      <Card variant="success" elevationLevel={3} style={styles.headerCard}>
        <View style={styles.stepHeader}>
          <StyledText variant="title" weight="semibold">
            作成準備完了！
          </StyledText>
        </View>
        <StyledText variant="body" color="secondary" align="center">
          AIが生成したプロジェクト情報をご確認ください
        </StyledText>
      </Card>

      <Card variant="elevated" style={styles.confirmationCard}>
        <StyledText variant="subtitle" weight="semibold" style={styles.confirmationTitle}>
          プロジェクト情報
        </StyledText>
        
        <View style={styles.confirmationContent}>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">プロジェクト名:</StyledText>
            <StyledText variant="body">{projectData.name}</StyledText>
          </View>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">所在地:</StyledText>
            <StyledText variant="body">{projectData.location}</StyledText>
          </View>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">予算:</StyledText>
            <StyledText variant="body" color="primary">¥{parseInt(projectData.budget).toLocaleString()}万円</StyledText>
          </View>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">工期:</StyledText>
            <StyledText variant="body">{projectData.startDate} ～ {projectData.endDate}</StyledText>
          </View>
          <View style={styles.confirmRow}>
            <StyledText variant="body" weight="medium">発注者:</StyledText>
            <StyledText variant="body">{projectData.clientName}</StyledText>
          </View>
        </View>

        <View style={styles.divider} />

        <StyledText variant="subtitle" weight="semibold" style={styles.confirmationTitle}>
          アップロード書類
        </StyledText>
        
        <View style={styles.confirmationContent}>
          <StyledText variant="body" weight="medium" color="success">
            AI解析書類: {primaryDocuments.filter(doc => doc.uploaded).length}/3件
          </StyledText>
          {primaryDocuments.filter(doc => doc.uploaded).map(doc => (
            <StyledText key={doc.id} variant="caption" color="secondary">
              ✓ {doc.name}
            </StyledText>
          ))}
        </View>

        {aiResponses.some(response => response) && (
          <>
            <View style={styles.divider} />
            <StyledText variant="subtitle" weight="semibold" style={styles.confirmationTitle}>
              追加情報
            </StyledText>
            <View style={styles.confirmationContent}>
              {aiResponses.map((response, index) => response && (
                <StyledText key={index} variant="caption" color="secondary">
                  • {response}
                </StyledText>
              ))}
            </View>
          </>
        )}
      </Card>

      <StyledButton
        title="プロジェクトを作成"
        variant="success"
        size="lg"
        elevated={true}
        loading={loading}
        onPress={createProject}
        style={styles.createButton}
      />
    </View>
  )

  const getStepNumber = () => {
    switch (step) {
      case 'upload': return 1
      case 'analysis': return 2  
      case 'generation': return 3
      case 'dialogue': return 4
      case 'confirmation': return 5
      default: return 1
    }
  }

  const getProgressWidth = () => {
    switch (step) {
      case 'upload': return '20%'
      case 'analysis': return '40%'
      case 'generation': return '60%'
      case 'dialogue': return '80%'
      case 'confirmation': return '100%'
      default: return '20%'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <StyledText variant="title" color="primary">←</StyledText>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <StyledText variant="title" weight="semibold">
            AI自動プロジェクト作成
          </StyledText>
          <StyledText variant="caption" color="secondary">
            ステップ {getStepNumber()}/5 - {
              step === 'upload' ? '書類アップロード' :
              step === 'analysis' ? 'AI解析中' :
              step === 'generation' ? 'AI生成結果' :
              step === 'dialogue' ? 'AI対話' :
              '最終確認'
            }
          </StyledText>
        </View>
      </View>

      {/* プログレスバー */}
      {step !== 'analysis' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: getProgressWidth() }
            ]} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'upload' && renderUploadStep()}
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'generation' && renderGenerationStep()}
        {step === 'dialogue' && renderDialogueStep()}
        {step === 'confirmation' && renderConfirmationStep()}
      </ScrollView>

      {/* フッターボタン */}
      {(step === 'upload' || step === 'generation') && (
        <View style={styles.footer}>
          <StyledButton
            title={step === 'upload' ? 'AI解析開始' : aiQuestions.length > 0 ? '質問に回答' : '確認画面へ'}
            variant="primary"
            size="lg"
            elevated={true}
            onPress={handleNext}
            style={styles.nextButton}
            disabled={step === 'upload' && primaryDocuments.filter(doc => doc.uploaded).length < 3}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  stepContainer: {
    gap: Spacing.lg,
  },
  headerCard: {
    alignItems: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  formCard: {
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  formSpacer: {
    width: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.base,
    backgroundColor: Colors.surface,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.lg,
  },
  documentsCard: {
  },
  documentsTitle: {
    marginBottom: Spacing.md,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  documentInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  removeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  confirmationCard: {
  },
  confirmationTitle: {
    marginBottom: Spacing.md,
  },
  confirmationContent: {
    gap: Spacing.sm,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  createButton: {
    minHeight: 56,
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  nextButton: {
    minHeight: 56,
  },
  // 新しいAIフロー用のスタイル
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  analysisCard: {
    alignItems: 'center',
  },
  analysisSteps: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  analysisStep: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.md,
  },
  analysisStepCompleted: {
    backgroundColor: Colors.successLight,
  },
  generationCard: {
  },
  generationTitle: {
    marginBottom: Spacing.md,
  },
  generatedData: {
    gap: Spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
    gap: Spacing.md,
  },
  dialogueCard: {
  },
  questionProgress: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  progressDots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotInactive: {
    backgroundColor: Colors.borderLight,
  },
  questionContainer: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  questionText: {
    lineHeight: 28,
    textAlign: 'center',
  },
  inputContainer: {
    gap: Spacing.md,
  },
  dialogueInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    backgroundColor: Colors.surface,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dialogueActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
})