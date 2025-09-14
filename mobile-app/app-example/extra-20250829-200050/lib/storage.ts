import * as SecureStore from 'expo-secure-store'
import * as FileSystem from 'expo-file-system'

// セキュアストレージ（認証トークンなど）
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      console.error('SecureStore setItem error:', error)
      throw error
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      console.error('SecureStore getItem error:', error)
      return null
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error('SecureStore removeItem error:', error)
      throw error
    }
  }
}

// ファイルシステム操作
export const fileStorage = {
  // ドキュメントディレクトリのパス取得
  getDocumentDirectory(): string {
    return FileSystem.documentDirectory || ''
  },

  // ファイル保存
  async saveFile(filename: string, content: string, directory?: string): Promise<string> {
    try {
      const baseDir = directory || FileSystem.documentDirectory
      const fileUri = `${baseDir}${filename}`
      
      await FileSystem.writeAsStringAsync(fileUri, content)
      return fileUri
    } catch (error) {
      console.error('File save error:', error)
      throw error
    }
  },

  // ファイル読み込み
  async readFile(fileUri: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(fileUri)
    } catch (error) {
      console.error('File read error:', error)
      throw error
    }
  },

  // ファイル削除
  async deleteFile(fileUri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(fileUri)
    } catch (error) {
      console.error('File delete error:', error)
      throw error
    }
  },

  // ファイル存在確認
  async fileExists(fileUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri)
      return fileInfo.exists
    } catch (error) {
      console.error('File exists check error:', error)
      return false
    }
  },

  // ディレクトリ作成
  async createDirectory(dirUri: string): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true })
    } catch (error) {
      console.error('Directory creation error:', error)
      throw error
    }
  }
}

// 画像保存用のヘルパー関数
export const imageStorage = {
  // 画像をローカルに保存
  async saveImage(imageUri: string, filename?: string): Promise<string> {
    try {
      const timestamp = Date.now()
      const imageName = filename || `image_${timestamp}.jpg`
      const localUri = `${FileSystem.documentDirectory}images/`
      
      // imagesディレクトリを作成
      await fileStorage.createDirectory(localUri)
      
      const finalUri = `${localUri}${imageName}`
      await FileSystem.copyAsync({
        from: imageUri,
        to: finalUri
      })
      
      return finalUri
    } catch (error) {
      console.error('Image save error:', error)
      throw error
    }
  },

  // 画像のBase64エンコード
  async encodeImageToBase64(imageUri: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      })
    } catch (error) {
      console.error('Image encode error:', error)
      throw error
    }
  }
}