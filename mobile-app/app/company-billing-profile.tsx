import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import { getCompanyBillingProfile, saveCompanyBillingProfile } from '@/lib/company-billing-profile-store'

type FormState = {
  companyName: string
  address: string
  phone: string
  invoiceRegistrationNumber: string
  bankName: string
  bankBranchName: string
  bankAccountType: string
  bankAccountNumber: string
  bankAccountName: string
  logoUri: string
  defaultNote: string
}

const emptyForm: FormState = {
  companyName: '',
  address: '',
  phone: '',
  invoiceRegistrationNumber: '',
  bankName: '',
  bankBranchName: '',
  bankAccountType: '',
  bankAccountNumber: '',
  bankAccountName: '',
  logoUri: '',
  defaultNote: '',
}

export default function CompanyBillingProfileScreen() {
  const router = useRouter()
  const {
    companyNameCandidate,
    logoUriCandidate,
    sourceTemplateName,
    defaultNoteCandidate,
    invoiceRegistrationNumberCandidate,
  } = useLocalSearchParams<{
    companyNameCandidate?: string
    logoUriCandidate?: string
    sourceTemplateName?: string
    defaultNoteCandidate?: string
    invoiceRegistrationNumberCandidate?: string
  }>()

  const [access, setAccess] = useState<AccessContext | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const canSee = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')

  const hasTemplateCandidates =
    !!String(companyNameCandidate || '').trim() ||
    !!String(logoUriCandidate || '').trim() ||
    !!String(defaultNoteCandidate || '').trim() ||
    !!String(invoiceRegistrationNumberCandidate || '').trim() ||
    !!String(sourceTemplateName || '').trim()

  const reload = async () => {
    const [ctx, profile] = await Promise.all([getAccessContext(), getCompanyBillingProfile()])
    setAccess(ctx)

    const next: FormState = profile
      ? {
        companyName: profile.companyName || '',
        address: profile.address || '',
        phone: profile.phone || '',
        invoiceRegistrationNumber: profile.invoiceRegistrationNumber || '',
        bankName: profile.bankName || '',
        bankBranchName: profile.bankBranchName || '',
        bankAccountType: profile.bankAccountType || '',
        bankAccountNumber: profile.bankAccountNumber || '',
        bankAccountName: profile.bankAccountName || '',
        logoUri: profile.logoUri || '',
        defaultNote: profile.defaultNote || '',
      }
      : emptyForm

    // 候補つきで来た場合は、フォームが空の項目にだけ反映する（既存値は上書きしない）
    const nameC = String(companyNameCandidate || '').trim()
    const logoC = String(logoUriCandidate || '').trim()
    const noteC = String(defaultNoteCandidate || '').trim()
    const invoiceRegC = String(invoiceRegistrationNumberCandidate || '').trim()

    setForm({
      ...next,
      companyName: next.companyName.trim() ? next.companyName : nameC,
      logoUri: next.logoUri.trim() ? next.logoUri : logoC,
      defaultNote: next.defaultNote.trim() ? next.defaultNote : noteC,
      invoiceRegistrationNumber: next.invoiceRegistrationNumber.trim() ? next.invoiceRegistrationNumber : invoiceRegC,
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      reload()
    }, [])
  )

  // NOTE: テンプレ候補の反映は reload() 内で行う（既存値は上書きしない）

  const onChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      await saveCompanyBillingProfile({
        companyName: form.companyName,
        address: form.address,
        phone: form.phone,
        invoiceRegistrationNumber: form.invoiceRegistrationNumber,
        bankName: form.bankName,
        bankBranchName: form.bankBranchName,
        bankAccountType: form.bankAccountType,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
        logoUri: form.logoUri,
        defaultNote: form.defaultNote,
      })

      Alert.alert('保存しました')
      await reload()
    } catch (e) {
      console.error('Failed to save company billing profile', e)
      Alert.alert('保存に失敗しました')
    }
  }

  const candidateHintFor = (key: keyof FormState): string => {
    if (!hasTemplateCandidates) return ''

    if (key === 'companyName' && String(companyNameCandidate || '').trim()) return 'テンプレ候補あり（必要なら修正）'
    if (key === 'logoUri' && String(logoUriCandidate || '').trim()) return 'テンプレ候補あり（必要なら修正）'
    if (key === 'invoiceRegistrationNumber' && String(invoiceRegistrationNumberCandidate || '').trim()) return 'テンプレ候補あり（必要なら修正）'
    if (key === 'defaultNote' && String(defaultNoteCandidate || '').trim()) return 'テンプレ候補あり（必要なら修正）'

    return ''
  }

  const renderField = (label: string, key: keyof FormState, props?: { multiline?: boolean }) => {
    const multiline = props?.multiline
    const candidateHint = candidateHintFor(key)

    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <StyledText variant="caption" color="secondary">{label}</StyledText>
          {candidateHint ? <StyledText variant="caption" color="secondary">{candidateHint}</StyledText> : null}
        </View>
        <TextInput
          value={form[key]}
          onChangeText={v => onChange(key, v)}
          placeholder={label}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          multiline={!!multiline}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">会社情報（請求/見積 共通）</StyledText>
          <StyledText variant="body" color="secondary">
            請求書/見積書に共通で使う会社情報の保存先です（自動抽出・差し込みは今後対応）。
          </StyledText>
        </View>

        {!canSee ? (
          <Card variant="elevated" style={styles.infoCard}>
            <StyledText variant="subtitle" weight="semibold">この画面は編集権限が必要です</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              会社情報（請求/見積）は owner / office のみ編集できます。
              職長・従業員の方は、代表に設定を依頼してください。
            </StyledText>
            <View style={{ marginTop: Spacing.sm }}>
              <StyledButton title="ダッシュボードへ" variant="secondary" onPress={() => router.replace('/(tabs)/dashboard' as any)} />
            </View>
          </Card>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {hasTemplateCandidates ? (
              <Card variant="elevated" style={styles.infoCard}>
                <StyledText variant="subtitle" weight="semibold">テンプレからの取り込み候補</StyledText>
                <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
                  テンプレから取り込んだ候補です。必要なら修正して保存してください。
                </StyledText>

                <View style={{ marginTop: 6, gap: 2 }}>
                  {String(companyNameCandidate || '').trim() ? (
                    <StyledText variant="caption" color="secondary">・会社名候補あり</StyledText>
                  ) : null}
                  {String(logoUriCandidate || '').trim() ? (
                    <StyledText variant="caption" color="secondary">・ロゴ候補あり</StyledText>
                  ) : null}
                  {String(invoiceRegistrationNumberCandidate || '').trim() ? (
                    <StyledText variant="caption" color="secondary">・インボイス番号候補あり</StyledText>
                  ) : null}
                  {String(defaultNoteCandidate || '').trim() ? (
                    <StyledText variant="caption" color="secondary">・備考候補あり</StyledText>
                  ) : null}
                </View>

                {String(sourceTemplateName || '').trim() ? (
                  <StyledText variant="caption" color="secondary" style={{ marginTop: 6 }}>
                    取り込み元: {String(sourceTemplateName || '').trim()}
                  </StyledText>
                ) : null}
              </Card>
            ) : null}

            <Card variant="elevated" style={styles.formCard}>
              <View style={{ gap: Spacing.md }}>
                {renderField('会社名 / 屋号', 'companyName')}
                {renderField('住所', 'address', { multiline: true })}
                {renderField('電話番号', 'phone')}
                {renderField('インボイス番号', 'invoiceRegistrationNumber')}

                <StyledText variant="subtitle" weight="semibold">振込先</StyledText>
                {renderField('銀行名', 'bankName')}
                {renderField('支店名', 'bankBranchName')}
                {renderField('口座種別', 'bankAccountType')}
                {renderField('口座番号', 'bankAccountNumber')}
                {renderField('口座名義', 'bankAccountName')}

                <StyledText variant="subtitle" weight="semibold">その他</StyledText>
                {renderField('ロゴURI（今回は文字列のみ）', 'logoUri')}
                {renderField('備考の定型文', 'defaultNote', { multiline: true })}

                <StyledButton title="保存" variant="primary" onPress={handleSave} />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing['2xl'] },
  header: { marginBottom: Spacing.lg, paddingTop: Spacing.sm },
  infoCard: { padding: Spacing.md },
  formCard: { padding: Spacing.md },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
})
