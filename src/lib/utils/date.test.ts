import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatRelativeTime,
  formatDate,
  formatDateKorean,
  formatDateTime,
  calculateAge,
  isToday,
  daysUntilNextPayment
} from './date';

describe('Date Utility Functions', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatRelativeTime', () => {
    it('should format recent time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const result = formatRelativeTime(oneHourAgo.toISOString());
      expect(result).toMatch(/약 1시간 전/);
    });

    it('should format days ago correctly', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo.toISOString());
      expect(result).toMatch(/3일 전/);
    });

    it('should handle invalid date string', () => {
      const result = formatRelativeTime('invalid-date');
      expect(result).toBe('invalid-date');
      expect(console.error).toHaveBeenCalledWith('Invalid date string:', 'invalid-date');
    });

    it('should handle empty string', () => {
      const result = formatRelativeTime('');
      expect(result).toBe('');
    });

    it('should handle null-like values', () => {
      // @ts-ignore - testing runtime behavior
      const result = formatRelativeTime(null);
      expect(result).toBe(null);
    });
  });

  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD format', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15');
    });

    it('should handle date without time', () => {
      const result = formatDate('2024-12-25');
      expect(result).toBe('2024-12-25');
    });

    it('should handle leap year date', () => {
      const result = formatDate('2024-02-29T00:00:00Z');
      expect(result).toBe('2024-02-29');
    });

    it('should handle invalid date string', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('not-a-date');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle malformed ISO string', () => {
      const result = formatDate('2024/01/15');
      expect(result).toBe('2024/01/15');
    });
  });

  describe('formatDateKorean', () => {
    it('should format date in Korean format', () => {
      const result = formatDateKorean('2024-01-15T10:30:00Z');
      expect(result).toBe('2024년 01월 15일');
    });

    it('should handle end of year date', () => {
      const result = formatDateKorean('2024-12-31T23:59:59Z');
      expect(result).toBe('2024년 12월 31일');
    });

    it('should handle beginning of year date', () => {
      const result = formatDateKorean('2024-01-01T00:00:00Z');
      expect(result).toBe('2024년 01월 01일');
    });

    it('should handle invalid date string', () => {
      const result = formatDateKorean('invalid');
      expect(result).toBe('invalid');
    });

    it('should handle undefined', () => {
      // @ts-ignore - testing runtime behavior
      const result = formatDateKorean(undefined);
      expect(result).toBe(undefined);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      // Note: This will be in local timezone, so we check the format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle midnight time', () => {
      const result = formatDateTime('2024-01-15T00:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle noon time', () => {
      const result = formatDateTime('2024-01-15T12:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle invalid date string', () => {
      const result = formatDateTime('bad-date-time');
      expect(result).toBe('bad-date-time');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age correctly for past birthday this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 30;
      const birthDate = new Date(birthYear, today.getMonth() - 1, today.getDate());
      const result = calculateAge(birthDate.toISOString());
      expect(result).toBe(30);
    });

    it('should calculate age correctly for upcoming birthday this year', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 30;
      const birthDate = new Date(birthYear, today.getMonth() + 1, today.getDate());
      const result = calculateAge(birthDate.toISOString());
      expect(result).toBe(29);
    });

    it('should calculate age correctly for birthday today', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const birthDate = new Date(birthYear, today.getMonth(), today.getDate());
      const result = calculateAge(birthDate.toISOString());
      expect(result).toBe(25);
    });

    it('should handle newborn (age 0)', () => {
      const today = new Date();
      const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const result = calculateAge(birthDate.toISOString());
      expect(result).toBe(0);
    });

    it('should handle leap year birth date', () => {
      const result = calculateAge('2000-02-29T00:00:00Z');
      const expectedAge = new Date().getFullYear() - 2000;
      // Account for whether birthday has passed this year
      expect([expectedAge - 1, expectedAge]).toContain(result);
    });

    it('should return 0 for invalid date', () => {
      const result = calculateAge('invalid-birth-date');
      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle future date (negative age)', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = calculateAge(futureDate.toISOString());
      expect(result).toBe(-1);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      const result = isToday(today.toISOString());
      expect(result).toBe(true);
    });

    it('should return true for today with different time', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = isToday(today.toISOString());
      expect(result).toBe(true);

      today.setHours(23, 59, 59, 999);
      const result2 = isToday(today.toISOString());
      expect(result2).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = isToday(yesterday.toISOString());
      expect(result).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = isToday(tomorrow.toISOString());
      expect(result).toBe(false);
    });

    it('should return false for last month same day', () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const result = isToday(lastMonth.toISOString());
      expect(result).toBe(false);
    });

    it('should return false for last year same date', () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const result = isToday(lastYear.toISOString());
      expect(result).toBe(false);
    });

    it('should return false for invalid date', () => {
      const result = isToday('not-a-date');
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('daysUntilNextPayment', () => {
    it('should calculate days correctly for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const result = daysUntilNextPayment(futureDate.toISOString());
      expect(result).toBe(10);
    });

    it('should return 0 for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = daysUntilNextPayment(pastDate.toISOString());
      expect(result).toBe(0);
    });

    it('should return 1 for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = daysUntilNextPayment(tomorrow.toISOString());
      expect(result).toBe(1);
    });

    it('should handle today as payment date', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const result = daysUntilNextPayment(today.toISOString());
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should handle month boundaries correctly', () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      const daysInCurrentMonth = new Date(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        0
      ).getDate();
      const today = new Date();
      const expectedDays = Math.ceil(
        (nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const result = daysUntilNextPayment(nextMonth.toISOString());
      expect(result).toBe(expectedDays);
    });

    it('should handle year boundaries correctly', () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      nextYear.setMonth(0);
      nextYear.setDate(1);
      const result = daysUntilNextPayment(nextYear.toISOString());
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(366); // Account for leap years
    });

    it('should return 0 for invalid date', () => {
      const result = daysUntilNextPayment('invalid-payment-date');
      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle empty string', () => {
      const result = daysUntilNextPayment('');
      expect(result).toBe(0);
    });
  });
});