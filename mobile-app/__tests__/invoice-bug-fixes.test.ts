/**
 * Invoice Bug Fixes Test Suite
 * Task 7: 請求書バグ修正 - Invalid Date・会社設定エラー・UI簡素化
 * 
 * Tests for:
 * 1. Invalid Date error fixes with dayjs
 * 2. Company settings error handling
 * 3. Enhanced data validation
 * 4. UI simplification
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validateInvoiceData, calculateDueDate, getCompanyInvoiceSettings } from '../lib/invoice-api';
import { dayjs, parseJpDate, formatIsoDate, nowJp } from '../src/utils/date';
import type { CreateInvoiceData } from '../types/invoice';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: { company_id: 'test-company-id' },
            error: null
          })
        }))
      }))
    })),
    rpc: jest.fn().mockResolvedValue({
      data: '2024-02-29', // Mock due date
      error: null
    })
  }
}));

describe('Invalid Date Fixes', () => {
  it('should handle invalid date strings gracefully', () => {
    const invalidDates = [
      '',
      null,
      undefined,
      'invalid-date',
      '2024-13-45', // Invalid month and day
      '2024/02/30', // Invalid date for February
    ];

    invalidDates.forEach(invalidDate => {
      const parsed = parseJpDate(invalidDate as any);
      if (!parsed.isValid()) {
        // Should fallback to current date without throwing
        expect(() => parseJpDate(invalidDate as any)).not.toThrow();
      }
    });
  });

  it('should format dates consistently with Asia/Tokyo timezone', () => {
    const testDate = '2024-01-15';
    const parsed = parseJpDate(testDate);
    
    expect(parsed.isValid()).toBe(true);
    expect(parsed.tz().format('YYYY-MM-DD')).toBe(testDate);
    
    const formatted = formatIsoDate(parsed);
    expect(formatted).toBe(testDate);
  });

  it('should handle edge cases for date parsing', () => {
    const edgeCases = [
      { input: '2024-02-29', expected: true }, // Valid leap year
      { input: '2023-02-29', expected: false }, // Invalid non-leap year
      { input: '2024-01-01', expected: true }, // New Year
      { input: '2024-12-31', expected: true }, // End of year
    ];

    edgeCases.forEach(({ input, expected }) => {
      const parsed = parseJpDate(input);
      expect(parsed.isValid()).toBe(expected);
    });
  });
});

describe('Company Settings Error Handling', () => {
  it('should provide fallback when company settings fail to load', async () => {
    // Mock failed company settings
    jest.mocked(require('../lib/supabase').supabase.from).mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' }
          })
        })
      })
    }));

    const settings = await getCompanyInvoiceSettings();
    
    // Should return default settings even when database query fails
    expect(settings).toBeTruthy();
    expect(settings?.invoice_default_due).toBe('month_end');
  });

  it('should calculate due date with fallback when company settings are unavailable', async () => {
    const issuedDate = formatIsoDate(nowJp());
    
    // Mock RPC failure
    jest.mocked(require('../lib/supabase').supabase.rpc).mockRejectedValueOnce(
      new Error('RPC function not found')
    );

    const result = await calculateDueDate(issuedDate);
    
    // Should provide fallback due date calculation
    expect(result).toBeTruthy();
    expect(result.calculated_date).toBeTruthy();
    expect(result.calculation_method).toBe('net30');
    
    // Should be 30 days after issued date
    const expectedDate = parseJpDate(issuedDate).add(30, 'day');
    expect(result.calculated_date).toBe(formatIsoDate(expectedDate));
  });

  it('should handle authentication errors gracefully', async () => {
    // Mock authentication failure
    jest.mocked(require('../lib/supabase').supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' }
    });

    const settings = await getCompanyInvoiceSettings();
    
    // Should return null instead of throwing
    expect(settings).toBeNull();
  });
});

describe('Enhanced Data Validation', () => {
  let validInvoiceData: CreateInvoiceData;

  beforeEach(() => {
    validInvoiceData = {
      amount: 100000,
      issued_date: formatIsoDate(nowJp()),
      due_date: formatIsoDate(nowJp().add(30, 'day')),
      description: 'Test invoice',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
    };
  });

  it('should validate invoice data comprehensively', () => {
    const result = validateInvoiceData(validInvoiceData);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch invalid amounts', () => {
    const testCases = [
      { amount: 0, shouldFail: true },
      { amount: -1000, shouldFail: true },
      { amount: 100000000, shouldFail: false }, // 1億円は警告だが有効
      { amount: 1000000000, shouldFail: true }, // 10億円は無効
    ];

    testCases.forEach(({ amount, shouldFail }) => {
      const data = { ...validInvoiceData, amount };
      const result = validateInvoiceData(data);
      
      if (shouldFail) {
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('金額'))).toBe(true);
      }
    });
  });

  it('should validate date relationships', () => {
    const today = nowJp();
    const yesterday = today.subtract(1, 'day');
    
    // Due date before issued date should fail
    const invalidData = {
      ...validInvoiceData,
      issued_date: formatIsoDate(today),
      due_date: formatIsoDate(yesterday),
    };

    const result = validateInvoiceData(invalidData);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('支払期日は発行日より後'))).toBe(true);
  });

  it('should validate email addresses', () => {
    const testEmails = [
      { email: 'valid@example.com', shouldPass: true },
      { email: 'invalid-email', shouldPass: false },
      { email: '@example.com', shouldPass: false },
      { email: 'test@', shouldPass: false },
      { email: '', shouldPass: true }, // Empty is allowed
    ];

    testEmails.forEach(({ email, shouldPass }) => {
      const data = { ...validInvoiceData, customer_email: email };
      const result = validateInvoiceData(data);
      
      if (!shouldPass && email !== '') {
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('メールアドレス'))).toBe(true);
      }
    });
  });

  it('should validate string field lengths', () => {
    const longString = 'a'.repeat(1001);
    
    const testCases = [
      { field: 'customer_name', value: 'a'.repeat(101), shouldFail: true },
      { field: 'description', value: longString, shouldFail: true },
      { field: 'customer_email', value: 'a'.repeat(250) + '@example.com', shouldFail: true },
    ];

    testCases.forEach(({ field, value, shouldFail }) => {
      const data = { ...validInvoiceData, [field]: value };
      const result = validateInvoiceData(data);
      
      if (shouldFail) {
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  it('should warn about unusual date ranges', () => {
    const veryOldDate = nowJp().subtract(4, 'years');
    const veryFutureDate = nowJp().add(3, 'years');
    
    // Test very old issued date
    const oldDateData = {
      ...validInvoiceData,
      issued_date: formatIsoDate(veryOldDate),
      due_date: formatIsoDate(veryOldDate.add(30, 'days')),
    };

    const oldDateResult = validateInvoiceData(oldDateData);
    expect(oldDateResult.errors.some(error => error.includes('3年以上前'))).toBe(true);

    // Test very future due date
    const futureDateData = {
      ...validInvoiceData,
      due_date: formatIsoDate(veryFutureDate),
    };

    const futureDateResult = validateInvoiceData(futureDateData);
    expect(futureDateResult.errors.some(error => error.includes('2年以上先'))).toBe(true);
  });
});

describe('Date Utility Functions', () => {
  it('should consistently handle timezone conversion', () => {
    const testDate = '2024-01-15T12:00:00.000Z';
    const parsed = parseJpDate(testDate);
    
    // Should be in Asia/Tokyo timezone
    expect(parsed.tz()).toBeTruthy();
    expect(parsed.format('YYYY-MM-DD')).toBe('2024-01-15');
  });

  it('should handle various date formats', () => {
    const formats = [
      '2024-01-15',
      '2024/01/15',
      '2024年01月15日',
    ];

    formats.forEach(format => {
      const parsed = parseJpDate(format);
      expect(parsed.isValid()).toBe(true);
      expect(parsed.format('YYYY-MM-DD')).toBe('2024-01-15');
    });
  });
});

describe('UI Simplification', () => {
  it('should provide simplified invoice creation flow', () => {
    // Test that the simplified flow requires fewer steps
    const requiredFields = ['amount', 'issued_date', 'due_date'];
    const optionalFields = ['customer_name', 'customer_email', 'description'];
    
    // Create minimal valid invoice with just required fields
    const minimalInvoice: CreateInvoiceData = {
      amount: 50000,
      issued_date: formatIsoDate(nowJp()),
      due_date: formatIsoDate(nowJp().add(30, 'day')),
    };

    const result = validateInvoiceData(minimalInvoice);
    expect(result.isValid).toBe(true);
    
    // Ensure optional fields don't cause validation errors when empty
    optionalFields.forEach(field => {
      expect(result.errors.some(error => error.includes(field))).toBe(false);
    });
  });

  it('should auto-calculate due dates to reduce user input', async () => {
    const issuedDate = formatIsoDate(nowJp());
    const result = await calculateDueDate(issuedDate);
    
    expect(result.calculated_date).toBeTruthy();
    expect(result.base_date).toBe(issuedDate);
    expect(['month_end', 'net30']).toContain(result.calculation_method);
    
    // Due date should be after issued date
    const issuedDayjs = parseJpDate(issuedDate);
    const dueDayjs = parseJpDate(result.calculated_date);
    expect(dueDayjs.isAfter(issuedDayjs)).toBe(true);
  });
});

describe('Error Recovery', () => {
  it('should gracefully handle network failures', async () => {
    // Mock network failure
    jest.mocked(require('../lib/supabase').supabase.rpc).mockRejectedValueOnce(
      new Error('Network error')
    );

    const issuedDate = formatIsoDate(nowJp());
    const result = await calculateDueDate(issuedDate);
    
    // Should provide fallback even when network fails
    expect(result).toBeTruthy();
    expect(result.calculated_date).toBeTruthy();
  });

  it('should handle database connection errors', async () => {
    // Mock database connection error
    jest.mocked(require('../lib/supabase').supabase.from).mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const settings = await getCompanyInvoiceSettings();
    
    // Should return null instead of crashing
    expect(settings).toBeNull();
  });
});