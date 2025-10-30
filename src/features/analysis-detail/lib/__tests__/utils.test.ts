import { describe, it, expect } from 'vitest';
import { createFiveElementsChartData } from '../utils';

describe('createFiveElementsChartData', () => {
  describe('데이터 구조 검증', () => {
    it('should return array with 5 elements', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });
      expect(result).toHaveLength(5);
    });

    it('should return data with correct keys for RadarChart (subject, value, fullMark)', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      // RadarChart는 subject, value 키를 기대함
      result.forEach((item) => {
        expect(item).toHaveProperty('subject');
        expect(item).toHaveProperty('value');
        expect(item).toHaveProperty('fullMark');
        expect(item).toHaveProperty('color');
      });
    });

    it('should map wood score correctly', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      const woodElement = result.find((item) => item.subject === '목(木)');
      expect(woodElement).toBeDefined();
      expect(woodElement?.value).toBe(35);
      expect(woodElement?.fullMark).toBe(100);
      expect(woodElement?.color).toBe('#10B981');
    });

    it('should map fire score correctly', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      const fireElement = result.find((item) => item.subject === '화(火)');
      expect(fireElement).toBeDefined();
      expect(fireElement?.value).toBe(25);
      expect(fireElement?.fullMark).toBe(100);
      expect(fireElement?.color).toBe('#EF4444');
    });

    it('should handle zero values correctly', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      const earthElement = result.find((item) => item.subject === '토(土)');
      expect(earthElement).toBeDefined();
      expect(earthElement?.value).toBe(0);
      expect(earthElement?.fullMark).toBe(100);
    });

    it('should map all five elements with correct names', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      const subjects = result.map((item) => item.subject);
      expect(subjects).toContain('목(木)');
      expect(subjects).toContain('화(火)');
      expect(subjects).toContain('토(土)');
      expect(subjects).toContain('금(金)');
      expect(subjects).toContain('수(水)');
    });

    it('should use correct color codes', () => {
      const result = createFiveElementsChartData({
        wood: 35,
        fire: 25,
        earth: 0,
        metal: 15,
        water: 25,
      });

      const colors = result.map((item) => item.color);
      expect(colors).toContain('#10B981'); // wood
      expect(colors).toContain('#EF4444'); // fire
      expect(colors).toContain('#D97706'); // earth
      expect(colors).toContain('#6B7280'); // metal
      expect(colors).toContain('#3B82F6'); // water
    });
  });

  describe('경계값 테스트', () => {
    it('should handle maximum values (100)', () => {
      const result = createFiveElementsChartData({
        wood: 100,
        fire: 100,
        earth: 100,
        metal: 100,
        water: 100,
      });

      result.forEach((item) => {
        expect(item.value).toBe(100);
        expect(item.fullMark).toBe(100);
      });
    });

    it('should handle all zero values', () => {
      const result = createFiveElementsChartData({
        wood: 0,
        fire: 0,
        earth: 0,
        metal: 0,
        water: 0,
      });

      result.forEach((item) => {
        expect(item.value).toBe(0);
        expect(item.fullMark).toBe(100);
      });
    });
  });
});
