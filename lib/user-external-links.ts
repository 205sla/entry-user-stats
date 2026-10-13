interface UserIdentity {
  id: string
  nickname: string
}

interface NamuWikiUser {
  entryUserId: string
  /** 명단 관리용 이름. 링크 표시 여부는 닉네임이 아닌 유저 ID로 결정한다. */
  nickname: string
  url: string
}

/** 사용자가 지정한 나무위키 명단. 새 유저는 확인된 엔트리 ID와 문서 URL을 추가한다. */
export const NAMU_WIKI_USERS: readonly NamuWikiUser[] = [
  {
    entryUserId: "56136825dadc91e1235b460d",
    nickname: "205님",
    url: "https://namu.wiki/w/%EC%9D%B4%EC%98%81%ED%98%B8(2003)",
  },
]

/** 문서 존재 여부를 조회하지 않고 외부 링크만 만든다. */
export function getUserExternalLinks(user: UserIdentity) {
  const links = [
    {
      label: "마이페이지 바로가기",
      href: `https://playentry.org/profile/${encodeURIComponent(user.id)}`,
    },
    {
      label: "엔트리유저위키에서 보기",
      href: `https://entrywiki.org/w/${encodeURIComponent(user.nickname)}`,
    },
  ]

  const namuWikiUser = NAMU_WIKI_USERS.find(entry => entry.entryUserId === user.id)
  if (namuWikiUser) {
    links.push({ label: "나무위키에서 보기", href: namuWikiUser.url })
  }

  return links
}
