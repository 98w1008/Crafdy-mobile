import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native'
import CardShell from './CardShell'

type Item = { description: string; qty: number; unit: string; unit_price: number }

export default function EstimateCard({ siteName, onConfirm }:{ siteName: string; onConfirm: (payload:{ title:string; items: Item[]; billingMode?: string }) => void }) {
  const [title, setTitle] = useState('')
  const [billingMode, setBillingMode] = useState<string|undefined>(undefined)
  const [items, setItems] = useState<Item[]>([{ description: '項目A', qty: 1, unit: '式', unit_price: 0 }])
  const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit: '式', unit_price: 0 }])
  const update = (i:number, p:Partial<Item>) => setItems(prev => prev.map((it,idx)=> idx===i ? { ...it, ...p } : it))
  const remove = (i:number) => setItems(prev => prev.filter((_,idx)=>idx!==i))
  return (
    <CardShell>
      <Text style={styles.title}>見積</Text>
      <Text style={styles.subtitle}>{siteName}</Text>
      <Text style={styles.label}>見積名</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="見積名" placeholderTextColor="#9CA3AF" style={styles.input} />
      <Text style={styles.label}>明細</Text>
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <TextInput value={it.description} onChangeText={(v)=>update(i,{description:v})} placeholder="品名" placeholderTextColor="#9CA3AF" style={[styles.input,{flex:2}]} />
          <TextInput value={String(it.qty)} keyboardType="numeric" onChangeText={(v)=>update(i,{qty:Number(v)||0})} placeholder="数量" placeholderTextColor="#9CA3AF" style={[styles.input,{flex:1}]} />
          <TextInput value={it.unit} onChangeText={(v)=>update(i,{unit:v})} placeholder="単位" placeholderTextColor="#9CA3AF" style={[styles.input,{flex:1}]} />
          <TextInput value={String(it.unit_price)} keyboardType="numeric" onChangeText={(v)=>update(i,{unit_price:Number(v)||0})} placeholder="単価" placeholderTextColor="#9CA3AF" style={[styles.input,{flex:1}]} />
          <Pressable onPress={()=>remove(i)} accessibilityLabel="行を削除" style={styles.delete}><Text style={{color:'#FCA5A5'}}>削除</Text></Pressable>
        </View>
      ))}
      <Pressable onPress={addItem} accessibilityLabel="行を追加" style={styles.add}><Text style={{color:'#93C5FD'}}>行を追加</Text></Pressable>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={()=> onConfirm({ title, items, billingMode })} accessibilityLabel="確定して保存">
          <Text style={styles.primaryText}>確定して保存</Text>
        </Pressable>
        <Pressable style={styles.secondary} accessibilityLabel="AIで明細提案"><Text style={styles.secondaryText}>AIで明細提案</Text></Pressable>
      </View>
    </CardShell>
  )
}

const styles = StyleSheet.create({
  title: { color: '#E8EDF7', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  label: { color: '#E8EDF7', marginTop: 8 },
  input: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 10, color: '#E8EDF7' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  delete: { paddingHorizontal: 8, paddingVertical: 8 },
  add: { marginTop: 8, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primary: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: '#93C5FD', fontWeight: '700' },
})

