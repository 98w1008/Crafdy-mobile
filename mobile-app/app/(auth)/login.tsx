import { useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import LoginScreen from '@/ui/auth/LoginScreen'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginRoute() {
  const { user } = useAuth()
  const params = useLocalSearchParams<{ channel?: string; prefill?: string }>()
  const initialTab = params.channel === 'phone' ? 'phone' : 'email'
  const initialValue = params?.prefill ? String(params.prefill) : ''
  const forceInitialTab = params.channel === 'phone' || params.channel === 'email' || !!initialValue

  useEffect(() => {
    if (user) {
      router.replace('/main-chat')
    }
  }, [user])

  return (
    <LoginScreen
      initialTab={initialTab}
      initialValue={initialValue}
      forceInitialTab={forceInitialTab}
      onOpenTerms={() => console.info('TODO: 利用規約リンク')}
      onOpenPrivacy={() => console.info('TODO: プライバシーポリシーリンク')}
      onOpenSupport={() => router.push('/support-work')}
    />
  )
}

