import { getUserExtraInfo } from "./user-extra-info"

interface UserIdentity {
  id: string
  nickname: string
}

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

  return [...links, ...(getUserExtraInfo(user.id)?.links ?? [])]
}
