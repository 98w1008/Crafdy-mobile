import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import CardShell from './CardShell'

interface WorkerPick { id: string; name: string; isSupport?: boolean }

interface ReportCardProps {
  siteName: string
  date: string
  workers: WorkerPick[]
  onConfirm: (payload: { content: string; picks: { workerId: string; unit: 1|0.5; rate?: number }[]; photos: string[] }) => void
  onEdit?: () => void
  onToggleAllHalf?: (half: boolean) => void
}

export default function ReportCard({ siteName, date, workers, onConfirm, onEdit, onToggleAllHalf }: ReportCardProps) {
  const [content, setContent] = useState('')
  const [picks, setPicks] = useState<Record<string, 1|0.5>>(() => Object.fromEntries(workers.map(w => [w.id, 1])))

  return (
    <CardShell>
      <Text style={styles.title}>日報</Text>
      <Text style={styles.subtitle}>{siteName} / {date}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>作業員</Text>
        <Pressable onPress={() => onToggleAllHalf?.(true)} accessibilityLabel="全員0.5にする" style={styles.allHalf}><Text style={styles.allHalfText}>全員0.5</Text></Pressable>
      </View>
      <View style={styles.chips}>
        {workers.map(w => (
          <Pressable key={w.id} style={[styles.chip, picks[w.id] === 0.5 && styles.chipActive]} onPress={() => setPicks(p => ({ ...p, [w.id]: (p[w.id]===1?0.5:1) as 1|0.5 }))} accessibilityLabel={`${w.name} の人工を切り替える`}>
            <Text style={styles.chipText}>{w.name}</Text>
            <Text style={styles.chipUnit}>{picks[w.id] === 0.5 ? '0.5' : '1.0'}</Text>
          </Pressable>
        ))}
      </View>
      {/* ここに作業内容入力や写真添付UIを段階実装 */}
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={() => onConfirm({ content, picks: Object.entries(picks).map(([id, unit]) => ({ workerId: id, unit } as any)), photos: [] })} accessibilityLabel="このまま登録">
          <Text style={styles.primaryText}>このまま登録</Text>
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
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  label: { color: '#E8EDF7' },
  allHalf: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  allHalfText: { color: '#E8EDF7' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(59,130,246,0.25)' },
  chipText: { color: '#E8EDF7' },
  chipUnit: { color: '#93C5FD', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: '#93C5FD', fontWeight: '700' },
})

