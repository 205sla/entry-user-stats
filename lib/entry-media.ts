export interface EntryPicture {
  filename: string
  imageType: string
}

const SAFE_IMAGE_TYPES = new Set(["avif", "gif", "jpeg", "jpg", "png", "webp"])

/** 엔트리 Picture 객체를 공개 업로드 이미지 URL로 변환한다. */
export function entryPictureUrl(
  picture: EntryPicture | null | undefined,
): string | null {
  if (!picture) return null

  const filename = picture.filename?.trim()
  const imageType = picture.imageType?.trim().toLowerCase()

  if (
    !filename ||
    !/^[a-z0-9_-]{4,}$/i.test(filename) ||
    !SAFE_IMAGE_TYPES.has(imageType)
  ) {
    return null
  }

  return `https://playentry.org/uploads/${filename.slice(0, 2)}/${filename.slice(2, 4)}/${filename}.${imageType}`
}
