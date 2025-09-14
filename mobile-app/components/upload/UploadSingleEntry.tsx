import React, { useState } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { Button, Chip, Surface, Text } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { classifyDocumentDetailed, getDocTypeDisplayName, getDocTypeIcon, DocClassification } from '@/src/utils/classifyDoc'

type ExpenseCategory = '材料' | '消耗品' | '交通費' | '高速' | '駐車' | '雑費'

interface UploadSingleEntryProps {
  onConfirm: (payload: {
    uri: string
    name: string
    mimeType: string
    classification: DocClassification
    expenseCategory?: ExpenseCategory
  }) => void
}

export default function UploadSingleEntry({ onConfirm }: UploadSingleEntryProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [mimeType, setMimeType] = useState<string>('')
  const [classification, setClassification] = useState<DocClassification | null>(null)
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | undefined>()

  const suggestedCategories: ExpenseCategory[] = ['材料', '消耗品', '交通費', '高速', '駐車', '雑費']

  const runBackgroundClassify = (name: string) => {
    const cls = classifyDocumentDetailed(name)
    setClassification(cls)
    // レシート/搬入は勘定科目候補を提示
    if (cls.type === 'receipt' || cls.type === 'delivery_slip') {
      setExpenseCategory('材料')
    } else {
      setExpenseCategory(undefined)
    }
  }

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      const asset = result.assets[0]
      setPreviewUri(asset.uri)
      const name = asset.fileName || 'camera.jpg'
      setFileName(name)
      setMimeType(asset.mimeType || 'image/jpeg')
      runBackgroundClassify(name)
    }
  }

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })
    if (!result.canceled) {
      const asset = result.assets[0]
      setPreviewUri(asset.uri)
      const name = asset.fileName || 'image.jpg'
      setFileName(name)
      setMimeType(asset.mimeType || 'image/jpeg')
      runBackgroundClassify(name)
    }
  }

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({})
    if (res.canceled) return
    const file = res.assets[0]
    setPreviewUri(null)
    setFileName(file.name)
    setMimeType(file.mimeType || 'application/octet-stream')
    runBackgroundClassify(file.name)
  }

  const confirm = () => {
    if (!fileName || !classification) return
    onConfirm({
      uri: previewUri || '',
      name: fileName,
      mimeType,
      classification,
      expenseCategory,
    })
  }

  return (
    <Surface style={styles.container}>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>ファイル・写真アップロード</Text>
      <View style={styles.row}>
        <Button mode="contained" onPress={pickFromCamera} style={styles.button}>カメラ</Button>
        <Button mode="outlined" onPress={pickFromLibrary} style={styles.button}>ライブラリ</Button>
        <Button mode="outlined" onPress={pickDocument} style={styles.button}>ドキュメント</Button>
      </View>

      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} />
      ) : null}

      {fileName ? (
        <View style={{ marginTop: 12 }}>
          <Text variant="labelLarge">選択中: {fileName}</Text>
          {classification && (
            <View style={styles.classifyRow}>
              <Chip icon={getDocTypeIcon(classification.type)} style={styles.chip}>
                {getDocTypeDisplayName(classification.type)} ({Math.round(classification.confidence * 100)}%)
              </Chip>
              {(classification.type === 'receipt' || classification.type === 'delivery_slip') && (
                <View style={styles.expenseRow}>
                  <Text variant="labelSmall" style={{ marginRight: 8 }}>勘定科目:</Text>
                  {suggestedCategories.map(cat => (
                    <Chip
                      key={cat}
                      selected={expenseCategory === cat}
                      onPress={() => setExpenseCategory(cat)}
                      style={styles.chip}
                    >
                      {cat}
                    </Chip>
                  ))}
                </View>
              )}
            </View>
          )}
          <Button mode="contained" onPress={confirm} style={{ marginTop: 12 }}>アップロードして続行</Button>
        </View>
      ) : null}
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    marginRight: 8,
  },
  preview: {
    marginTop: 12,
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  classifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginLeft: 8,
  },
})

