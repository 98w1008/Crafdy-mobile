import React from 'react'
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import CardShell from './CardShell'

interface Site { id: string; name: string }
interface WorkSiteCardProps {
  recentSites: Site[]
  onSelect: (site: Site) => void
  onSearch?: (q: string) => Promise<Site[]>
}

export default function WorkSiteCard({ recentSites, onSelect, onSearch }: WorkSiteCardProps) {
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<Site[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const runSearch = async () => {
    if (!onSearch || !q.trim()) { setResults(null); return }
    try { setLoading(true); const r = await onSearch(q.trim()); setResults(r) } catch { setResults([]) } finally { setLoading(false) }
  }
  return (
    <CardShell>
      <Text style={styles.title}>現場を選択</Text>
      <Text style={styles.subtitle}>最近使った現場</Text>
      <View style={styles.list}>
        {(results ?? recentSites).slice(0,5).map((s)=> (
          <Pressable key={s.id} onPress={()=>onSelect(s)} style={styles.item} accessibilityLabel={`${s.name} を選択`}>
            <Text style={styles.itemText}>{s.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.subtitle, { marginTop: 12 }]}>検索</Text>
      <TextInput value={q} onChangeText={setQ} onSubmitEditing={runSearch} placeholder="現場名を入力" placeholderTextColor="#9CA3AF" style={styles.search} />
      {loading && <Text style={{ color: '#9CA3AF', marginTop: 6 }}>検索中...</Text>}
      {results && (
        <>
          <Text style={[styles.subtitle, { marginTop: 12 }]}>検索結果</Text>
          <View style={styles.list}>
            {results.length === 0 ? (
              <Text style={{ color: '#9CA3AF' }}>一致が見つかりません</Text>
            ) : results.map((s)=> (
              <Pressable key={s.id} onPress={()=>onSelect(s)} style={styles.item} accessibilityLabel={`${s.name} を選択`}>
                <Text style={styles.itemText}>{s.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </CardShell>
  )
}

const styles = StyleSheet.create({
  title: { color: '#E8EDF7', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 6 },
  list: { marginTop: 8, gap: 8 },
  item: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  itemText: { color: '#E8EDF7' },
  search: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
})
