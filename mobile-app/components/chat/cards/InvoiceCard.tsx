import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import CardShell from './CardShell'

type Rounding = 'cut'|'round'|'ceil'

export default function InvoiceCard({ siteName, initialRounding = 'round', onConfirm }:{ siteName: string; initialRounding?: Rounding; onConfirm: (payload:{ bill_to?: string; closing: 'end'|'15'; dueInDays?: number; rounding: Rounding }) => void }) {
  const [billTo, setBillTo] = useState('')
  const [closing, setClosing] = useState<'end'|'15'>('end')
  const [dueIn, setDueIn] = useState<string>('30')
  const [rounding, setRounding] = useState<Rounding>(initialRounding)

  useEffect(() => {
    setRounding(initialRounding)
  }, [initialRounding])
  return (
    <CardShell>
      <Text style={styles.title}>請求</Text>
      <Text style={styles.subtitle}>{siteName}</Text>
      <Text style={styles.label}>請求先</Text>
      <TextInput value={billTo} onChangeText={setBillTo} placeholder="請求先（任意）" placeholderTextColor="#9CA3AF" style={styles.input} />
      <Text style={styles.label}>端数処理</Text>
      <View style={styles.row}>
        {([['cut','切り捨て'],['round','四捨五入'],['ceil','切り上げ']] as const).map(([v, label]) => (
          <Pressable key={v} onPress={()=>setRounding(v)} style={[styles.chip, rounding===v && styles.chipActive]} accessibilityLabel={`端数処理 ${label}`}>
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>締め日</Text>
      <View style={styles.row}>
        {(['end','15'] as const).map(v => (
          <Pressable key={v} onPress={()=>setClosing(v)} style={[styles.chip, closing===v && styles.chipActive]} accessibilityLabel={`締め日 ${v==='end'?'月末':'15日'}`}>
            <Text style={styles.chipText}>{v==='end'?'月末':'15日'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>支払期日（締めから日数）</Text>
      <TextInput value={dueIn} onChangeText={setDueIn} keyboardType="numeric" placeholder="30" placeholderTextColor="#9CA3AF" style={styles.input} />
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={()=> onConfirm({ bill_to: billTo, closing, dueInDays: Number(dueIn)||30, rounding })} accessibilityLabel="確定して発行">
          <Text style={styles.primaryText}>確定して発行</Text>
        </Pressable>
        <Pressable style={styles.secondary} accessibilityLabel="PDFプレビュー"><Text style={styles.secondaryText}>PDFプレビュー</Text></Pressable>
      </View>
    </CardShell>
  )
}

const styles = StyleSheet.create({
  title: { color: '#E8EDF7', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  label: { color: '#E8EDF7', marginTop: 8 },
  input: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(59,130,246,0.25)' },
  chipText: { color: '#E8EDF7' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: '#93C5FD', fontWeight: '700' },
})
