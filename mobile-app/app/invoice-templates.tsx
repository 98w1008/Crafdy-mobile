import React, { useEffect, useMemo, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { Card, StyledButton, StyledText } from '@/components/ui'
import { Colors, Spacing } from '@/constants/Colors'
import { getAccessContext, type AccessContext } from '@/lib/access-context'
import {
  createUploadedInvoiceTemplate,
  listInvoiceTemplates,
  setActiveInvoiceTemplate,
  type InvoiceTemplate,
  type InvoiceTemplateApplyStatus,
  type InvoiceTemplateFileType,
} from '@/lib/invoice-template-store'

export default function InvoiceTemplatesScreen() {
  const router = useRouter()
  const [access, setAccess] = useState<AccessContext | null>(null)
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])

  const canSee = access?.kind === 'assigned' && (access.role === 'owner' || access.role === 'office')

  const reload = async () => {
    const [ctx, items] = await Promise.all([getAccessContext(), listInvoiceTemplates()])
    setAccess(ctx)
    setTemplates(items)
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

  const handleSetActive = async (id: string) => {
    await setActiveInvoiceTemplate(id)
    await reload()
  }

  const stripExtension = (name: string): string => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return ''
    const parts = trimmed.split('.')
    if (parts.length <= 1) return trimmed
    parts.pop()
    return parts.join('.').trim()
  }

  const handlePickAndRegister = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const asset = result.assets?.[0]
      const sourceUri = String(asset?.uri || '').trim()
      if (!sourceUri) {
        Alert.alert('テンプレ登録に失敗しました', 'ファイルの取得に失敗しました。')
        return
      }

      await createUploadedInvoiceTemplate({
        name: String(asset?.name || '').trim(),
        sourceUri,
      })

      await reload()
      Alert.alert('テンプレを登録しました')
    } catch (e) {
      console.error('Failed to register uploaded invoice template', e)
      Alert.alert('テンプレ登録に失敗しました', 'もう一度お試しください。')
    }
  }

  const visibleTemplates = canSee ? templates : []

  const activeTemplate = useMemo(() => visibleTemplates.find(t => t.isActive) ?? null, [visibleTemplates])

  const fileTypeLabel = (ft: InvoiceTemplateFileType | undefined) => {
    if (ft === 'pdf') return 'PDF'
    if (ft === 'image') return '画像'
    if (ft === 'word') return 'Word'
    if (ft === 'excel') return 'Excel'
    return '不明'
  }

  const applyStatusLabel = (s: InvoiceTemplateApplyStatus | undefined) => {
    if (s === 'ready_for_future_apply') return '今後適用候補'
    if (s === 'unsupported_yet') return 'まだ未対応'
    return ''
  }

  const extractInvoiceRegistrationNumberCandidate = (name: string): string => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return ''

    // NOTE: 安全側。テンプレ名に明らかに T+13桁 が含まれる場合のみ候補にする。
    const m = trimmed.match(/T\d{13}/)
    return m?.[0] || ''
  }

  const handleApplyToCompanyProfile = (t: InvoiceTemplate) => {
    if (t.kind !== 'uploaded') return

    const companyNameCandidate = stripExtension(t.name)
    const logoUriCandidate = t.fileType === 'image' ? String(t.sourceUri || '').trim() : ''
    const invoiceRegistrationNumberCandidate = extractInvoiceRegistrationNumberCandidate(t.name)

    router.push({
      pathname: '/company-billing-profile',
      params: {
        companyNameCandidate: companyNameCandidate || undefined,
        logoUriCandidate: logoUriCandidate || undefined,
        sourceTemplateName: String(t.name || '').trim() || undefined,
        defaultNoteCandidate: undefined,
        invoiceRegistrationNumberCandidate: invoiceRegistrationNumberCandidate || undefined,
      },
    } as any)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <StyledText variant="heading2" weight="bold">請求書テンプレ</StyledText>
          <StyledText variant="body" color="secondary">
            今はクラフディ標準テンプレを選べます。自社テンプレ（ファイル選択）の登録もできます。
            ※ アップロードテンプレの請求書プレビュー/出力への適用は今後対応予定です。
          </StyledText>
        </View>

        {!canSee ? (
          <Card variant="elevated" style={styles.infoCard}>
            <StyledText variant="subtitle" weight="semibold">閲覧できません</StyledText>
            <StyledText variant="body" color="secondary" style={{ marginTop: 6 }}>
              請求書テンプレは owner / office のみ閲覧できます。
            </StyledText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {activeTemplate?.kind === 'uploaded' ? (
              <Card variant="elevated" style={styles.activeUploadedInfoCard}>
                <StyledText variant="caption" color="secondary">
                  アップロードテンプレを使用中です。差し込み適用は今後対応予定です。
                </StyledText>
              </Card>
            ) : null}

            <Card variant="elevated" style={styles.templateCard}>
              <StyledText variant="subtitle" weight="semibold">テンプレを追加</StyledText>
              <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                まずはファイルを選んでテンプレとして登録できます（解析・差し込みは未対応）。
              </StyledText>
              <View style={{ marginTop: Spacing.sm }}>
                <StyledButton title="ファイルを選択" variant="primary" onPress={handlePickAndRegister} />
              </View>
            </Card>

            {visibleTemplates.map(t => (
              <Card key={t.id} variant="elevated" style={styles.templateCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <StyledText variant="subtitle" weight="semibold" numberOfLines={1}>
                      {t.name}
                    </StyledText>
                    <StyledText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                      kind: {t.kind}{t.templateKey ? ` / ${t.templateKey}` : ''}
                    </StyledText>

                    {t.kind === 'uploaded' ? (
                      <StyledText variant="caption" color="secondary" style={{ marginTop: 2 }}>
                        種別: {fileTypeLabel(t.fileType)} / 状態: {applyStatusLabel(t.applyStatus)}
                      </StyledText>
                    ) : null}

                    <StyledText variant="caption" color={t.isActive ? 'primary' : 'secondary'} style={{ marginTop: 2 }}>
                      {t.isActive ? '使用中' : '未選択'}
                    </StyledText>
                  </View>
                </View>

                <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
                  <StyledButton
                    title={t.isActive ? 'このテンプレを使用中' : 'このテンプレを使う'}
                    variant={t.isActive ? 'secondary' : 'primary'}
                    onPress={() => handleSetActive(t.id)}
                  />

                  {t.kind === 'uploaded' ? (
                    <StyledButton
                      title="会社情報に取り込む"
                      variant="secondary"
                      onPress={() => handleApplyToCompanyProfile(t)}
                    />
                  ) : null}
                </View>
              </Card>
            ))}
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
  activeUploadedInfoCard: { padding: Spacing.sm },
  templateCard: { padding: Spacing.md },
})
