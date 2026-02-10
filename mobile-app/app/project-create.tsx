/**
 * PROD専用: 最短現場作成フォーム
 * 必須: 現場名、都道府県
 * 任意: 元請名、書類アップロード
 */

import React, { useState, useRef } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    Alert,
    Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getAccessToken, setAccessToken } from '@/lib/token-store'
import * as DocumentPicker from 'expo-document-picker'
import * as Clipboard from 'expo-clipboard'
import * as Crypto from 'expo-crypto'

// 都道府県リスト
const PREFECTURES = [
    '選択してください',
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

interface UploadedDocument {
    name: string
    uri: string
    type: string
    size: number
}

export default function ProjectCreateScreen() {
    const { user, profile, refreshProjectAccess } = useAuth()
    const router = useRouter()
    const [projectName, setProjectName] = useState('')
    const [prefecture, setPrefecture] = useState('選択してください')
    const [clientName, setClientName] = useState('')
    const [documents, setDocuments] = useState<UploadedDocument[]>([])
    const [loading, setLoading] = useState(false)
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
    const [linkingError, setLinkingError] = useState<boolean>(false)
    const [timeoutError, setTimeoutError] = useState<boolean>(false)
    const [errorDetail, setErrorDetail] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState<string>('')
    const [debugToken, setDebugToken] = useState<string | null>(null)
    const loadingRef = useRef(false)

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                multiple: true,
            })

            if (result.canceled) return

            const newDocs = result.assets.map(asset => ({
                name: asset.name,
                uri: asset.uri,
                type: asset.mimeType || 'application/octet-stream',
                size: asset.size || 0,
            }))

            setDocuments(prev => [...prev, ...newDocs])
        } catch (error) {
            console.error('Document pick error:', error)
            Alert.alert('エラー', '書類の選択に失敗しました')
        }
    }

    const handleRemoveDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index))
    }

    const handleBack = () => {
        // expo-router は canGoBack() が使える環境ならそれを使う
        // 使えない場合は try/catch で router.back() → replace fallback でもOK
        // @ts-ignore
        if (router.canGoBack?.()) router.back()
        else router.replace('/main-chat')
    }

    const validateForm = (): boolean => {
        if (!projectName.trim()) {
            Alert.alert('入力エラー', '現場名を入力してください')
            return false
        }
        if (prefecture === '選択してください') {
            Alert.alert('入力エラー', '都道府県を選択してください')
            return false
        }
        return true
    }

    /**
     * ensureJwt: アクセストークンを確実に取得するヘルパー関数
     * - token-store を唯一のJWT取得ルートとして使用
     * - 無ければ signInAnonymously() を実行してトークンを取得し、token-storeに保存
     *
     * Phase 1-2: token-store完全統合
     */
    const ensureJwt = async (): Promise<string> => {
        console.log('[ensureJwt] ▶ START (token-store統合版)')

        // token-store から取得（唯一のソース）
        let currentToken = getAccessToken()
        if (currentToken) {
            console.log('[ensureJwt] ✓ token-store has token, returning immediately')
            console.log('[ensureJwt] ▶ END (from token-store)')
            return currentToken
        }

        console.log('[ensureJwt] ⚠ No token in token-store, will perform anonymous sign-in with 8s timeout')
        // 8秒タイムアウト付きで signInAnonymously を実行
        const timeoutMs = 8000
        let timeoutId: any = null

        const signInPromise = (async () => {
            console.log('[ensureJwt] ▶ Calling supabase.auth.signInAnonymously()...')
            const { data, error } = await supabase!.auth.signInAnonymously()
            console.log('[ensureJwt] ✓ signInAnonymously() returned')

            if (error) {
                console.error('[ensureJwt] ✗ Anonymous sign-in error:', error)
                throw error
            }

            const token = data.session?.access_token
            if (!token) {
                console.error('[ensureJwt] ✗ NO access_token in session')
                throw new Error('NO_ACCESS_TOKEN')
            }

            // token-store に保存（重要！）
            setAccessToken(token)
            console.log('[ensureJwt] ✓ Anonymous sign-in successful, token saved to token-store')
            return token
        })()

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                console.error(`[ensureJwt] ✗ TIMEOUT after ${timeoutMs}ms`)
                reject(new Error(`TIMEOUT_SIGNIN_ANONYMOUS_${timeoutMs}ms`))
            }, timeoutMs)
        })

        try {
            const token = await Promise.race([signInPromise, timeoutPromise])
            if (timeoutId) clearTimeout(timeoutId)
            console.log('[ensureJwt] ▶ END (from anonymous sign-in, saved to token-store)')
            return token
        } catch (error: any) {
            if (timeoutId) clearTimeout(timeoutId)
            console.error('[ensureJwt] ✗ Failed to acquire JWT:', error)
            throw new Error(`JWT取得失敗: ${error.message || '不明なエラー'}`)
        }
    }

    const handleCreateProject = async () => {
        if (loadingRef.current) {
            console.warn('[handleCreateProject] ⚠️ すでに処理実行中のため、重複起動を防止しました。')
            return
        }
        if (!validateForm()) return

        loadingRef.current = true
        setLoading(true)
        setLinkingError(false)
        setTimeoutError(false)
        setErrorDetail(null)

        let activeStep = '開始'
        setCurrentStep(activeStep)
        console.log('[handleCreateProject] 🚀 処理開始')

        // fetchWithTimeout: Promise.raceで確実にtimeout rejectする
        const fetchWithTimeout = async (
            url: string,
            init: RequestInit,
            timeoutMs: number,
            stepName: string
        ): Promise<Response> => {
            const requestId = Crypto.randomUUID()
            const controller = new AbortController()
            let timeoutId: number | null = null

            console.log(`[fetchWithTimeout] ${requestId}: Start`, {
                stepName,
                url,
                timeoutMs
            })

            const fetchPromise = fetch(url, {
                ...init,
                signal: controller.signal
            })

            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    console.error(`[fetchWithTimeout] ${requestId}: TIMEOUT (${timeoutMs}ms)`, { stepName })
                    controller.abort()
                    reject(new Error(`TIMEOUT_${stepName}`))
                }, timeoutMs)
            })

            try {
                const response = await Promise.race([fetchPromise, timeoutPromise])
                console.log(`[fetchWithTimeout] ${requestId}: Success`, {
                    status: response.status,
                    stepName
                })
                return response
            } catch (error: any) {
                const isAbortError = error.name === 'AbortError'
                console.error(`[fetchWithTimeout] ${requestId}: Error`, {
                    stepName,
                    isAbortError,
                    message: error.message,
                    stack: error.stack?.split('\n').slice(0, 3).join(' / ')
                })
                throw error
            } finally {
                if (timeoutId) clearTimeout(timeoutId)
            }
        }

        // 認証リトライ付きDB操作ヘルパー
        const withAuthRetry = async <T,>(operation: () => Promise<T>, stepName: string): Promise<T> => {
            try {
                return await operation()
            } catch (error: any) {
                const isAuthError = error.status === 401 || error.code === '42501'
                if (isAuthError) {
                    console.warn(`[handleCreateProject] 🔐 認証エラー(${error.code})発生。匿名サインインでリトライします: ${stepName}`)
                    activeStep = `${stepName}_AUTH_RETRY`
                    setCurrentStep(activeStep)
                    const { error: anonError } = await supabase!.auth.signInAnonymously()
                    if (anonError) throw anonError
                    console.log('[handleCreateProject] ✅ 匿名サインイン成功。処理を再試行します。')
                    return await operation()
                }
                throw error
            }
        }

        try {
            if (!supabase) throw new Error('Supabase client not initialized')

            // --- STEP 1: 認証確認 (分解) ---
            let finalUserId: string | null = null

            // STEP 1-1: AuthContextの userId を確認
            activeStep = 'STEP1-1: AuthContext確認'
            setCurrentStep(activeStep)
            console.log('[handleCreateProject] STEP 1-1: AuthContextのuserIdを確認中...')
            if (user?.id) {
                finalUserId = user.id
                console.log('[handleCreateProject] STEP 1-1 成功: AuthContextから取得', { userId: finalUserId })
            } else {
                console.log('[handleCreateProject] STEP 1-1: AuthContextにuserIdなし')
            }

            // STEP 1-3: 匿名サインイン (まだuserIdがない場合)
            if (!finalUserId) {
                activeStep = 'STEP1-3: 匿名サインイン実行'
                setCurrentStep(activeStep)
                console.log('[handleCreateProject] STEP 1-3: supabase.auth.signInAnonymously() 呼び出し前...')
                try {
                    const anonResult = await supabase!.auth.signInAnonymously()
                    if (anonResult.error) {
                        console.error('[handleCreateProject] STEP 1-3 匿名サインイン エラー:', anonResult.error)
                        throw anonResult.error
                    } else if (anonResult.data.session?.user?.id) {
                        finalUserId = anonResult.data.session.user.id
                        console.log('[handleCreateProject] STEP 1-3 成功: 匿名サインイン完了', { userId: finalUserId })
                    }
                } catch (e: any) {
                    console.error('[handleCreateProject] STEP 1-3 匿名サインイン 致命的失敗:', e.message)
                    throw new Error('認証に失敗しました。通信環境を確認してください。')
                }
            }

            // STEP 1-4: 最終確定
            activeStep = 'STEP1-4: userId確定'
            setCurrentStep(activeStep)
            if (!finalUserId) {
                throw new Error('ユーザーIDの取得に失敗しました。')
            }
            console.log('[handleCreateProject] STEP 1-4 成功: 最終確定 userId:', finalUserId)


            // --- STEP 2: 現場データ登録 ---
            console.log('[handleCreateProject] STEP2: enter')
            activeStep = 'STEP2: 現場データ登録'
            setCurrentStep(activeStep)

            const body = {
                name: projectName.trim(),
                prefecture: prefecture,
            }

            let projectResult: any = null

            try {
                projectResult = await withAuthRetry(async () => {
                    console.log('[STEP2] start')

                    // トークン取得 (getSession撤去、ensureJwtを使用)
                    const currentToken = await ensureJwt()

                    // STEP2開始直後にトークン情報を必ずログ出力（eyJチェック）
                    const isValidJWT = currentToken.startsWith('eyJ')
                    console.log('[STEP2] token acquired immediately after ensureJwt:', {
                        tokenLength: currentToken.length,
                        tokenHead: currentToken.slice(0, 16),
                        tokenTail: currentToken.slice(-16),
                        startsWithEyJ: isValidJWT,
                        validJWT: isValidJWT ? '✓' : '✗ WARNING: NOT A VALID JWT'
                    })

                    const url = `${SUPABASE_URL}/rest/v1/projects?select=id,name,prefecture`
                    const headers = {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${currentToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Prefer': 'return=representation'
                    }

                    console.log('[STEP2] before fetch:', { url, method: 'POST', bodyLength: JSON.stringify(body).length })

                    const response = await fetchWithTimeout(
                        url,
                        {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(body)
                        },
                        20000,
                        'STEP2_PROJECT_INSERT'
                    )

                    console.log('[STEP2] after fetch:', {
                        status: response.status,
                        statusText: response.statusText,
                        contentType: response.headers.get('content-type')
                    })

                    const responseText = await response.text()
                    console.log('[STEP2] after body read:', {
                        textLength: responseText.length,
                        textPreview: responseText.slice(0, 200)
                    })

                    if (!response.ok) {
                        console.error('[handleCreateProject] STEP 2 RESTエラー:', response.status, responseText.slice(0, 200))
                        throw new Error(`REST_INSERT_ERROR: ${response.status}`)
                    }

                    let data: any
                    try {
                        data = JSON.parse(responseText)
                    } catch (parseError) {
                        console.error('[handleCreateProject] STEP 2 JSON parseエラー:', parseError)
                        throw new Error('JSON_PARSE_ERROR')
                    }

                    console.log('[handleCreateProject] STEP 2 成功データ:', data)

                    if (!data || data.length === 0) throw new Error('INSERT_NO_DATA')
                    return data[0]
                }, 'STEP2')
            } catch (error: any) {
                // STEP2がtimeoutした場合、実際にはDBに作成されている可能性がある
                if (error.message?.includes('TIMEOUT_STEP2')) {
                    console.warn('[handleCreateProject] STEP 2 timeout。DB確認を試行します...')
                    try {
                        // recovery時もensureJwtを使用
                        const currentToken = await ensureJwt()

                        const recoveryResponse = await fetchWithTimeout(
                            `${SUPABASE_URL}/rest/v1/projects?name=eq.${encodeURIComponent(projectName.trim())}&select=id,name,prefecture`,
                            {
                                method: 'GET',
                                headers: {
                                    'apikey': SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${currentToken}`,
                                    'Content-Type': 'application/json'
                                }
                            },
                            3000,
                            'STEP2_RECOVERY_GET'
                        )

                        if (recoveryResponse.ok) {
                            const recoveryText = await recoveryResponse.text()
                            const recoveryData = JSON.parse(recoveryText)
                            if (recoveryData && recoveryData.length > 0) {
                                console.log('[handleCreateProject] ✅ STEP 2 recovery成功：現場は既に作成されていました', recoveryData[0])
                                projectResult = recoveryData[0]
                            }
                        }
                    } catch (recoveryError) {
                        console.warn('[handleCreateProject] STEP 2 recovery失敗:', recoveryError)
                    }
                }

                if (!projectResult) {
                    throw error
                }
            }

            const projectId = projectResult.id
            setCreatedProjectId(projectId)
            console.log('[handleCreateProject] ✓ STEP 2 成功', { projectId })

            // --- デバッグ: トークン情報表示 (token-store統合版) ---
            const debugToken = getAccessToken()
            if (debugToken) {
                setDebugToken(debugToken)
                console.log('[DEBUG] token-store.len=', debugToken.length)
            }
            console.log('[DEBUG] projectId=', projectId)
            console.log('[DEBUG] authContextUserId=', finalUserId)


            // --- STEP 3: メンバー紐付け + プロジェクト一覧更新 (同期実行) ---
            activeStep = 'STEP3: メンバー紐付け'
            setCurrentStep(activeStep)
            console.log('[handleCreateProject] STEP 3: メンバー紐付け開始...')

            try {
                await performLinking(projectId, finalUserId!)
                console.log('[handleCreateProject] ✓ STEP 3: メンバー紐付け完了')

                // 紐付け成功後に現場一覧を更新 (最大2.5秒で見切る)
                console.log('[handleCreateProject] ▶ refreshProjectAccess() 開始 (2.5s timeout)...')
                const refreshPromise = refreshProjectAccess()
                await Promise.race([
                    refreshPromise,
                    new Promise(resolve => setTimeout(resolve, 2500))
                ])
                console.log('[handleCreateProject] ✓ refreshProjectAccess() 完了またはタイムアウトで見切り')
            } catch (e) {
                console.warn('[handleCreateProject] ⚠ STEP 3 失敗 (非致命的):', e)
                // STEP3失敗は非致命的エラーとして続行
            }


            // --- STEP 4: 完了処理 ---
            activeStep = 'STEP4: 完了処理'
            setCurrentStep(activeStep)
            console.log('[handleCreateProject] STEP 4: 完了処理中...')
            Alert.alert('作成完了', `${projectName} を作成しました。`, [
                {
                    text: 'OK',
                    onPress: () => router.replace({
                        pathname: '/main-chat',
                        params: { newProjectId: projectId, newProjectName: projectName.trim() }
                    })
                }
            ])
            console.log('[handleCreateProject] ✅ STEP 2 完了 & STEP 3 開始済')

        } catch (error: any) {
            console.error(`[handleCreateProject] ❌ エラー発生 (ステップ: ${activeStep}):`, error)
            if (error.message.startsWith('TIMEOUT_')) {
                setTimeoutError(true)
                setErrorDetail(`処理がタイムアウトしました (${activeStep})。`)
            } else {
                setErrorDetail(error.message || '不明なエラー')
                Alert.alert('エラー', `現場の作成に失敗しました (${activeStep}): ` + (error.message || '不明なエラー'))
            }
        } finally {
            loadingRef.current = false
            setLoading(false)
            console.log('[handleCreateProject] 🏁 処理終了 (Loading解除)')
        }
    }

    const performLinking = async (projectId: string, userId: string) => {
        if (!supabase) return
        let retryCount = 0
        const maxRetries = 2
        let linked = false

        console.log('[performLinking] ▶ START (token-store統合版、直接INSERT方式)', { projectId, userId })

        while (retryCount < maxRetries && !linked) {
            try {
                // token-store から取得（唯一のソース）
                let token = getAccessToken()
                if (!token) {
                    console.log('[performLinking] ⚠ token-store にトークンなし。ensureJwtを試行します...')
                    token = await ensureJwt()
                }

                console.log(`[performLinking] ▶ Attempt ${retryCount + 1}:`, {
                    projectId,
                    userId,
                    tokenLength: token?.length || 0,
                    method: 'direct INSERT to projects_users'
                })

                // Phase 0 で join_project RPC は削除されるため、直接 INSERT に変更
                // RLS で自分の行は INSERT 可能（projects_users_self_manage ポリシー）
                const insertPromise = supabase!
                    .from('projects_users')
                    .insert({ project_id: projectId, user_id: userId })
                    .select()

                const timeoutPromise = new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT_STEP3_INSERT_PROJECTS_USERS')), 8000)
                )

                const { data, error: insertError } = await Promise.race([insertPromise, timeoutPromise])

                if (insertError) {
                    // 既に存在する場合は成功とみなす
                    if (insertError.code === '23505') { // unique violation
                        console.log('[performLinking] ✅ Already linked (duplicate key)')
                        linked = true
                    } else {
                        console.error('[performLinking] INSERTエラー:', insertError.code, insertError.message)
                        throw insertError
                    }
                } else {
                    console.log('[performLinking] ✅ INSERT成功:', data)
                    linked = true
                }
            } catch (e: any) {
                const errorMsg = e.message || JSON.stringify(e)
                const errorCode = e.code || 'UNKNOWN'
                console.warn(`[performLinking] Attempt ${retryCount + 1} 失敗:`, errorCode, errorMsg)

                // 最終試行で失敗した場合はアラート表示（非ブロッキング）
                if (retryCount === maxRetries - 1) {
                    Alert.alert('同期エラー', `メンバー紐付けに失敗しました (${errorCode}): ${errorMsg}\n現場自体は作成されています。`)
                }

                retryCount++
                if (retryCount < maxRetries && !linked) {
                    await new Promise(r => setTimeout(r, 1000))
                }
            }
        }

        if (!linked) {
            setLinkingError(true)
            console.error('[performLinking] すべての試行が失敗しました')
        }
    }

    const handleCopyToken = async () => {
        if (debugToken) {
            await Clipboard.setStringAsync(debugToken)
            Alert.alert('コピー完了', 'デバッグ用トークンをクリップボードにコピーしました。')
        }
    }

    const handleCopyProjectId = async () => {
        if (createdProjectId) {
            await Clipboard.setStringAsync(createdProjectId)
            Alert.alert('コピー完了', 'projectIdをクリップボードにコピーしました。')
        }
    }

    if (createdProjectId) {
        const isSuccess = !linkingError && !timeoutError
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>
                        {isSuccess ? '現場を作成しました' : (timeoutError ? '通信が不安定です' : '現場は作成されました')}
                    </Text>
                    <Text style={styles.errorText}>
                        {isSuccess
                            ? `${projectName} の作成が完了しました。`
                            : (timeoutError
                                ? `処理に時間がかかっています (${currentStep})。現場は作成されている可能性があります。`
                                : 'メンバー情報の紐付けに失敗したため、一覧に表示されない可能性があります。')}
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.replace({
                            pathname: '/main-chat',
                            params: { newProjectId: createdProjectId, newProjectName: projectName.trim() }
                        })}
                    >
                        <Text style={styles.primaryButtonText}>一覧を読み込んでチャットへ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            if (timeoutError) handleCreateProject()
                            else performLinking(createdProjectId, user?.id!)
                        }}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {timeoutError ? '最初から再試行' : '紐付けを再試行'}
                        </Text>
                    </TouchableOpacity>

                    {__DEV__ && (
                        <View style={styles.debugInfoContainer}>
                            <Text style={styles.debugLabel}>DEBUG INFO (Dev Only)</Text>

                            <Text style={styles.debugLabel}>Project ID:</Text>
                            <Text style={styles.debugValue}>{createdProjectId}</Text>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={styles.debugCopyButton}
                                    onPress={handleCopyProjectId}
                                >
                                    <Text style={styles.debugCopyButtonText}>IDをコピー</Text>
                                </TouchableOpacity>

                                {debugToken && (
                                    <TouchableOpacity
                                        style={styles.debugCopyButton}
                                        onPress={handleCopyToken}
                                    >
                                        <Text style={styles.debugCopyButtonText}>JWTをコピー</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        )
    }

    if (timeoutError && !createdProjectId) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>通信が不安定です</Text>
                    <Text style={styles.errorText}>
                        現場の作成処理がタイムアウトしました (${currentStep})。通信環境を確認して再試行してください。
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleCreateProject}
                    >
                        <Text style={styles.primaryButtonText}>再試行する</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleBack}
                    >
                        <Text style={styles.secondaryButtonText}>戻る</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Text style={styles.backButtonText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>現場を新規作成</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.form}>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>現場名</Text>
                        <TextInput
                            style={styles.input}
                            value={projectName}
                            onChangeText={setProjectName}
                            placeholder="例: ○○ビル新築工事"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>都道府県</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={prefecture}
                                onValueChange={(value) => setPrefecture(value)}
                                style={styles.picker}
                                dropdownIconColor="#94a3b8"
                            >
                                {PREFECTURES.map((pref, index) => (
                                    <Picker.Item key={index} label={pref} value={pref} />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>元請名（任意）</Text>
                        <Text style={styles.hint}>
                            入力すると元請別の見積単価の学習精度が上がります
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={clientName}
                            onChangeText={setClientName}
                            placeholder="例: ○○建設株式会社"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>書類を追加（後ほど可能）</Text>
                        <Text style={styles.hint}>
                            現場作成後にチャットからアップロードできます。
                        </Text>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handlePickDocument}
                        >
                            <Text style={styles.uploadButtonText}>📎 書類を選択</Text>
                        </TouchableOpacity>

                        {documents.length > 0 && (
                            <View style={styles.documentList}>
                                {documents.map((doc, index) => (
                                    <View key={index} style={styles.documentItem}>
                                        <Text style={styles.documentName} numberOfLines={1}>
                                            {doc.name}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveDocument(index)}
                                            style={styles.removeButton}
                                        >
                                            <Text style={styles.removeButtonText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.createButton, loading && styles.createButtonDisabled]}
                    onPress={handleCreateProject}
                    disabled={loading}
                >
                    <Text style={styles.createButtonText}>
                        {loading ? '作成中...' : '現場を確定する'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    backButtonText: {
        color: '#94a3b8',
        fontSize: 24,
        fontWeight: '300',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    form: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    formGroup: {
        marginBottom: 32,
    },
    label: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        lineHeight: 22,
    },
    hint: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 12,
        lineHeight: 20,
    },
    input: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    pickerContainer: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    picker: {
        color: '#fff',
        height: Platform.OS === 'ios' ? 150 : 50,
    },
    uploadButton: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#334155',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#94a3b8',
        fontSize: 15,
        fontWeight: '500',
    },
    createButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        paddingVertical: 18,
        marginHorizontal: 24,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    createButtonDisabled: {
        backgroundColor: '#1e293b',
        shadowOpacity: 0,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 32,
        alignItems: 'center',
    },
    errorTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    errorText: {
        color: '#94a3b8',
        fontSize: 15,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 40,
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        paddingVertical: 18,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderRadius: 16,
        paddingVertical: 18,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    secondaryButtonText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600',
    },
    documentList: {
        marginTop: 16,
        gap: 8,
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    documentName: {
        flex: 1,
        color: '#e2e8f0',
        fontSize: 14,
    },
    removeButton: {
        marginLeft: 12,
        padding: 4,
    },
    removeButtonText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    debugInfoContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    debugLabel: {
        color: '#64748b',
        fontSize: 12,
        marginBottom: 4,
        fontWeight: '600',
    },
    debugValue: {
        color: '#e2e8f0',
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 12,
    },
    debugCopyButton: {
        backgroundColor: '#334155',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#475569',
    },
    debugCopyButtonText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
})
