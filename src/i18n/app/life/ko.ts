import type { LifeDict } from './es'

const ko: LifeDict = {
  common: {
    cancel: '취소', confirm: '확인', save: '저장', saving: '저장 중…', edit: '편집', delete: '삭제',
    close: '닫기', search: '검색', saveError: '저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', saved: '저장됨',
  },
  nav: { life: '홈', money: '돈', goals: '목표', habits: '습관', brain: 'Brain', settings: '설정' },
  capture: { open: '빠른 기록', close: '닫기', idea: '아이디어', note: '메모', task: '할 일', goal: '목표', transaction: '거래' },
  home: {
    greetMorning: '좋은 아침이에요', greetAfternoon: '좋은 오후예요', greetEvening: '좋은 저녁이에요',
    myBusiness: '내 비즈니스', identityTitle: '내 아이덴티티', identitySubtitle: '나의 디지털 아이덴티티를 한곳에',
    openStudio: 'Studio 열기', viewProfile: '프로필 보기', today: '오늘',
    goalsValue: n => `${n}개 진행 중`, habitsValue: (d, t) => `오늘 ${d}/${t}`, tasksValue: n => `${n}개 남음`,
    recap: '✦ 이번 달 돌아보기', settings: '설정', language: '언어',
  },
  settings: {
    title: '설정', subtitle: '계정의 언어, 통화, 지역.',
    language: '언어', languageHelp: 'Life OS, Studio, 프로필에서 사용됩니다.',
    currency: '기본 통화', currencyHelp: '돈 합계가 이 통화로 표시됩니다.',
    extraCurrencies: '다른 통화',
    extraHelp: '다른 통화로 거래를 기록할 때 사용합니다(최대 5개). 통화별로 따로 합산하며 금액을 환산하지 않습니다.',
    addCurrency: '통화 추가', removeCurrency: c => `${c} 제거`, searchCurrency: '통화 검색…',
    timezone: '시간대', timezoneHelp: '하루가 언제 시작되고 끝나는지 정합니다.',
    weekStart: '한 주의 시작', monday: '월요일', sunday: '일요일',
    account: '계정', openStudio: 'Mycen Studio 열기', signOut: '로그아웃', savedOk: '설정이 저장되었습니다', noResults: '결과 없음',
  },
  money: {
    title: '돈', add: '새 거래', balance: m => `${m} 잔액`, otherCurrencies: '이번 달 다른 통화',
    income: '수입', expense: '지출', today: '오늘', yesterday: '어제', net: '순액',
    emptyTitle: '내 돈의 흐름을 한눈에', emptyText: '수입과 지출을 기록하고 돈이 어디로 가는지 확인하세요.',
    emptyAction: '첫 거래 추가', options: '옵션', deleteTitle: '거래를 삭제할까요?',
    deleteText: (k, a, c) => `${c} ${k} ${a}`, incomeOne: '수입', expenseOne: '지출',
  },
  tx: {
    newTitle: '새 거래', editTitle: '거래 편집', income: '수입', expense: '지출', amount: '금액',
    currency: '통화', category: '카테고리', description: '설명(선택)', descriptionPlaceholder: '어디에 썼나요?',
    date: '날짜', invalidAmount: '올바른 금액을 입력하세요', create: '거래 기록', update: '변경 사항 저장',
  },
  categories: {
    Sueldo: '급여', Freelance: '프리랜스', Comisiones: '수수료', Ventas: '판매', Inversiones: '투자',
    Vivienda: '주거', Transporte: '교통', Comida: '식비', Ocio: '여가', Salud: '건강',
    Suscripciones: '구독', Ropa: '의류', Otros: '기타',
  },
}
export default ko
