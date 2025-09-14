/**
 * 🚀 統合GlobalFABMenu - 緑色FABで6つの主要機能
 * 全画面共通の展開型メニューFAB
 * 必ず全6項目を表示する統一デザイン
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Pressable,
  Text,
  SafeAreaView,
  FlatList,
  PanResponder,
  Dimensions,
  Appearance,
} from 'react-native'
import { Surface, Portal } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useRouter } from 'expo-router'
import { THEME } from '../../src/theme'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'

// =============================================================================
// TYPES
// =============================================================================

interface FabAction { id: string; label: string; icon: any; route: string; description: string }

interface GlobalFABMenuProps {
  /** FABを非表示にするか */
  hidden?: boolean
  /** 現在のルート（特定画面では非表示にする） */
  currentRoute?: string
}

// =============================================================================
// CONSTANTS - 必須6項目
// =============================================================================

const FAB_ACTIONS: FabAction[] = [
  { id: 'daily-report', label: '日報作成',      icon: 'file-document-edit-outline',  route: '/reports/create',  description: '最小入力＋添付' },
  { id: 'attendance',   label: '勤怠集計',      icon: 'calendar-clock',              route: '/attendance/summary', description: '氏名一覧→個人' },
  { id: 'estimate',     label: '見積作成',      icon: 'calculator-variant-outline',  route: '/estimate/new',     description: '1つの投入口' },
  { id: 'invoice',      label: '請求書作成',    icon: 'file-document-outline',       route: '/invoice/create',   description: '出来高から自動' },
  { id: 'receipt',      label: 'レシート・搬入',icon: 'camera-outline',              route: '/receipt-scan',     description: 'AIで種別/勘定' },
  { id: 'site',         label: '新規現場登録',  icon: 'plus-circle-outline',         route: '/new-project',      description: '応援は無制限' },
]

// 旧仕様の非表示制御は廃止（常時表示）
const HIDDEN_ROUTES: string[] = []

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GlobalFABMenu({ hidden = false, currentRoute }: GlobalFABMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const translateY = useRef(new Animated.Value(0)).current
  const startY = useRef(0)
  const screen = useRef(Dimensions.get('window')).current
  const FAB_SIZE = 64
  const PEEK = 12
  const EDGE_THRESHOLD = 40
  const STORAGE_KEY = 'fab_position_v1'
  const isDark = Appearance.getColorScheme() === 'dark'

  // FAB位置（左上起点）
  const fabPos = useRef(new Animated.ValueXY({ x: screen.width - (FAB_SIZE + 20), y: screen.height - (FAB_SIZE + 28) })).current
  const fabDocked = useRef<'left' | 'right' | null>(null)

  // 位置の読み出し
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw)
          const x = Math.max(-(FAB_SIZE - PEEK), Math.min(saved.x ?? 0, screen.width - (saved.docked === 'right' ? PEEK : FAB_SIZE)))
          const y = Math.max(20, Math.min(saved.y ?? 0, screen.height - (FAB_SIZE + 28)))
          fabDocked.current = saved.docked ?? null
          fabPos.setValue({ x, y })
        }
      } catch {}
    })()
  }, [])

  // 向き変更時に画面内へクランプ
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const cur = (fabPos as any).__getValue?.() || { x: 0, y: 0 }
      const xMax = window.width - (fabDocked.current === 'right' ? PEEK : FAB_SIZE)
      const xMin = fabDocked.current === 'left' ? -(FAB_SIZE - PEEK) : 0
      const newX = Math.max(xMin, Math.min(cur.x, xMax))
      const newY = Math.max(20, Math.min(cur.y, window.height - (FAB_SIZE + 28)))
      fabPos.setValue({ x: newX, y: newY })
    })
    return () => (sub as any)?.remove?.()
  }, [fabPos])
  const closeSheet = () => setIsOpen(false)
  const openSheet = () => setIsOpen(true)
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, g) => { startY.current = g.dy },
    onPanResponderMove: (_, g) => {
      const dy = Math.max(0, g.dy - startY.current)
      translateY.setValue(dy)
    },
    onPanResponderRelease: (_, g) => {
      const dy = g.dy - startY.current
      if (dy > 80) closeSheet()
      else Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }).start()
    },
  }), [translateY])

  // FAB自体のドラッグ
  const fabStart = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const fabPanResponder = useMemo(() => PanResponder.create({
    // タップはPressableに任せ、移動が発生したときのみドラッグへ移行
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => (Math.abs(g.dx) + Math.abs(g.dy)) > 4,
    onPanResponderGrant: () => {
      const cur = (fabPos as any).__getValue?.() || { x: 0, y: 0 }
      fabStart.current = cur
      isDraggingRef.current = false
    },
    onPanResponderMove: (_, g) => {
      if (!isDraggingRef.current && (Math.abs(g.dx) + Math.abs(g.dy) > 3)) {
        isDraggingRef.current = true
      }
      const nx = fabStart.current.x + g.dx
      const ny = fabStart.current.y + g.dy
      // 仮クランプ（画面外に出すのはドロップ時のドックで）
      const x = Math.max(-FAB_SIZE, Math.min(nx, screen.width))
      const y = Math.max(20, Math.min(ny, screen.height - (FAB_SIZE + 28)))
      fabPos.setValue({ x, y })
    },
    onPanResponderRelease: async () => {
      // ドック判定
      const cur = (fabPos as any).__getValue?.() || { x: 0, y: 0 }
      let dock: 'left' | 'right' | null = null
      let x = cur.x
      if (cur.x < EDGE_THRESHOLD) {
        dock = 'left'
        x = -(FAB_SIZE - PEEK)
      } else if (cur.x > screen.width - (FAB_SIZE + EDGE_THRESHOLD)) {
        dock = 'right'
        x = screen.width - PEEK
      } else {
        x = Math.max(0, Math.min(cur.x, screen.width - FAB_SIZE))
      }
      const y = Math.max(20, Math.min(cur.y, screen.height - (FAB_SIZE + 28)))
      fabDocked.current = dock
      Animated.spring(fabPos, { toValue: { x, y }, useNativeDriver: false, bounciness: 8 }).start()
      try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y, docked: dock })) } catch {}
      setTimeout(() => { isDraggingRef.current = false }, 0)
    },
  }), [fabPos])

  // 現在のルートに基づいて非表示判定
  const shouldHide = hidden || false

  if (shouldHide) return null

  // FABメニューの開閉アニメーション
  const toggleMenu = async () => {
    await Haptics.selectionAsync()
    setIsOpen(!isOpen)
  }

  // アクション実行
  const handleActionPress = async (action: FabAction) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    closeSheet()
    router.push(action.route as any)
  }

  // styles関数は使用しない（インラインスタイルを使用）


  return (
    <Portal>
      <View style={{...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'flex-end', alignItems: 'flex-end'}} pointerEvents="box-none">
        {/* Backdrop */}
        {isOpen && (
          <Pressable style={{...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)'}} onPress={toggleMenu} accessibilityLabel="メニューを閉じる" />
        )}

        {/* Bottom Sheet */}
        {isOpen && (
          <View style={{position:'absolute', left:0,right:0,bottom:0, top:0}}>
            <Pressable style={{flex:1}} onPress={toggleMenu} accessibilityLabel="閉じる">
              <BlurView intensity={30} tint="light" style={{flex:1}} />
            </Pressable>
            <Animated.View style={{ transform:[{ translateY }], backgroundColor: isDark ? '#111827' : '#FFFFFF', borderTopLeftRadius:24, borderTopRightRadius:24 }} {...panResponder.panHandlers}>
              <SafeAreaView>
                <View style={{width:40,height:4,alignSelf:'center',backgroundColor:'#E5E7EB',borderRadius:2,marginTop:8,marginBottom:8}}/>
                <View style={{paddingHorizontal:16, paddingBottom: (Platform.OS==='ios'? 12:16)}}>
                  <FlatList
                    contentContainerStyle={{paddingBottom:28}}
                    data={FAB_ACTIONS}
                    numColumns={2}
                    keyExtractor={(i)=>i.id}
                    renderItem={({item}) => (
                      <Pressable
                        style={({pressed})=>({
                          width:'48%', margin:'1%',
                          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                          borderRadius: 16, padding:16,
                          borderWidth: 1,
                          borderColor: isDark ? '#374151' : '#E5E7EB',
                          alignItems:'center', justifyContent:'center',
                          transform:[{ scale: pressed?0.98:1 }],
                          ...(Platform.OS==='ios'?THEME.shadow.ios:THEME.shadow.android)
                        })}
                        onPress={() => handleActionPress(item)}
                      >
                        <View style={{width:56,height:56,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor: isDark ? '#111827' : '#F1F5F9', marginBottom:12}}>
                          <MaterialCommunityIcons name={item.icon as any} size={26} color={'#2563EB'}/>
                        </View>
                        <Text style={{fontWeight:'700', color: isDark ? '#F9FAFB' : '#111827', fontSize:15}}>{item.label}</Text>
                        <Text numberOfLines={1} style={{marginTop:6, color: isDark ? '#9CA3AF' : '#6B7280', fontSize:12}}>{item.description}</Text>
                      </Pressable>
                    )}
                    scrollEnabled={false}
                  />
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        )}

        {/* Floating FAB (draggable with edge peek) */}
        <Animated.View
          style={[ fabPos.getLayout(), { position:'absolute', width: FAB_SIZE, height: FAB_SIZE, zIndex: 1000 } ]}
          {...fabPanResponder.panHandlers}
        >
          <Pressable
            onPress={() => { if (!isDraggingRef.current) toggleMenu() }}
            style={({pressed})=>({
              width: FAB_SIZE, height: FAB_SIZE, borderRadius: 16,
              alignItems:'center', justifyContent:'center', overflow:'hidden',
              transform:[{ scale: pressed?0.98:1 }],
              ...(Platform.OS==='ios'?THEME.shadow.ios:THEME.shadow.android)
            })}
            accessibilityLabel={isOpen ? 'アクションメニューを閉じる' : 'アクションメニューを開く'}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#0EA5E9', '#2563EB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{...StyleSheet.absoluteFillObject, borderRadius: 16}}
            />
            <MaterialCommunityIcons name="plus" size={28} color={'#FFFFFF'}/>
          </Pressable>
        </Animated.View>
      </View>
    </Portal>
  )
}

// Styles removed - using inline styles instead

// 後方互換性のためのエクスポート
export { GlobalFABMenu as FabActions }
export default GlobalFABMenu
