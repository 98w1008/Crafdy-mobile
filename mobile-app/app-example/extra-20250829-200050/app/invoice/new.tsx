/**
 * 請求書作成画面
 */

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native'
import {
  Surface,
  Text,
  TextInput,
  Button,
  IconButton,
  List,
  Divider,
} from 'react-native-paper'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export default function NewInvoiceScreen() {
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '基礎工事',
      quantity: 1,
      unitPrice: 500000,
      amount: 500000
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = Math.floor(totalAmount * 0.1)
  const totalWithTax = totalAmount + taxAmount

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }
    setItems([...items, newItem])
  }

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice
        }
        return updated
      }
      return item
    }))
  }

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleSubmit = async () => {
    if (!clientName.trim() || !projectName.trim()) {
      Alert.alert('入力エラー', '必須項目を入力してください')
      return
    }

    setIsSubmitting(true)
    
    try {
      // TODO: Supabaseに請求書を保存
      await new Promise(resolve => setTimeout(resolve, 1500)) // Mock API
      
      if (Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      }
      
      Alert.alert('作成完了', '請求書を作成しました', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ])
    } catch (error) {
      Alert.alert('エラー', '作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderHeader = () => (
    <Surface style={styles.header}>
      <IconButton
        icon="close"
        size={24}
        onPress={() => router.back()}
      />
      <Text variant="headlineSmall" style={styles.headerTitle}>請求書作成</Text>
      <View style={{ width: 48 }} />
    </Surface>
  )

  const renderBasicInfo = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>基本情報</Text>
      
      <TextInput
        mode="outlined"
        label="宛先（お客様名） *"
        value={clientName}
        onChangeText={setClientName}
        style={styles.input}
      />
      
      <TextInput
        mode="outlined"
        label="プロジェクト名 *"
        value={projectName}
        onChangeText={setProjectName}
        style={styles.input}
      />
      
      <View style={styles.dateContainer}>
        <TextInput
          mode="outlined"
          label="請求日"
          value={invoiceDate}
          onChangeText={setInvoiceDate}
          style={[styles.input, styles.dateInput]}
        />
        <TextInput
          mode="outlined"
          label="支払期限"
          value={dueDate}
          onChangeText={setDueDate}
          style={[styles.input, styles.dateInput]}
        />
      </View>
    </Surface>
  )

  const renderItemsList = () => (
    <Surface style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>明細</Text>
        <IconButton
          icon="plus"
          size={20}
          onPress={handleAddItem}
        />
      </View>

      {items.map((item, index) => (
        <View key={item.id} style={styles.itemContainer}>
          <View style={styles.itemHeader}>
            <Text variant="bodyMedium">項目 {index + 1}</Text>
            <IconButton
              icon="delete"
              size={16}
              onPress={() => handleRemoveItem(item.id)}
            />
          </View>
          
          <TextInput
            mode="outlined"
            label="作業内容"
            value={item.description}
            onChangeText={(text) => handleUpdateItem(item.id, 'description', text)}
            style={styles.input}
          />
          
          <View style={styles.itemDetailsContainer}>
            <TextInput
              mode="outlined"
              label="数量"
              value={item.quantity.toString()}
              onChangeText={(text) => handleUpdateItem(item.id, 'quantity', parseInt(text) || 0)}
              keyboardType="numeric"
              style={[styles.input, styles.itemDetailInput]}
            />
            <TextInput
              mode="outlined"
              label="単価"
              value={item.unitPrice.toString()}
              onChangeText={(text) => handleUpdateItem(item.id, 'unitPrice', parseInt(text) || 0)}
              keyboardType="numeric"
              style={[styles.input, styles.itemDetailInput]}
            />
            <Text style={styles.amountText}>
              ¥{item.amount.toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </Surface>
  )

  const renderSummary = () => (
    <Surface style={styles.section}>
      <Text variant="titleMedium" style={styles.sectionTitle}>合計</Text>
      
      <View style={styles.summaryRow}>
        <Text variant="bodyMedium">小計</Text>
        <Text variant="bodyMedium">¥{totalAmount.toLocaleString()}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text variant="bodyMedium">消費税 (10%)</Text>
        <Text variant="bodyMedium">¥{taxAmount.toLocaleString()}</Text>
      </View>
      
      <Divider style={styles.divider} />
      
      <View style={styles.summaryRow}>
        <Text variant="titleMedium" style={styles.totalText}>合計金額</Text>
        <Text variant="titleMedium" style={styles.totalText}>
          ¥{totalWithTax.toLocaleString()}
        </Text>
      </View>
    </Surface>
  )

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.content}>
        {renderBasicInfo()}
        {renderItemsList()}
        {renderSummary()}

        <View style={styles.submitContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !clientName.trim() || !projectName.trim()}
            style={styles.submitButton}
          >
            請求書を作成
          </Button>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDetailInput: {
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    minWidth: 100,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  totalText: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  submitButton: {
    paddingVertical: 8,
  },
  bottomSpacing: {
    height: 80,
  },
})