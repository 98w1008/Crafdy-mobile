import { useColorScheme as useNativeColorScheme } from 'react-native'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ColorScheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'crafdy_theme_preference'

// Custom hook for theme management with user preferences
export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme()
  const [userTheme, setUserTheme] = useState<ColorScheme | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference()
  }, [])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY)
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setUserTheme(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setTheme = async (theme: ColorScheme | 'auto') => {
    try {
      if (theme === 'auto') {
        await AsyncStorage.removeItem(THEME_STORAGE_KEY)
        setUserTheme(null)
      } else {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, theme)
        setUserTheme(theme)
      }
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }
  }

  // Determine active color scheme
  const activeColorScheme: ColorScheme = userTheme || nativeColorScheme || 'light'

  return {
    colorScheme: activeColorScheme,
    userTheme,
    nativeColorScheme,
    setTheme,
    isLoading,
  }
}

// Simple hook for backward compatibility
export function useSimpleColorScheme(): ColorScheme {
  const { colorScheme } = useColorScheme()
  return colorScheme
}