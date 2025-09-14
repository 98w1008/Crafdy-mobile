import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import CardShell from './CardShell'

type Mode = 'progress'|'daily'|'milestone'
type TaxRule = 'inclusive'|'exclusive'

export default function BillingSettingsCard({ siteName, onConfirm }:{ siteName: string; onConfirm: (p:{ mode: Mode; taxRule: TaxRule; taxRate: number; closingDay: string; paymentTermDays: number }) => void }) {
  const [mode, setMode] = useState<Mode>('progress')
  const [taxRule, setTaxRule] = useState<TaxRule>('exclusive')
  const [taxRate, setTaxRate] = useState('10')
  const [closingDay, setClosingDay] = useState('31')
  const [paymentTerm, setPaymentTerm] = useState('30')
  return (
    <CardShell>
      <Text style={styles.title}>この現場の請求ルールを決めます</Text>
      <Text style={styles.subtitle}>{siteName}</Text>
      <Text style={styles.label}>請求形態</Text>
      <View style={styles.row}>
        {([['progress','出来高'],['daily','常用（日当）'],['milestone','マイルストーン']] as any[]).map(([v, label]) => (
          <Pressable key={v} onPress={()=>setMode(v)} style={[styles.chip, mode===v && styles.chipActive]} accessibilityLabel={`請求形態 ${label}`}>
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>税区分</Text>
      <View style={styles.row}>
        {([['exclusive','税抜'],['inclusive','税込']] as any[]).map(([v, label]) => (
          <Pressable key={v} onPress={()=>setTaxRule(v)} style={[styles.chip, taxRule===v && styles.chipActive]} accessibilityLabel={`税区分 ${label}`}>
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>税率（%）</Text>
      <TextInput value={taxRate} onChangeText={setTaxRate} keyboardType="numeric" placeholder="10" placeholderTextColor="#9CA3AF" style={styles.input} />
      <Text style={styles.label}>締日（日）</Text>
      <TextInput value={closingDay} onChangeText={setClosingDay} keyboardType="numeric" placeholder="31" placeholderTextColor="#9CA3AF" style={styles.input} />
      <Text style={styles.label}>支払サイト（日）</Text>
      <TextInput value={paymentTerm} onChangeText={setPaymentTerm} keyboardType="numeric" placeholder="30" placeholderTextColor="#9CA3AF" style={styles.input} />
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={()=> onConfirm({ mode, taxRule, taxRate: Number(taxRate)||10, closingDay, paymentTermDays: Number(paymentTerm)||30 })} accessibilityLabel="保存する">
          <Text style={styles.primaryText}>保存する</Text>
        </Pressable>
      </View>
    </CardShell>
  )
}

const styles = StyleSheet.create({
  title: { color: '#E8EDF7', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  label: { color: '#E8EDF7', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(59,130,246,0.25)' },
  chipText: { color: '#E8EDF7' },
  input: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
})
