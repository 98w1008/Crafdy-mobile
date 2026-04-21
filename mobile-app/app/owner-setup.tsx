import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { supabase, supabaseReady } from '@/lib/supabase'
import { getSelectedProject, listProjects } from '@/lib/project-store'
import { createInvitationCode } from '@/lib/invitation-system'

export default function OwnerSetupScreen() {
  const router = useRouter()
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const toMain = String(returnTo || '').trim() || '/main-chat'

  const [selectedProject, setSelectedProjectState] = useState<{ id: string; name: string } | null>(null)
  const [projectCount, setProjectCount] = useState(0)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [proj, all] = await Promise.all([getSelectedProject(), listProjects()])
      setSelectedProjectState(proj)
      setProjectCount(all.length)
    } catch {
      // ignore
    }
  }, [])

  useFocusEffect(reload)

  const step1Done = projectCount > 0
  const step2Done = !!inviteCode

  // 次に押すべきステップ番号
  const activeStep = !step1Done ? 1 : !step2Done ? 2 : 3

  const handleStep1 = () => {
    router.push({
      pathname: '/project-selector',
      params: { returnTo: '/owner-setup' },
    } as any)
  }

  const handleStep2 = async () => {
    if (projectCount === 0) {
      Alert.alert(
        'まず現場を作りましょう',
        '招待コードは現場ごとに発行されます。ステップ 1 で現場を作ってから進めてください。',
        [
          { text: '現場を作る', onPress: handleStep1 },
          { text: 'キャンセル', style: 'cancel' },
        ]
      )
      return
    }
    if (!selectedProject) {
      Alert.alert(
        '現場を選んでください',
        '現場はありますが選択されていません。',
        [
          { text: '現場を選ぶ', onPress: handleStep1 },
          { text: 'キャンセル', style: 'cancel' },
        ]
      )
      return
    }
    if (!supabaseReady || !supabase) {
      Alert.alert('エラー', '認証が完了していません')
      return
    }
    setInviteLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        Alert.alert('エラー', 'ログインが必要です')
        return
      }
      const { code, error } = await createInvitationCode(selectedProject.id, userData.user.id)
      if (error || !code) {
        Alert.alert('コード発行できませんでした', error || '時間をおいてもう一度お試しください')
        return
      }
      setInviteCode(code)
      Alert.alert(
        '招待コードを発行しました',
        `コード: ${code}\n\n有効期限: 72時間\n\nこのコードを相手に共有してください。\n相手は「招待を受けて参加」でコードを入力すると参加できます。`,
        [{ text: 'OK' }]
      )
    } finally {
      setInviteLoading(false)
    }
  }

  const handleStep3 = () => {
    router.replace(toMain as any)
  }

  const steps = [
    {
      num: 1,
      label: '現場を作る / 選ぶ',
      desc: step1Done
        ? `${selectedProject?.name ?? '選択済み'} · ${projectCount}件`
        : 'まずチャットで使う現場を登録します',
      done: step1Done,
      onPress: handleStep1,
    },
    {
      num: 2,
      label: '招待コードを発行する',
      desc: inviteCode
        ? `発行済: ${inviteCode}`
        : step1Done
          ? '現場のメンバーを招待できます'
          : '現場を作ってから進めます',
      done: step2Done,
      onPress: handleStep2,
      loading: inviteLoading,
    },
    {
      num: 3,
      label: 'main-chat を使い始める',
      desc: '日報・経費・請求書をチャットで進めます',
      done: false,
      onPress: handleStep3,
    },
  ] as const

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text style={styles.title}>はじめましょう</Text>
          <Text style={styles.subtitle}>この 3 ステップで使い始められます</Text>
        </View>

        <View style={styles.steps}>
          {steps.map((step) => {
            const isActive = step.num === activeStep
            const isDone = step.done
            const loading = 'loading' in step ? step.loading : false
            return (
              <TouchableOpacity
                key={step.num}
                style={[
                  styles.step,
                  isDone && styles.stepDone,
                  isActive && styles.stepActive,
                ]}
                onPress={step.onPress}
                activeOpacity={0.75}
              >
                {/* ステップ番号 / チェック */}
                <View style={[
                  styles.badge,
                  isDone && styles.badgeDone,
                  isActive && styles.badgeActive,
                ]}>
                  {isDone ? (
                    <Feather name="check" size={15} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                      {step.num}
                    </Text>
                  )}
                </View>

                {/* テキスト */}
                <View style={styles.stepBody}>
                  <Text style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isActive && styles.stepLabelActive,
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>

                {/* 右端 */}
                {loading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={
                      isDone ? 'rgba(34,197,94,0.5)'
                        : isActive ? '#3B82F6'
                          : 'rgba(255,255,255,0.2)'
                    }
                  />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  content: {
    padding: 24,
    paddingBottom: 56,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
  },
  steps: {
    gap: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepDone: {
    backgroundColor: 'rgba(34,197,94,0.07)',
    borderColor: 'rgba(34,197,94,0.20)',
  },
  stepActive: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderColor: 'rgba(59,130,246,0.35)',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeDone: {
    backgroundColor: '#22C55E',
  },
  badgeActive: {
    backgroundColor: '#3B82F6',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  stepLabelDone: {
    color: '#4ADE80',
  },
  stepLabelActive: {
    color: 'rgba(255,255,255,0.95)',
  },
  stepDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 18,
  },
})
