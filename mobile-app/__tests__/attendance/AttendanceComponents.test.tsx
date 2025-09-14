/**
 * 勤怠管理コンポーネントのテスト
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import EmployeeCard from '../../components/attendance/EmployeeCard';
import DailyTimeList from '../../components/attendance/DailyTimeList';
import { EmployeeCardData, DailyAttendanceDetail } from '../../types/attendance';

// Mock data
const mockEmployee: EmployeeCardData = {
  id: 'emp001',
  name: '佐藤 太郎',
  thisMonthDays: 22,
  totalHours: 176.5,
  overtimeDays: 5,
  status: 'normal',
};

const mockAttendanceData: DailyAttendanceDetail[] = [
  {
    date: '2024-01-01',
    clockIn: '08:30',
    clockOut: '17:30',
    workSite: '渋谷現場A',
    status: 'normal',
    totalHours: 8,
    breakHours: 1,
    workType: 'construction',
    isPresent: true,
  },
  {
    date: '2024-01-02',
    clockIn: '08:00',
    clockOut: '19:00',
    workSite: '新宿現場B',
    status: 'overtime',
    totalHours: 10,
    breakHours: 1,
    workType: 'construction',
    isPresent: true,
  },
  {
    date: '2024-01-03',
    status: 'holiday',
    totalHours: 0,
    breakHours: 0,
    workType: 'construction',
    isPresent: false,
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('EmployeeCard', () => {
  it('社員情報が正しく表示される', () => {
    const { getByText } = render(
      <TestWrapper>
        <EmployeeCard employee={mockEmployee} />
      </TestWrapper>
    );

    expect(getByText('佐藤 太郎')).toBeTruthy();
    expect(getByText('22')).toBeTruthy(); // 今月出面日数
    expect(getByText('176.5')).toBeTruthy(); // 総時間
    expect(getByText('5')).toBeTruthy(); // 残業日数
    expect(getByText('通常勤務')).toBeTruthy(); // ステータス
  });

  it('カードタップ時にonPressが呼ばれる', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TestWrapper>
        <EmployeeCard employee={mockEmployee} onPress={mockOnPress} />
      </TestWrapper>
    );

    fireEvent.press(getByText('佐藤 太郎'));
    expect(mockOnPress).toHaveBeenCalledWith('emp001');
  });

  it('残業ステータスの社員カードが正しく表示される', () => {
    const overtimeEmployee: EmployeeCardData = {
      ...mockEmployee,
      status: 'overtime',
    };

    const { getByText } = render(
      <TestWrapper>
        <EmployeeCard employee={overtimeEmployee} />
      </TestWrapper>
    );

    expect(getByText('残業')).toBeTruthy();
  });

  it('休暇ステータスの社員カードが正しく表示される', () => {
    const holidayEmployee: EmployeeCardData = {
      ...mockEmployee,
      status: 'holiday',
    };

    const { getByText } = render(
      <TestWrapper>
        <EmployeeCard employee={holidayEmployee} />
      </TestWrapper>
    );

    expect(getByText('休暇')).toBeTruthy();
  });
});

describe('DailyTimeList', () => {
  it('勤怠データのリストが正しく表示される', () => {
    const { getByText } = render(
      <TestWrapper>
        <DailyTimeList
          attendanceData={mockAttendanceData}
          selectedMonth="2024-01"
        />
      </TestWrapper>
    );

    // 日付表示
    expect(getByText('1月1日')).toBeTruthy();
    expect(getByText('1月2日')).toBeTruthy();
    expect(getByText('1月3日')).toBeTruthy();

    // ステータス表示
    expect(getByText('通常')).toBeTruthy();
    expect(getByText('残業')).toBeTruthy();
    expect(getByText('休暇')).toBeTruthy();

    // 時間表示
    expect(getByText('08:30')).toBeTruthy();
    expect(getByText('17:30')).toBeTruthy();
    expect(getByText('8.0h')).toBeTruthy(); // 労働時間
  });

  it('データがない月では空の状態が表示される', () => {
    const { getByText } = render(
      <TestWrapper>
        <DailyTimeList
          attendanceData={[]}
          selectedMonth="2024-02"
        />
      </TestWrapper>
    );

    expect(getByText('2024年02月のデータがありません')).toBeTruthy();
  });

  it('出勤日のみフィルターされて表示される', () => {
    const { queryByText } = render(
      <TestWrapper>
        <DailyTimeList
          attendanceData={mockAttendanceData}
          selectedMonth="2024-01"
        />
      </TestWrapper>
    );

    // 出勤データは表示される
    expect(queryByText('渋谷現場A')).toBeTruthy();
    expect(queryByText('新宿現場B')).toBeTruthy();
    
    // 休暇日も表示される（ステータス表示として）
    expect(queryByText('休暇')).toBeTruthy();
  });
});

describe('AttendanceStatus Utils', () => {
  it('勤務ステータスが正しく変換される', () => {
    // この部分は実際のユーティリティ関数があれば追加
  });
});

describe('Attendance Integration', () => {
  it('EmployeeCardから詳細画面への遷移が正しく動作する', async () => {
    // router.pushのモックテスト
    const mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
    };

    // expo-routerのモック
    jest.doMock('expo-router', () => ({
      router: mockRouter,
    }));

    const { getByText } = render(
      <TestWrapper>
        <EmployeeCard employee={mockEmployee} />
      </TestWrapper>
    );

    fireEvent.press(getByText('佐藤 太郎'));
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/attendance/employee-detail/emp001');
    });
  });
});

describe('Error Handling', () => {
  it('不正なデータでもクラッシュしない', () => {
    const invalidEmployee = {
      ...mockEmployee,
      name: '',
      thisMonthDays: -1,
      totalHours: NaN,
    };

    expect(() => {
      render(
        <TestWrapper>
          <EmployeeCard employee={invalidEmployee} />
        </TestWrapper>
      );
    }).not.toThrow();
  });
});

describe('Accessibility', () => {
  it('アクセシビリティラベルが正しく設定されている', () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <EmployeeCard employee={mockEmployee} />
      </TestWrapper>
    );

    expect(getByLabelText('佐藤 太郎の勤怠詳細を確認')).toBeTruthy();
  });

  it('タッチ領域が最小サイズを満たしている', () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <EmployeeCard employee={mockEmployee} />
      </TestWrapper>
    );

    const touchableElement = getByLabelText('佐藤 太郎の勤怠詳細を確認');
    // 最小44pxのタッチ領域があることを確認
    expect(touchableElement.props.style).toEqual(
      expect.objectContaining({
        minHeight: 44,
      })
    );
  });
});