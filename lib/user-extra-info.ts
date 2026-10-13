export interface UserExtraLink {
  label: string
  href: string
}

export interface UserExtraDetail {
  label: string
  value: string
}

export interface UserExtraInfo {
  /** 명단 관리용 이름. 표시 대상은 닉네임이 아닌 아래 목록의 유저 ID로 결정한다. */
  nickname: string
  /** 나무위키, 유튜브, 개인 사이트 등 사용자가 지정한 외부 링크. */
  links?: readonly UserExtraLink[]
  /** 사용자가 전달한 소개·활동 등 항목명과 내용. 내용은 일반 텍스트로 표시한다. */
  details?: readonly UserExtraDetail[]
}

/** 추가 정보가 있는 유저만 등록한다. Firestore에는 빈 필드나 문서를 만들지 않는다. */
export const USER_EXTRA_INFO: Readonly<Record<string, UserExtraInfo>> = {
  "56136825dadc91e1235b460d": {
    nickname: "205님",
    links: [
      {
        label: "나무위키에서 보기",
        href: "https://namu.wiki/w/%EC%9D%B4%EC%98%81%ED%98%B8(2003)",
      },
    ],
  },
  "534cd3c32d3ee756348975f8": {
    nickname: "thdtkdtn",
    links: [
      {
        label: "관련 블로그 글 보기",
        href: "https://blog.naver.com/gi_sik_in/221372350283",
      },
    ],
  },
}

export function getUserExtraInfo(userId: string): UserExtraInfo | undefined {
  return Object.hasOwn(USER_EXTRA_INFO, userId) ? USER_EXTRA_INFO[userId] : undefined
}
