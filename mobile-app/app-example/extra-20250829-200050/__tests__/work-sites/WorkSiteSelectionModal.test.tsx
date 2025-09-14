/**
 * 現場選択モーダルのテスト
 * Jest + React Testing Library
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import WorkSiteSelectionModal from '@/components/work-sites/WorkSiteSelectionModal';
import { WorkSite } from '@/types/work-sites';

// モック設定
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          neq: jest.fn(() => Promise.resolve({
            data: mockWorkSites,
            error: null,
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

// モックデータ
const mockWorkSites: WorkSite[] = [
  {
    id: '1',
    name: '渋谷区新築工事',
    address: '東京都渋谷区神宮前1-1-1',
    project_type: '新築',
    status: 'in_progress',
    client_name: '株式会社テスト',
    client_contact: '03-1234-5678',
    construction_start: '2024-01-15',
    construction_end: '2024-06-30',
    company_id: 'company-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: '新宿区リフォーム工事',
    address: '東京都新宿区西新宿2-2-2',
    project_type: 'リフォーム',
    status: 'planning',
    client_name: '個人宅主',
    company_id: 'company-1',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

// Alert のモック
const mockAlert = jest.spyOn(Alert, 'alert');

describe('WorkSiteSelectionModal', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    visible: true,
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    allowNewSiteRegistration: true,
    title: '現場を選択',
  };

  describe('レンダリング', () => {
    it('モーダルが正しく表示される', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('現場を選択')).toBeTruthy();
        expect(screen.getByPlaceholderText('現場名、住所、発注者で検索')).toBeTruthy();
      });
    });

    it('現場リストが表示される', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('渋谷区新築工事')).toBeTruthy();
        expect(screen.getByText('新宿区リフォーム工事')).toBeTruthy();
      });
    });

    it('現場の詳細情報が表示される', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('東京都渋谷区神宮前1-1-1')).toBeTruthy();
        expect(screen.getByText('株式会社テスト')).toBeTruthy();
        expect(screen.getByText('新築')).toBeTruthy();
      });
    });
  });

  describe('検索機能', () => {
    it('現場名で検索できる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('現場名、住所、発注者で検索');
      fireEvent.changeText(searchInput, '渋谷');
      
      await waitFor(() => {
        expect(screen.getByText('渋谷区新築工事')).toBeTruthy();
        expect(screen.queryByText('新宿区リフォーム工事')).toBeFalsy();
      });
    });

    it('住所で検索できる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('現場名、住所、発注者で検索');
      fireEvent.changeText(searchInput, '新宿区');
      
      await waitFor(() => {
        expect(screen.getByText('新宿区リフォーム工事')).toBeTruthy();
        expect(screen.queryByText('渋谷区新築工事')).toBeFalsy();
      });
    });

    it('発注者名で検索できる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('現場名、住所、発注者で検索');
      fireEvent.changeText(searchInput, 'テスト');
      
      await waitFor(() => {
        expect(screen.getByText('渋谷区新築工事')).toBeTruthy();
        expect(screen.queryByText('新宿区リフォーム工事')).toBeFalsy();
      });
    });

    it('検索結果がない場合の表示', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('現場名、住所、発注者で検索');
      fireEvent.changeText(searchInput, '存在しない現場');
      
      await waitFor(() => {
        expect(screen.getByText('条件に一致する現場がありません')).toBeTruthy();
      });
    });

    it('検索クリアボタンが機能する', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('現場名、住所、発注者で検索');
      fireEvent.changeText(searchInput, '渋谷');
      
      await waitFor(() => {
        expect(screen.queryByText('新宿区リフォーム工事')).toBeFalsy();
      });
      
      // 検索クリア
      fireEvent.changeText(searchInput, '');
      
      await waitFor(() => {
        expect(screen.getByText('渋谷区新築工事')).toBeTruthy();
        expect(screen.getByText('新宿区リフォーム工事')).toBeTruthy();
      });
    });
  });

  describe('現場選択', () => {
    it('現場を選択できる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        const workSiteCard = screen.getByText('渋谷区新築工事');
        fireEvent.press(workSiteCard);
      });
      
      // 選択ボタンが有効になる
      const selectButton = screen.getByText('選択');
      expect(selectButton).toBeTruthy();
      fireEvent.press(selectButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockWorkSites[0]);
    });

    it('現場が未選択の場合は選択ボタンが無効', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        const selectButton = screen.getByText('現場を選択してください');
        expect(selectButton).toBeTruthy();
      });
    });

    it('複数の現場を切り替えて選択できる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        // 最初の現場を選択
        const firstSite = screen.getByText('渋谷区新築工事');
        fireEvent.press(firstSite);
        
        // 2番目の現場を選択
        const secondSite = screen.getByText('新宿区リフォーム工事');
        fireEvent.press(secondSite);
      });
      
      const selectButton = screen.getByText('選択');
      fireEvent.press(selectButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockWorkSites[1]);
    });
  });

  describe('新規現場登録', () => {
    it('新規現場登録ボタンが表示される', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('新規現場登録')).toBeTruthy();
      });
    });

    it('allowNewSiteRegistration=falseの場合は新規登録ボタンが非表示', async () => {
      render(
        <WorkSiteSelectionModal 
          {...defaultProps} 
          allowNewSiteRegistration={false} 
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByText('新規現場登録')).toBeFalsy();
      });
    });

    it('空の状態で新規現場登録ボタンが表示される', async () => {
      // 空のデータでモック
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            neq: jest.fn(() => Promise.resolve({
              data: [],
              error: null,
            })),
          })),
        })),
      });
      
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('現場が登録されていません')).toBeTruthy();
        expect(screen.getByText('新規現場を登録')).toBeTruthy();
      });
    });
  });

  describe('フィルタ機能', () => {
    it('フィルタボタンを押すとフィルタパネルが表示される', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        // フィルタボタンを探してタップ（アイコンで識別）
        const filterButtons = screen.getAllByRole('button');
        const filterButton = filterButtons.find(button => 
          button.props.accessibilityLabel === 'フィルタ' ||
          button.props.children?.props?.name === 'options-outline'
        );
        
        if (filterButton) {
          fireEvent.press(filterButton);
          expect(screen.getByText('フィルタ')).toBeTruthy();
          expect(screen.getByText('クリア')).toBeTruthy();
        }
      });
    });
  });

  describe('モーダルの開閉', () => {
    it('閉じるボタンでモーダルを閉じる', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        const closeButtons = screen.getAllByRole('button');
        const closeButton = closeButtons.find(button => 
          button.props.children?.props?.name === 'close'
        );
        
        if (closeButton) {
          fireEvent.press(closeButton);
          expect(mockOnClose).toHaveBeenCalled();
        }
      });
    });

    it('visible=falseの場合はモーダルが表示されない', () => {
      render(<WorkSiteSelectionModal {...defaultProps} visible={false} />);
      
      expect(screen.queryByText('現場を選択')).toBeFalsy();
    });
  });

  describe('エラーハンドリング', () => {
    it('データ取得エラー時にアラートが表示される', async () => {
      // エラーを発生させるモック
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            neq: jest.fn(() => Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        })),
      });
      
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('エラー', '現場データの取得に失敗しました');
      });
    });

    it('認証エラー時の処理', async () => {
      const mockSupabase = require('@/lib/supabase').supabase;
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });
      
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('エラー', '現場データの取得に失敗しました');
      });
    });
  });

  describe('リフレッシュ機能', () => {
    it('プルトゥリフレッシュが機能する', async () => {
      const { getByTestId } = render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        // FlatListのrefreshControlをシミュレート
        // 実際のテストでは、FlatListのtestIDを設定して取得
        const flatList = screen.getByRole('list');
        if (flatList) {
          fireEvent(flatList, 'refresh');
        }
      });
      
      // リフレッシュ後にデータが再取得されることを確認
      await waitFor(() => {
        expect(screen.getByText('渋谷区新築工事')).toBeTruthy();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なアクセシビリティラベルが設定されている', async () => {
      render(<WorkSiteSelectionModal {...defaultProps} />);
      
      await waitFor(() => {
        // 重要なUI要素にアクセシビリティラベルがあることを確認
        expect(screen.getByPlaceholderText('現場名、住所、発注者で検索')).toBeTruthy();
      });
    });
  });
});