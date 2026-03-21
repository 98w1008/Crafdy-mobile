import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'

import { Colors, Spacing, Typography, BorderRadius } from '@/constants/Colors'
import { getAccessContext } from '@/lib/access-context'
import {
  createInviteCode,
  listInviteCodes,
  revokeInviteCode,
  type InviteCode,
  type InviteCodeRole,
} from '@/lib/invite-code-store'

const roleLabel = (role: InviteCodeRole) => (role === 'office' ? '事務' : '従業員')

export default function CompanySettingsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)

  const [role, setRole] = useState<InviteCodeRole>('member')
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [message, setMessage] = useState<string>('')

  const reload = async () => {
    setLoading(true)
    setMessage('')
    try {
      const ctx = await getAccessContext()
      const ok = ctx.kind === 'assigned' && ctx.role === 'owner'
      setIsAllowed(ok)
      if (!ok) {
        setCodes([])
        return
      }

      const items = await listInviteCodes()
      setCodes(items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    setMessage('')
    try {
      const res = await createInviteCode({ role, expiresInDays: 7 })
      setMessage(`発行しました: ${res.code}（有効期限: ${res.expiresAt.slice(0, 10)}）`)
      await reload()
    } catch {
      setMessage('発行に失敗しました。')
    }
  }

  const handleRevoke = async (id: string) => {
    setMessage('')
    try {
      await revokeInviteCode(id)
      setMessage('無効化しました。')
      await reload()
    } catch {
      setMessage('無効化に失敗しました。')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>会社設定</Text>
          <Text style={styles.headerSubtitle}>招待コード</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? (
          <Text style={styles.muted}>読み込み中…</Text>
        ) : !isAllowed ? (
          <Text style={styles.muted}>この画面は代表アカウントのみ利用できます。</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>招待コード発行</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.rolePill, role === 'member' && styles.rolePillActive]}
                onPress={() => setRole('member')}
                accessibilityLabel="従業員"
              >
                <Text style={styles.rolePillText}>従業員</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rolePill, role === 'office' && styles.rolePillActive]}
                onPress={() => setRole('office')}
                accessibilityLabel="事務"
              >
                <Text style={styles.rolePillText}>事務</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} accessibilityLabel="発行">
              <Text style={styles.primaryButtonText}>＋ 招待コードを発行（7日）</Text>
            </TouchableOpacity>

            {!!message && <Text style={styles.message}>{message}</Text>}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>発行済み一覧</Text>
            {codes.length === 0 ? (
              <Text style={styles.muted}>まだ招待コードがありません。</Text>
            ) : (
              <View style={styles.list}>
                {codes.map(c => (
                  <View key={c.id} style={styles.item}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {c.code} / {roleLabel(c.role)} / {c.status}
                    </Text>
                    <Text style={styles.itemMeta} numberOfLines={2}>
                      期限: {c.expiresAt.slice(0, 10)}
                    </Text>
                    {c.status === 'active' ? (
                      <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={() => handleRevoke(c.id)}
                        accessibilityLabel="無効化"
                      >
                        <Text style={styles.dangerButtonText}>無効化</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background.secondary,
  },
  backButtonText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.lg,
  },
  headerCenter: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  headerSubtitle: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 2,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  muted: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
  },
  rolePillActive: {
    borderColor: Colors.accent,
  },
  rolePillText: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.light.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  message: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border.primary,
    marginVertical: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  item: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.background.secondary,
    borderWidth: 1,
    borderColor: Colors.dark.border.primary,
  },
  itemTitle: {
    color: Colors.dark.text.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  itemMeta: {
    color: Colors.dark.text.secondary,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  dangerButton: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  dangerButtonText: {
    color: Colors.warning,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
})
