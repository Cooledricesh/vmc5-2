import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * ISO 날짜 문자열을 상대 시간으로 변환
 * 예: "2025-10-27T10:00:00Z" -> "3시간 전"
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
}

/**
 * 날짜를 "YYYY-MM-DD" 형식으로 포맷
 */
export function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
}

/**
 * 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷
 */
export function formatDateKorean(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy년 MM월 dd일', { locale: ko });
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
}

/**
 * 날짜와 시간을 "YYYY-MM-DD HH:mm" 형식으로 포맷
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd HH:mm');
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
}

/**
 * 생년월일을 나이로 변환
 */
export function calculateAge(birthDateString: string): number {
  try {
    const birthDate = parseISO(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    console.error('Invalid birth date string:', birthDateString);
    return 0;
  }
}

/**
 * 주어진 날짜가 오늘인지 확인
 */
export function isToday(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  } catch (error) {
    console.error('Invalid date string:', dateString);
    return false;
  }
}

/**
 * 다음 결제일까지 남은 일수 계산
 */
export function daysUntilNextPayment(nextPaymentDateString: string): number {
  try {
    const nextPaymentDate = parseISO(nextPaymentDateString);
    const today = new Date();
    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (error) {
    console.error('Invalid payment date string:', nextPaymentDateString);
    return 0;
  }
}