/**
 * ApprovalFlow コンポーネントのテスト
 */

import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { ApprovalFlow } from '@/components/reports/ApprovalFlow'
import { Report, ApprovalRequest } from '@/types/reports'

// Mocks
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  return {
    ...RN,
    Alert: {
      alert: jest.fn()
    }
  }
})

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Medium: 'medium' }
}))

jest.mock('dayjs', () => {
  const mockDayjs = jest.fn((date?: string) => ({
    format: jest.fn((format: string) => {
      if (format === 'YYYY年MM月DD日 HH:mm') return '2024年01月15日 14:30'
      if (format === 'MM/DD HH:mm') return '01/15 14:30'
      return '2024-01-15'
    })
  }))
  return mockDayjs
})

// Test data
const mockReport: Report = {
  id: 'report-1',
  user_id: 'user-1',
  work_date: '2024-01-15',
  work_site_id: 'site-1',
  work_hours: 8,
  work_content: 'テスト作業内容',
  progress_rate: 50,
  special_notes: 'テスト特記事項',
  status: 'submitted',
  submitted_at: '2024-01-15T05:00:00Z',
  approved_at: null,
  approved_by: null,
  rejection_reason: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T05:00:00Z'
}

const mockApprovedReport: Report = {
  ...mockReport,
  status: 'approved',
  approved_at: '2024-01-15T06:00:00Z',
  approved_by: 'manager-1',
  approver: {
    id: 'manager-1',
    full_name: 'テスト管理者'
  }
}

const mockRejectedReport: Report = {
  ...mockReport,
  status: 'rejected',
  rejection_reason: 'データに不備があります',
  approved_by: 'manager-1',
  approver: {
    id: 'manager-1',
    full_name: 'テスト管理者'
  }
}

const mockOnApprovalAction = jest.fn()
const mockOnEdit = jest.fn()
const mockOnWithdraw = jest.fn()

describe('ApprovalFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Alert.alert as jest.Mock).mockClear()
  })

  describe('ステータス表示', () => {
    it('提出済み状態が正しく表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      expect(getByText('提出済み')).toBeTruthy()
      expect(getByText('2024年01月15日 14:30')).toBeTruthy()
    })

    it('承認済み状態が正しく表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockApprovedReport}
          currentUserId="manager-1"
          canApprove={true}
        />
      )

      expect(getByText('承認済み')).toBeTruthy()
      expect(getByText('承認者')).toBeTruthy()
      expect(getByText('テスト管理者')).toBeTruthy()
    })

    it('差戻し状態と理由が正しく表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockRejectedReport}
          currentUserId="manager-1"
          canApprove={true}
        />
      )

      expect(getByText('差戻し')).toBeTruthy()
      expect(getByText('差戻し理由')).toBeTruthy()
      expect(getByText('データに不備があります')).toBeTruthy()
    })
  })

  describe('承認履歴表示', () => {
    it('タイムラインが正しく表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockApprovedReport}
          currentUserId="manager-1"
          canApprove={true}
        />
      )

      expect(getByText('承認履歴')).toBeTruthy()
    })
  })

  describe('承認者のアクション', () => {
    it('承認権限がある場合に承認・差戻しボタンが表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      expect(getByText('承認')).toBeTruthy()
      expect(getByText('差戻し')).toBeTruthy()
    })

    it('承認ボタン押下時に確認ダイアログが表示される', async () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      const approveButton = getByText('承認')
      
      await act(async () => {
        fireEvent.press(approveButton)
      })

      expect(Alert.alert).toHaveBeenCalledWith(
        '承認確認',
        'この日報を承認しますか？',
        expect.arrayContaining([
          expect.objectContaining({ text: 'キャンセル' }),
          expect.objectContaining({ text: '承認する' })
        ])
      )
    })

    it('差戻しボタン押下時に入力フォームが表示される', async () => {
      const { getByText, queryByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      const rejectButton = getByText('差戻し')
      
      await act(async () => {
        fireEvent.press(rejectButton)
      })

      await waitFor(() => {
        expect(getByText('差戻し理由')).toBeTruthy()
        expect(getByText('差戻し実行')).toBeTruthy()
        expect(getByText('キャンセル')).toBeTruthy()
      })
    })

    it('承認権限がない場合にアクションボタンが非表示になる', () => {
      const { queryByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="worker-1"
          canApprove={false}
        />
      )

      expect(queryByText('承認')).toBeFalsy()
      expect(queryByText('差戻し')).toBeFalsy()
    })
  })

  describe('提出者のアクション', () => {
    it('下書きまたは差戻し状態の場合に編集ボタンが表示される', () => {
      const draftReport = { ...mockReport, status: 'draft' as const }
      
      const { getByText } = render(
        <ApprovalFlow
          report={draftReport}
          currentUserId="user-1"
          onEdit={mockOnEdit}
        />
      )

      expect(getByText('編集')).toBeTruthy()
    })

    it('提出済み状態の場合に取り下げボタンが表示される', () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="user-1"
          onWithdraw={mockOnWithdraw}
        />
      )

      expect(getByText('取り下げ')).toBeTruthy()
    })

    it('編集ボタン押下時に onEdit が呼ばれる', async () => {
      const draftReport = { ...mockReport, status: 'draft' as const }
      
      const { getByText } = render(
        <ApprovalFlow
          report={draftReport}
          currentUserId="user-1"
          onEdit={mockOnEdit}
        />
      )

      const editButton = getByText('編集')
      
      await act(async () => {
        fireEvent.press(editButton)
      })

      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('取り下げボタン押下時に確認ダイアログが表示される', async () => {
      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="user-1"
          onWithdraw={mockOnWithdraw}
        />
      )

      const withdrawButton = getByText('取り下げ')
      
      await act(async () => {
        fireEvent.press(withdrawButton)
      })

      expect(Alert.alert).toHaveBeenCalledWith(
        '取り下げ確認',
        'この日報を取り下げて下書きに戻しますか？',
        expect.arrayContaining([
          expect.objectContaining({ text: 'キャンセル' }),
          expect.objectContaining({ text: '取り下げ' })
        ])
      )
    })
  })

  describe('readonly モード', () => {
    it('readonly=true の場合にアクションボタンが非表示になる', () => {
      const { queryByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          readonly={true}
        />
      )

      expect(queryByText('承認')).toBeFalsy()
      expect(queryByText('差戻し')).toBeFalsy()
      expect(queryByText('編集')).toBeFalsy()
      expect(queryByText('取り下げ')).toBeFalsy()
    })
  })

  describe('承認処理の実行', () => {
    it('承認実行時に onApprovalAction が正しく呼ばれる', async () => {
      ;(Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        // 承認ボタンを自動的に押下
        const approveButton = buttons.find((b: any) => b.text === '承認する')
        if (approveButton) {
          approveButton.onPress()
        }
      })

      const { getByText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      const approveButton = getByText('承認')
      
      await act(async () => {
        fireEvent.press(approveButton)
      })

      await waitFor(() => {
        expect(mockOnApprovalAction).toHaveBeenCalledWith({
          report_id: 'report-1',
          action: 'approve'
        })
      })
    })

    it('差戻し実行時に onApprovalAction が正しく呼ばれる', async () => {
      const { getByText, getByPlaceholderText } = render(
        <ApprovalFlow
          report={mockReport}
          currentUserId="manager-1"
          canApprove={true}
          onApprovalAction={mockOnApprovalAction}
        />
      )

      // 差戻しボタンを押下
      const rejectButton = getByText('差戻し')
      await act(async () => {
        fireEvent.press(rejectButton)
      })

      // 理由を入力
      await waitFor(() => {
        const reasonInput = getByPlaceholderText('修正が必要な点を具体的に記入してください')
        fireEvent.changeText(reasonInput, 'テスト差戻し理由')
      })

      // Alert.alert をモック
      ;(Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const rejectButton = buttons.find((b: any) => b.text === '差戻し')
        if (rejectButton) {
          rejectButton.onPress()
        }
      })

      // 差戻し実行ボタンを押下
      const executeButton = getByText('差戻し実行')
      await act(async () => {
        fireEvent.press(executeButton)
      })

      await waitFor(() => {
        expect(mockOnApprovalAction).toHaveBeenCalledWith({
          report_id: 'report-1',
          action: 'reject',
          rejection_reason: 'テスト差戻し理由'
        })
      })
    })
  })
})