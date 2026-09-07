/**
 * Google Cloud Firestore 서버 SDK 싱글톤.
 *
 * 환경변수:
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY  (PEM, \n 은 literal 백슬래시-n 으로 저장)
 *
 * 앱에서 쓰지 않는 Auth/Storage까지 포함하는 Admin 묶음 대신 Firestore 전용 SDK를
 * 사용한다. 호출 시점에 lazy 초기화하므로 빌드 타임에 env가 없어도 안전하다.
 */

import { Firestore } from "@google-cloud/firestore"

let cachedDb: Firestore | null = null

export function getDb(): Firestore {
  if (cachedDb) return cachedDb

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firestore 환경변수 누락: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 모두 필요합니다.",
    )
  }

  cachedDb = new Firestore({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  })
  return cachedDb
}
