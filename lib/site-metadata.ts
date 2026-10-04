import type { Metadata } from "next"
import { SITE_ORIGIN } from "./share-url"

export const SITE_NAME = "엔트리 유저찾기"
export const SITE_TITLE = `${SITE_NAME} | 닉네임 검색·작품 통계·랭킹`
export const SITE_DESCRIPTION =
  "엔트리 닉네임이나 프로필 링크로 유저를 찾고 공개 작품 통계를 확인하세요. 조회수·좋아요·팔로워·팔로잉 등 10개 부문 랭킹을 제공합니다."

/** 검색 결과와 공유 미리보기가 같은 페이지를 가리키도록 함께 설정한다. */
export function publicPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      locale: "ko_KR",
      url: new URL(path, SITE_ORIGIN).href,
    },
    twitter: { card: "summary", title, description },
  }
}
