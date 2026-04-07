/**
 * Firebase Admin SDK 싱글톤.
 *
 * 환경변수:
 *  - FIREBASE_PROJECT_ID
 *  - FIREBASE_CLIENT_EMAIL
 *  - FIREBASE_PRIVATE_KEY  (PEM, \n 은 literal 백슬래시-n 으로 저장)
 *
 * 호출 시점에 lazy 초기화 — 빌드 타임에 env 가 없어도 import 자체는 안전.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

let cachedApp: App | null = null
let cachedDb: Firestore | null = null

function getApp(): App {
  if (cachedApp) return cachedApp

  const existing = getApps()
  if (existing.length > 0) {
    cachedApp = existing[0]!
    return cachedApp
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK 환경변수 누락: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 모두 필요합니다.",
    )
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
  return cachedApp
}

export function getDb(): Firestore {
  if (cachedDb) return cachedDb
  cachedDb = getFirestore(getApp())
  return cachedDb
}
