import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Image, TextInput } from 'react-native'
import CardShell from './CardShell'

type Kind = 'receipt' | 'delivery' | 'other'
interface ReceiptCardProps {
  imageUri: string
  categoryCandidates: string[]
  filesCount?: number
  initialKind?: Kind
  index?: number
  onPrev?: () => void
  onNext?: () => void
  onRegister: (payload: { category: string; amount: number; kind: Kind; vendor?: string }) => void
  onEdit?: () => void
}

export default function ReceiptCard({ imageUri, categoryCandidates, filesCount = 1, index=0, initialKind='receipt', onPrev, onNext, onRegister, onEdit }: ReceiptCardProps) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [amount, setAmount] = useState<string>('')
  const [category, setCategory] = useState<string>(categoryCandidates[0] || '雑費')
  const [vendor, setVendor] = useState<string>('')
  const isValid = useMemo(()=>/^[0-9]+$/.test(amount) && Number(amount) > 0, [amount])
  return (
    <CardShell>
      <Text style={styles.title}>レシート/搬入</Text>
      {!!imageUri && (
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: imageUri }} style={styles.thumb} />
          {filesCount > 1 && (
            <View style={styles.badgeRow}>
              <Pressable onPress={onPrev} accessibilityLabel="前の画像" style={styles.sideHit} />
              <View style={styles.badge}><Text style={styles.badgeText}>{`${index+1}/${filesCount}`}</Text></View>
              <Pressable onPress={onNext} accessibilityLabel="次の画像" style={styles.sideHit} />
            </View>
          )}
        </View>
      )}
      <Text style={styles.subtitle}>種別</Text>
      <View style={styles.kinds}>
        {([['receipt','レシート'],['delivery','搬入伝票'],['other','その他']] as any[]).map(([k, label]) => (
          <Pressable key={k} onPress={()=>setKind(k)} style={[styles.kindChip, kind===k && styles.kindActive]} accessibilityLabel={`種別を${label}に`}>
            <Text style={styles.kindText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.subtitle}>金額（JPY）</Text>
      <TextInput
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        placeholderTextColor="#9CA3AF"
        style={styles.amount}
      />
      <Text style={styles.subtitle}>勘定科目</Text>
      <View style={styles.chips}>
        {categoryCandidates.map((c) => (
          <Pressable key={c} onPress={()=>setCategory(c)} style={[styles.chip, category===c && styles.chipActive]} accessibilityLabel={`${c}を選択`}>
            <Text style={styles.chipText}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.subtitle}>ベンダ名（任意）</Text>
      <TextInput value={vendor} onChangeText={setVendor} placeholder="店舗名など" placeholderTextColor="#9CA3AF" style={styles.vendor} />
      <View style={styles.actions}>
        <Pressable style={[styles.primary, !isValid && { opacity: 0.6 }]} disabled={!isValid} onPress={() => onRegister({ category, amount: Number(amount), kind, vendor })} accessibilityLabel="登録する">
          <Text style={styles.primaryText}>登録する</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onEdit} accessibilityLabel="修正する">
          <Text style={styles.secondaryText}>修正する</Text>
        </Pressable>
      </View>
    </CardShell>
  )
}

const styles = StyleSheet.create({
  title: { color: '#E8EDF7', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 8 },
  thumb: { width: '100%', height: 120, marginTop: 8, borderRadius: 12 },
  badgeRow: { position: 'absolute', left: 0, right: 0, bottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideHit: { flex: 1, height: 28 },
  badge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  kinds: { flexDirection: 'row', gap: 8, marginTop: 8 },
  kindChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' },
  kindActive: { backgroundColor: 'rgba(59,130,246,0.25)' },
  kindText: { color: '#E8EDF7' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(59,130,246,0.25)' },
  chipText: { color: '#E8EDF7' },
  amount: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
  vendor: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: '#93C5FD', fontWeight: '700' },
})
