import * as Speech from 'expo-speech'

export class SpeechService {
  private static instance: SpeechService
  private isSpeaking = false

  static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService()
    }
    return SpeechService.instance
  }

  // テキスト読み上げ
  async speak(text: string, options?: {
    language?: string
    pitch?: number
    rate?: number
    volume?: number
    onStart?: () => void
    onDone?: () => void
    onError?: (error: any) => void
  }): Promise<void> {
    try {
      if (this.isSpeaking) {
        await this.stop()
      }

      const speechOptions: Speech.SpeechOptions = {
        language: options?.language || 'ja-JP',
        pitch: options?.pitch || 1.0,
        rate: options?.rate || 1.0,
        volume: options?.volume || 1.0,
        onStart: () => {
          this.isSpeaking = true
          options?.onStart?.()
        },
        onDone: () => {
          this.isSpeaking = false
          options?.onDone?.()
        },
        onError: (error) => {
          this.isSpeaking = false
          console.error('Speech error:', error)
          options?.onError?.(error)
        }
      }

      Speech.speak(text, speechOptions)
    } catch (error) {
      console.error('Speech speak error:', error)
      throw error
    }
  }

  // 読み上げ停止
  async stop(): Promise<void> {
    try {
      if (this.isSpeaking) {
        Speech.stop()
        this.isSpeaking = false
      }
    } catch (error) {
      console.error('Speech stop error:', error)
      throw error
    }
  }

  // 一時停止
  async pause(): Promise<void> {
    try {
      Speech.pause()
    } catch (error) {
      console.error('Speech pause error:', error)
      throw error
    }
  }

  // 再開
  async resume(): Promise<void> {
    try {
      Speech.resume()
    } catch (error) {
      console.error('Speech resume error:', error)
      throw error
    }
  }

  // 利用可能な音声の取得
  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      return await Speech.getAvailableVoicesAsync()
    } catch (error) {
      console.error('Get voices error:', error)
      return []
    }
  }

  // 読み上げ状態の確認
  async isSpeechSynthesisSupported(): Promise<boolean> {
    try {
      return Speech.isSpeakingAsync()
    } catch (error) {
      console.error('Speech support check error:', error)
      return false
    }
  }

  // 読み上げ中かどうか
  getSpeakingStatus(): boolean {
    return this.isSpeaking
  }
}

// AIアシスタントの音声機能
export class VoiceAssistant {
  private speechService: SpeechService

  constructor() {
    this.speechService = SpeechService.getInstance()
  }

  // AI分析結果の読み上げ
  async speakAnalysisResult(analysisText: string): Promise<void> {
    try {
      // 分析結果を音声で読み上げ
      await this.speechService.speak(analysisText, {
        language: 'ja-JP',
        rate: 0.9, // 少しゆっくり
        onStart: () => console.log('AI分析結果の読み上げ開始'),
        onDone: () => console.log('AI分析結果の読み上げ完了'),
        onError: (error) => console.error('読み上げエラー:', error)
      })
    } catch (error) {
      console.error('Analysis speech error:', error)
      throw error
    }
  }

  // 通知の読み上げ
  async speakNotification(message: string): Promise<void> {
    try {
      await this.speechService.speak(message, {
        language: 'ja-JP',
        pitch: 1.1, // 少し高めの音程
        rate: 1.0,
        volume: 0.8
      })
    } catch (error) {
      console.error('Notification speech error:', error)
      throw error
    }
  }

  // 操作ガイドの読み上げ
  async speakInstructions(instructions: string): Promise<void> {
    try {
      await this.speechService.speak(instructions, {
        language: 'ja-JP',
        rate: 0.8, // ゆっくり
        pitch: 0.9, // 少し低めの音程
        volume: 0.9
      })
    } catch (error) {
      console.error('Instructions speech error:', error)
      throw error
    }
  }

  // 読み上げ停止
  async stopSpeaking(): Promise<void> {
    await this.speechService.stop()
  }
}