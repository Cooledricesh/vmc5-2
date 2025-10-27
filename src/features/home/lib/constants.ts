import type { Feature, PricingPlan, Testimonial, FAQ, Stat } from './types';

export const FEATURES: Feature[] = [
  {
    id: 'ai-analysis',
    icon: 'Sparkles',
    title: 'AI 기반 정확한 분석',
    description: 'Google Gemini AI를 활용해 전통 사주팔자를 과학적으로 분석합니다.',
  },
  {
    id: 'flexible-subscription',
    icon: 'CreditCard',
    title: '유연한 구독 시스템',
    description: '무료 체험부터 Pro 구독까지 단계별 서비스를 제공합니다.',
  },
  {
    id: 'secure-payment',
    icon: 'Shield',
    title: '안전한 결제 처리',
    description: '토스페이먼츠를 통한 정기결제 자동화로 안전하게 이용하세요.',
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '무료 체험',
    price: 0,
    currency: '원',
    period: '월',
    description: '서비스를 처음 경험해보세요',
    features: [
      '회원가입 시 3회 무료 분석',
      '기본 AI 모델 (gemini-2.0-flash)',
      '천간지지, 오행분석',
      '대운/세운 흐름도',
      '종합 분석 결과',
    ],
  },
  {
    id: 'pro',
    name: 'Pro 구독',
    price: 9900,
    currency: '원',
    period: '월',
    description: '더욱 정확한 프리미엄 분석',
    features: [
      '월 10회 프리미엄 분석',
      '고급 AI 모델 (gemini-2.0-pro)',
      '천간지지, 오행분석',
      '대운/세운 흐름도',
      '종합 분석 결과',
      '우선 고객 지원',
    ],
    isPopular: true,
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: '김민수',
    role: '직장인',
    content: '무료 체험으로 시작했는데 결과가 너무 정확해서 Pro 구독했어요. AI 분석이라 빠르고 정확해요!',
    rating: 5,
  },
  {
    id: 'testimonial-2',
    name: '이지은',
    role: '사업가',
    content: '대운과 세운 흐름을 보고 사업 타이밍을 잡는 데 도움이 되었습니다. 추천합니다!',
    rating: 5,
  },
  {
    id: 'testimonial-3',
    name: '박준호',
    role: '대학생',
    content: '저렴한 가격에 전문적인 사주 분석을 받을 수 있어서 좋아요. 친구들에게도 추천했습니다.',
    rating: 4,
  },
];

export const FAQS: FAQ[] = [
  {
    id: 'faq-1',
    question: '무료 체험은 어떻게 받나요?',
    answer: 'Google 계정으로 회원가입하시면 자동으로 3회 무료 분석 횟수가 제공됩니다. 별도 신청 없이 바로 이용하실 수 있어요.',
  },
  {
    id: 'faq-2',
    question: 'Pro 구독은 언제든 해지할 수 있나요?',
    answer: '네, 언제든 해지 가능합니다. 해지하셔도 다음 결제일까지는 Pro 혜택이 유지되며, 결제일 이후 자동으로 무료 회원으로 전환됩니다.',
  },
  {
    id: 'faq-3',
    question: '분석 결과는 얼마나 정확한가요?',
    answer: 'Google Gemini AI가 전통 사주팔자 이론을 기반으로 분석합니다. 무료 회원은 gemini-2.0-flash, Pro 회원은 gemini-2.0-pro 모델을 사용해 더욱 정확한 분석을 제공합니다.',
  },
  {
    id: 'faq-4',
    question: '출생시간을 모르는 경우에도 분석 가능한가요?',
    answer: '네, 출생시간은 선택사항입니다. 시간을 모르셔도 생년월일과 성별만으로 기본 분석이 가능합니다. 단, 시간을 입력하시면 더욱 정확한 분석을 받으실 수 있습니다.',
  },
  {
    id: 'faq-5',
    question: '환불 정책은 어떻게 되나요?',
    answer: 'Pro 구독 후 7일 이내에 분석을 사용하지 않으신 경우 전액 환불 가능합니다. 자세한 내용은 이용약관을 참조해주세요.',
  },
];

export const STATS: Stat[] = [
  {
    id: 'total-analyses',
    label: '총 분석 횟수',
    value: '10,000',
    suffix: '+',
  },
  {
    id: 'active-users',
    label: '활성 사용자',
    value: '2,500',
    suffix: '+',
  },
  {
    id: 'satisfaction',
    label: '만족도',
    value: '4.8',
    suffix: '/5.0',
  },
];
