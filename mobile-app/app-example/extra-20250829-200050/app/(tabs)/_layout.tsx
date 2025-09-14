import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'

// タブレイアウトは新UIでは無効化されました
// メインチャット画面をベースとした新しいUIに移行しています

// このタブレイアウトは無効化されました
// 新しいUIではメインチャット画面を中心とした構成に変更されています
export default function TabLayout() {
  // メインチャット画面にリダイレクト
  React.useEffect(() => {
    router.replace('/main-chat')
  }, [])

  return (
    <View style={styles.container}>
      <Text>Loading...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})