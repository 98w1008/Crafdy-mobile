/**
 * ReportForm コンポーネントのテスト
 */

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { ReportForm } from '@/components/reports/ReportForm'
import { ReportFormData, WorkSite } from '@/types/reports'

// Mocks
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    control: {},
    handleSubmit: jest.fn((fn) => () => fn(mockFormData)),
    formState: { errors: {}, isDirty: true, isValid: true },
    watch: jest.fn(() => mockFormData),
    setValue: jest.fn(),
    reset: jest.fn()
  })),
  Controller: ({ render: renderProp }: any) => 
    renderProp({ field: { value: '', onChange: jest.fn(), onBlur: jest.fn() } })
}))

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' }
}))

jest.mock('dayjs', () => {
  const mockDayjs = jest.fn(() => ({
    tz: jest.fn(() => ({
      format: jest.fn(() => '2024-01-15')
    })),
    format: jest.fn(() => '2024年01月15日')
  }))
  mockDayjs.extend = jest.fn()
  return mockDayjs
})

// Test data
const mockWorkSites: WorkSite[] = [
  {
    id: 'site-1',
    company_id: 'company-1',
    name: 'テスト現場A',
    address: '東京都新宿区1-1-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'site-2', 
    company_id: 'company-1',
    name: 'テスト現場B',
    address: '東京都渋谷区2-2-2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

const mockFormData: Omit<ReportFormData, 'attachments'> = {
  work_date: '2024-01-15',
  work_site_id: 'site-1',
  work_hours: 8,
  work_content: 'テスト作業内容',
  progress_rate: 50,
  special_notes: 'テスト特記事項'
}

const mockOnSubmit = jest.fn()

describe('ReportForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('基本的なレンダリングが正常に行われる', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    // セクションタイトルの確認
    expect(getByText('📅 基本情報')).toBeTruthy()
    expect(getByText('🔨 作業内容 *')).toBeTruthy()
    expect(getByText('📊 進捗率 *')).toBeTruthy()
    expect(getByText('📝 特記事項')).toBeTruthy()
  })

  it('現場選択チップが正しく表示される', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    // 現場名が表示されることを確認
    expect(getByText('テスト現場A')).toBeTruthy()
    expect(getByText('テスト現場B')).toBeTruthy()
  })

  it('下書き保存ボタンが allowDraft=true の時に表示される', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    expect(getByText('下書き保存')).toBeTruthy()
  })

  it('下書き保存ボタンが allowDraft=false の時に非表示になる', () => {
    const { queryByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={false}
      />
    )

    expect(queryByText('下書き保存')).toBeFalsy()
  })

  it('提出ボタンが表示される', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    expect(getByText('日報を提出')).toBeTruthy()
  })

  it('進捗率選択ボタンが全て表示される', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    expect(getByText('未着手')).toBeTruthy()
    expect(getByText('25%')).toBeTruthy()
    expect(getByText('50%')).toBeTruthy()
    expect(getByText('75%')).toBeTruthy()
    expect(getByText('完了')).toBeTruthy()
  })

  it('初期データが正しく設定される', () => {
    const initialData: Partial<ReportFormData> = {
      work_date: '2024-01-15',
      work_hours: 8,
      work_content: 'テスト作業',
      progress_rate: 25,
      attachments: []
    }

    const { getByDisplayValue } = render(
      <ReportForm
        initialData={initialData}
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    // 初期値が設定されていることを確認
    expect(getByDisplayValue('8')).toBeTruthy()
  })

  it('編集モード時に適切なメッセージが表示される', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        isEditing={true}
        allowDraft={true}
      />
    )

    expect(getByText('更新後、管理者に通知されます')).toBeTruthy()
  })
})

describe('ReportForm - フォーム送信', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('提出ボタン押下時に onSubmit が正しく呼ばれる', async () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    const submitButton = getByText('日報を提出')
    
    await act(async () => {
      fireEvent.press(submitButton)
    })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          work_date: expect.any(String),
          work_hours: expect.any(Number),
          work_content: expect.any(String),
          progress_rate: expect.any(Number),
          attachments: expect.any(Array)
        }),
        'submit'
      )
    })
  })

  it('下書き保存ボタン押下時に onSubmit が正しく呼ばれる', async () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    const draftButton = getByText('下書き保存')
    
    await act(async () => {
      fireEvent.press(draftButton)
    })

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.any(Array)
        }),
        'save_draft'
      )
    })
  })
})

describe('ReportForm - エラーハンドリング', () => {
  it('onSubmit でエラーが発生した場合に適切に処理される', async () => {
    const errorOnSubmit = jest.fn().mockRejectedValue(new Error('送信エラー'))
    
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={errorOnSubmit}
        allowDraft={true}
      />
    )

    const submitButton = getByText('日報を提出')
    
    await act(async () => {
      fireEvent.press(submitButton)
    })

    await waitFor(() => {
      expect(errorOnSubmit).toHaveBeenCalled()
    })
  })

  it('ローディング中は送信ボタンが無効になる', () => {
    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        loading={true}
        allowDraft={true}
      />
    )

    const submitButton = getByText('日報を提出')
    expect(submitButton.props.accessibilityState?.disabled).toBe(true)
  })
})

describe('ReportForm - バリデーション', () => {
  it('必須項目が空の場合は送信ボタンが無効になる', () => {
    // フォームの状態を無効に設定
    jest.mocked(require('react-hook-form').useForm).mockReturnValue({
      control: {},
      handleSubmit: jest.fn(),
      formState: { errors: {}, isDirty: true, isValid: false }, // バリデーション失敗状態
      watch: jest.fn(() => ({ ...mockFormData, work_content: '' })), // 必須項目が空
      setValue: jest.fn(),
      reset: jest.fn()
    })

    const { getByText } = render(
      <ReportForm
        workSites={mockWorkSites}
        onSubmit={mockOnSubmit}
        allowDraft={true}
      />
    )

    const submitButton = getByText('日報を提出')
    expect(submitButton.props.accessibilityState?.disabled).toBe(true)
  })
})