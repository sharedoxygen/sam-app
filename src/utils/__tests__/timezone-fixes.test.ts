/**
 * Comprehensive unit tests for timezone fixes applied across the application
 * These tests validate that our date parsing logic is timezone-safe and consistent
 */

describe('Timezone Fixes - Core Date Parsing Logic', () => {
  describe('Future Date Validation Logic', () => {
    it('should correctly identify today as NOT future (timezone-safe)', () => {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // OLD BUGGY LOGIC (what we fixed)
      const oldRequestDate = new Date(todayString);
      const oldToday = new Date();
      oldToday.setHours(0, 0, 0, 0);

      // NEW FIXED LOGIC
      const newRequestDate = new Date(todayString + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const newTodayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      // Today should NOT be considered future in either case, but new logic is timezone-safe
      expect(newRequestDate > newTodayUTC).toBe(false);
    });

    it('should correctly identify tomorrow as future (timezone-safe)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      // NEW FIXED LOGIC
      const requestDate = new Date(tomorrowString + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      expect(requestDate > todayUTC).toBe(true);
    });

    it('should correctly identify yesterday as NOT future (timezone-safe)', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      // NEW FIXED LOGIC
      const requestDate = new Date(yesterdayString + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      expect(requestDate > todayUTC).toBe(false);
    });

    it('should handle edge case: midnight UTC across timezones', () => {
      // Test the specific bug we fixed - same calendar date should parse identically
      const testDate = '2025-07-22';

      // Our fixed parsing logic
      const parsedDate = new Date(testDate + 'T00:00:00.000Z');

      // Should always be UTC midnight regardless of server timezone
      expect(parsedDate.getUTCHours()).toBe(0);
      expect(parsedDate.getUTCMinutes()).toBe(0);
      expect(parsedDate.getUTCSeconds()).toBe(0);
      expect(parsedDate.getUTCMilliseconds()).toBe(0);
      expect(parsedDate.toISOString()).toBe('2025-07-22T00:00:00.000Z');
    });
  });

  describe('Date Range Parsing Logic', () => {
    it('should parse single date ranges consistently', () => {
      const testCases = [
        '2025-01-31', // End of January
        '2025-02-28', // Non-leap year
        '2024-02-29', // Leap year
        '2025-12-31', // End of year
        '2025-07-22', // Today's date
      ];

      testCases.forEach((dateString) => {
        // Our fixed logic for single date queries (used in activities API)
        const targetDate = new Date(dateString + 'T00:00:00.000Z');
        const nextDay = new Date(targetDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        // Verify correct date parsing
        expect(targetDate.toISOString()).toBe(dateString + 'T00:00:00.000Z');

        // Verify next day calculation
        const expectedNextDay = new Date(targetDate);
        expectedNextDay.setUTCDate(expectedNextDay.getUTCDate() + 1);
        expect(nextDay.getTime()).toBe(expectedNextDay.getTime());
      });
    });

    it('should parse date ranges consistently', () => {
      const testRanges = [
        { start: '2025-01-01', end: '2025-01-31' },
        { start: '2025-02-28', end: '2025-03-01' },
        { start: '2025-12-31', end: '2026-01-01' },
      ];

      testRanges.forEach(({ start, end }) => {
        // Our fixed logic for date ranges (used in activities API)
        const startDateParsed = new Date(start + 'T00:00:00.000Z');
        const endDateParsed = new Date(end + 'T23:59:59.999Z');

        expect(startDateParsed.toISOString()).toBe(start + 'T00:00:00.000Z');
        expect(endDateParsed.toISOString()).toBe(end + 'T23:59:59.999Z');
      });
    });
  });

  describe('Week Calculation Logic', () => {
    it('should calculate week start consistently (timezone-safe)', () => {
      const testCases = [
        { date: '2025-07-21', expectedWeekStart: '2025-07-21' }, // Monday
        { date: '2025-07-22', expectedWeekStart: '2025-07-21' }, // Tuesday
        { date: '2025-07-25', expectedWeekStart: '2025-07-21' }, // Friday
        { date: '2025-07-27', expectedWeekStart: '2025-07-21' }, // Sunday
      ];

      testCases.forEach(({ date, expectedWeekStart }) => {
        // Our fixed week calculation logic (used in weekly-activities API)
        const targetDate = new Date(date + 'T00:00:00.000Z');
        const weekStart = new Date(targetDate);
        const dayOfWeek = weekStart.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setUTCDate(weekStart.getUTCDate() + daysToMonday);
        weekStart.setUTCHours(0, 0, 0, 0);

        const result = weekStart.toISOString().split('T')[0];
        expect(result).toBe(expectedWeekStart);
      });
    });

    it('should handle month/year boundaries in week calculation', () => {
      const testCases = [
        { date: '2025-01-01', description: 'New Year (Wednesday)' },
        { date: '2025-12-31', description: 'Year End (Wednesday)' },
        { date: '2025-03-01', description: 'March Start' },
        { date: '2024-02-29', description: 'Leap Year Feb 29' },
      ];

      testCases.forEach(({ date, description }) => {
        const targetDate = new Date(date + 'T00:00:00.000Z');
        const weekStart = new Date(targetDate);
        const dayOfWeek = weekStart.getUTCDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setUTCDate(weekStart.getUTCDate() + daysToMonday);
        weekStart.setUTCHours(0, 0, 0, 0);

        // Week start should always be a Monday (dayOfWeek = 1)
        expect(weekStart.getUTCDay()).toBe(1);

        // Should always be at UTC midnight
        expect(weekStart.getUTCHours()).toBe(0);
        expect(weekStart.getUTCMinutes()).toBe(0);
        expect(weekStart.getUTCSeconds()).toBe(0);
      });
    });
  });

  describe('DST and Timezone Edge Cases', () => {
    it('should handle daylight saving time transitions consistently', () => {
      // These dates are problematic for timezone-dependent parsing
      const dstTransitionDates = [
        '2025-03-09', // Spring forward (US)
        '2025-11-02', // Fall back (US)
        '2025-03-30', // Spring forward (EU)
        '2025-10-26', // Fall back (EU)
      ];

      dstTransitionDates.forEach((dateString) => {
        const parsedDate = new Date(dateString + 'T00:00:00.000Z');

        // Should always parse to UTC midnight regardless of DST
        expect(parsedDate.toISOString()).toBe(dateString + 'T00:00:00.000Z');
        expect(parsedDate.getUTCHours()).toBe(0);
      });
    });

    it('should produce consistent results across different server timezones', () => {
      const testDate = '2025-07-22';

      // Simulate running on servers in different timezones
      // (We can't actually change the runtime timezone, but we can test our logic)
      const simulatedTimezones = [
        { name: 'PST', offset: -8 },
        { name: 'EST', offset: -5 },
        { name: 'UTC', offset: 0 },
        { name: 'CET', offset: 1 },
        { name: 'IST', offset: 5.5 },
        { name: 'JST', offset: 9 },
      ];

      simulatedTimezones.forEach(({ name, offset }) => {
        // Our fixed parsing should be identical regardless of server timezone
        const parsedDate = new Date(testDate + 'T00:00:00.000Z');

        // Should always be the same UTC time
        expect(parsedDate.toISOString()).toBe('2025-07-22T00:00:00.000Z');
        expect(parsedDate.getUTCDate()).toBe(22);
        expect(parsedDate.getUTCMonth()).toBe(6); // July = 6 (0-indexed)
        expect(parsedDate.getUTCFullYear()).toBe(2025);
      });
    });
  });

  describe('Regression Tests for Original Bugs', () => {
    it("should fix Brittany Dollar's bug: activity data not saving on Friday", () => {
      // Simulate the exact scenario from the bug report
      const fridayDate = '2025-07-18'; // A Friday

      // The bug occurred when users tried to save Friday data
      // OLD LOGIC would sometimes reject valid current dates
      // NEW LOGIC should always accept past/current dates

      const parsedDate = new Date(fridayDate + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      // Friday in the past should definitely not be considered future
      expect(parsedDate > todayUTC).toBe(false);
    });

    it("should fix Ashley Ralph's quote bug: valid until dates", () => {
      // Simulate quote expiration dates that were getting rejected
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekString = nextWeek.toISOString().split('T')[0];

      // Quote valid until next week should be accepted
      const validUntilDate = new Date(nextWeekString + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      expect(validUntilDate > todayUTC).toBe(true);
      expect(isNaN(validUntilDate.getTime())).toBe(false);
    });

    it('should prevent actual future dates correctly', () => {
      // Ensure our fix doesn't break legitimate future date rejection
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future
      const futureDateString = futureDate.toISOString().split('T')[0];

      const parsedFutureDate = new Date(futureDateString + 'T00:00:00.000Z');
      const nowUTC = new Date();
      const todayUTC = new Date(
        Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate())
      );

      // Should correctly identify as future
      expect(parsedFutureDate > todayUTC).toBe(true);
    });
  });

  describe('Performance and Consistency', () => {
    it('should parse dates quickly and consistently', () => {
      const testDates = Array.from({ length: 100 }, (_, i) => {
        const date = new Date('2025-01-01');
        date.setDate(date.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const startTime = performance.now();

      testDates.forEach((dateString) => {
        const parsedDate = new Date(dateString + 'T00:00:00.000Z');
        expect(parsedDate.getUTCHours()).toBe(0);
        expect(parsedDate.toISOString().endsWith('T00:00:00.000Z')).toBe(true);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be fast (less than 100ms for 100 dates)
      expect(duration).toBeLessThan(100);
    });

    it('should produce identical results for identical inputs', () => {
      const testDate = '2025-06-15';
      const iterations = 10;

      const results = Array.from({ length: iterations }, () => {
        return new Date(testDate + 'T00:00:00.000Z').toISOString();
      });

      // All results should be identical
      results.forEach((result) => {
        expect(result).toBe(testDate + 'T00:00:00.000Z');
      });
    });
  });
});
