import { Tabs } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'

import { HapticTab } from '@/components/HapticTab'
import { IconSymbol } from '@/components/ui/IconSymbol'
import TabBarBackground from '@/components/ui/TabBarBackground'
import { Colors } from '@/constants/GrayDesignTokens'
import { getThemeColors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useRole } from '@/contexts/AuthContext'

export default function TabLayout() {
  const { colorScheme } = useColorScheme()
  const theme = getThemeColors(colorScheme)
  const userRole = useRole()

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: Colors?.primary?.DEFAULT ?? '#52525B',
        tabBarInactiveTintColor: theme.text.tertiary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // iOS: 3タブ中央揃え・等間隔配置
            position: 'absolute',
            width: '100%',
            paddingHorizontal: 24, // 両側余白を増やして中央揃え
            height: 88,
            paddingBottom: 34, // Safe area対応
            paddingTop: 8,
            backgroundColor: theme.background.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border.light,
            shadowColor: Colors?.shadow?.DEFAULT ?? 'rgba(0, 0, 0, 0.08)',
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            // 3タブ中央揃え・等間隔配置
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          },
          default: {
            // Android: 3タブ中央揃え・等間隔配置
            width: '100%',
            paddingHorizontal: 24, // 両側余白を増やして中央揃え
            height: 72,
            paddingBottom: 8,
            paddingTop: 8,
            backgroundColor: theme.background.surface,
            borderTopWidth: 1,
            borderTopColor: theme.border.light,
            elevation: 8,
            // 3タブ中央揃え・等間隔配置
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          },
        }),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
          letterSpacing: 0.2,
          textAlign: 'center',
          // 1行制限（仕様要件）
          numberOfLines: 1,
          ellipsizeMode: 'clip',
        },
        tabBarIconStyle: {
          marginTop: 4,
          marginBottom: 1,
        },
        tabBarItemStyle: {
          // 3タブ等間隔・中央揃え配置
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 16, // 3タブなので余裕のある横パディング
          minHeight: 56,
          // 3タブ対応の広いタップエリア
          flex: 1,
          borderRadius: 8,
          marginHorizontal: 8, // タブ間隔を広くして等間隔表現
          backgroundColor: 'transparent',
        },
      }}>
      
      {/* ダッシュボード（ホーム画面） */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'ダッシュボード',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 24 : 22} 
              name="message.badge.fill" 
              color={color}
              style={{ 
                opacity: focused ? 1 : 0.7,
              }}
            />
          ),
        }}
      />

      {/* Projects（現場一覧） */}
      <Tabs.Screen
        name="projects"
        options={{
          title: '現場一覧',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 24 : 22} 
              name="folder.fill" 
              color={color}
              style={{ 
                opacity: focused ? 1 : 0.7,
              }}
            />
          ),
        }}
      />

      {/* Settings（設定） */}
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 24 : 22} 
              name="gearshape.fill" 
              color={color}
              style={{ 
                opacity: focused ? 1 : 0.7,
              }}
            />
          ),
        }}
      />

      {/* 不要なファイルはもう参照しないが、ファイルが存在する場合の対応 */}
    </Tabs>
  )
}