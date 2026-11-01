import type { UiStrings } from '../profileI18n'

// Textos de la página pública en ko (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: '영업 중', closedNow: '영업 종료', share: '공유', linkCopied: '링크가 복사되었습니다',
    saveContact: '연락처 저장', contact: '연락처', location: '위치', howToGet: '길찾기',
    hours: '영업시간', closed: '휴무', gallery: '갤러리', reviews: '리뷰', seeOnGoogle: 'Google에서 보기',
    reviewsCount: '개의 리뷰',
    notFoundTitle: '존재하지 않는 프로필입니다', notFoundText: '링크를 확인하거나 Mycen에서 나만의 프로필을 만들어 보세요.',
    unavailableTitle: '이 프로필은 현재 이용할 수 없습니다', unavailableText: '소유자가 아직 공개하지 않았거나 잠시 중단했습니다.',
    errorTitle: '프로필을 불러오지 못했습니다', errorText: '연결 상태를 확인하고 다시 시도해 주세요.',
    retry: '다시 시도', createYours: '나의 Mycen 만들기', draftBanner: '미리보기: 이 프로필은 아직 공개되지 않았습니다.',
    footer: 'Mycen 아이덴티티',
    verified: '인증된 계정', available: '연락 가능', moreAboutMe: '더 알아보기', createIdentity: '나의 아이덴티티 만들기', createFree: '무료로 나의 Mycen 만들기', call: '전화', copyLink: '링크 복사', qrCode: 'QR 코드', moreOptions: '더 보기', backToTop: '맨 위로', votesCount: "{n}표", oneVote: "1표", noVotes: "아직 투표가 없어요. 첫 투표를 해 보세요", yourVote: "내 투표", download: "다운로드", copyCode: "코드 복사", codeCopied: "코드를 복사했어요", validUntil: "{date}까지 유효", useCoupon: "쿠폰 사용하기", listen: "듣기", nearest: "가장 가까운 곳 보기", nearestBusy: "현재 위치를 찾는 중…", nearestDone: "가까운 순으로 정렬했어요", nearestFail: "위치를 알 수 없어요. 위치 권한을 확인해 주세요.", nearestPrivate: "위치 정보는 휴대폰 밖으로 나가지 않아요.", pause: "일시정지", videos: "동영상", podcast: "팟캐스트", episodes: "에피소드", emailLabel: '이메일', playOn: '{provider}에서 재생',
    days: { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토', sunday: '일' },
    languageLabel: '언어', socials: '소셜 미디어', close: '닫기', prevPhoto: '이전 사진', nextPhoto: '다음 사진', cards: '카드',
    swipeHint: '밀어서 더 보기', tickets: '티켓', tags: '카테고리',
    projects: "프로젝트", viewProject: "프로젝트 보기", credits: "크레딧", backToProfile: "프로필로 돌아가기", projectNotFoundTitle: "존재하지 않는 프로젝트입니다", projectNotFoundText: "링크를 확인하거나 전체 프로필을 보세요.", projectUnavailableTitle: "이 프로젝트는 볼 수 없습니다", projectUnavailableText: "소유자가 아직 게시하지 않았거나 게시를 취소했습니다.", projectDraftBanner: "미리보기: 이 프로젝트는 아직 공개되지 않았습니다.", video: "동영상",
    links: '링크',
    report: '신고', reportTitle: '이 프로필 신고', reportProjectTitle: '이 프로젝트 신고', reportIntro: '무엇이 문제인지 알려 주세요. Mycen 팀이 검토하며, 소유자는 신고자를 알 수 없습니다.', reportReason: '사유', reportDetails: '상세 내용(선택)', reportSend: '신고 보내기', reportSending: '보내는 중…', reportThanks: '감사합니다. 신고가 접수되었으며 검토하겠습니다.', reportDuplicate: '이 프로필에 대한 신고가 이미 접수되어 검토 중입니다.', reportLimit: '오늘 신고를 너무 많이 보냈습니다. 내일 다시 시도하세요.', reportError: '신고를 보내지 못했습니다. 연결을 확인하고 다시 시도하세요.', cancel: '취소', rules: '콘텐츠 규칙',
    reportReasons: { spam: '스팸 또는 오해의 소지가 있는 광고', scam: '사기', impersonation: '다른 사람이나 브랜드를 사칭함', hate: '혐오 또는 괴롭힘', violence: '폭력 또는 위협', sexual: '성적인 콘텐츠', illegal: '불법적인 내용', other: '기타' },
}

export default ui
