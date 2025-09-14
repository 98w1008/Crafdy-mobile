import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'

export default function UploadScreen() {
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('権限エラー', '写真ライブラリへのアクセス権限が必要です')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(asset => asset.uri)
      setSelectedImages(prev => [...prev, ...newImages])
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラへのアクセス権限が必要です')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    })

    if (!result.canceled && result.assets) {
      const newImage = result.assets[0].uri
      setSelectedImages(prev => [...prev, newImage])
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      })

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map(asset => asset.uri)
        setSelectedImages(prev => [...prev, ...newFiles])
      }
    } catch (error) {
      console.error('Document picker error:', error)
      Alert.alert('エラー', 'ファイルの選択に失敗しました')
    }
  }

  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, index) => index !== indexToRemove))
  }

  const processOCR = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('エラー', '処理する画像またはファイルを選択してください')
      return
    }

    setIsUploading(true)
    try {
      // OCR処理の実装（OpenAI Vision APIなど）
      // 一時的にダミーの処理
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      Alert.alert(
        '処理完了', 
        `${selectedImages.length}件のファイルを処理しました。\n結果は見積管理タブで確認できます。`,
        [
          {
            text: 'OK',
            onPress: () => setSelectedImages([])
          }
        ]
      )
    } catch (error) {
      console.error('OCR processing error:', error)
      Alert.alert('エラー', 'OCR処理に失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>アップロード</Text>
        <Text style={styles.subtitle}>レシート・見積書をOCR処理</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Upload Options */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>ファイルを選択</Text>
          
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadButtonText}>写真を撮る</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadIcon}>🖼️</Text>
              <Text style={styles.uploadButtonText}>ギャラリーから選択</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={styles.uploadButtonText}>ファイルを選択</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Files */}
        {selectedImages.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>
              選択したファイル ({selectedImages.length}件)
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.previewContainer}>
                {selectedImages.map((uri, index) => (
                  <View key={index} style={styles.previewItem}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* OCR Process Button */}
        {selectedImages.length > 0 && (
          <View style={styles.processSection}>
            <TouchableOpacity 
              style={[styles.processButton, isUploading && styles.processButtonDisabled]}
              onPress={processOCR}
              disabled={isUploading}
            >
              <Text style={styles.processButtonText}>
                {isUploading ? '処理中...' : 'OCR処理を開始'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.processDescription}>
              画像からテキストを抽出し、{'\n'}
              見積書やレシートのデータを自動で読み取ります
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 使い方のヒント</Text>
          <View style={styles.helpItem}>
            <Text style={styles.helpBullet}>•</Text>
            <Text style={styles.helpText}>明るい場所で撮影すると精度が向上します</Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpBullet}>•</Text>
            <Text style={styles.helpText}>文字がはっきり見えるように撮影してください</Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpBullet}>•</Text>
            <Text style={styles.helpText}>複数のファイルを一度に処理できます</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  uploadSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  uploadButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  processSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  processButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 12,
  },
  processButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  helpSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helpBullet: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
    marginTop: 2,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    lineHeight: 20,
  },
})