/**
 * 🎨 Crafdy Mobile - Modern Theme Provider
 * Instagram/X/ChatGPTスタイルのシンプルなダーク/ライト切替
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTheme, type Theme, type ThemeMode } from './tokens'

// =============================================================================
// CONTEXT DEFINITION
// =============================================================================

interface ThemeContextValue {
  theme: Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  effectiveTheme: 'light' | 'dark'
  isDark: boolean
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// =============================================================================
// THEME PROVIDER
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'crafdy_theme_mode'

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>('light')

  useEffect(() => {
    const currentScheme = Appearance.getColorScheme()
    setSystemColorScheme(currentScheme)

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme)
    })

    return () => subscription?.remove()
  }, [])

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEY)
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode)
        }
      } catch (error) {
        console.warn('Failed to load saved theme:', error)
      }
    }

    loadSavedTheme()
  }, [])

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode)
      await AsyncStorage.setItem(STORAGE_KEY, mode)
    } catch (error) {
      console.warn('Failed to save theme mode:', error)
    }
  }

  const effectiveTheme: 'light' | 'dark' = (() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light'
    }
    return themeMode === 'dark' ? 'dark' : 'light'
  })()

  const theme = createTheme(effectiveTheme)

  const contextValue: ThemeContextValue = {
    theme,
    themeMode,
    setThemeMode,
    effectiveTheme,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// =============================================================================
// THEME HOOK
// =============================================================================

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

export const useColors = () => {
  const { theme } = useTheme()
  return theme.colors
}

export const useTypography = () => {
  const { theme } = useTheme()
  return theme.typography
}

export const useSpacing = () => {
  const { theme } = useTheme()
  return theme.spacing
}

export const useRadius = () => {
  const { theme } = useTheme()
  return theme.radius
}

export const useShadows = () => {
  const { theme } = useTheme()
  return theme.shadows
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { ThemeContextValue, ThemeMode }