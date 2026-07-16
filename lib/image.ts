// 브라우저(클라이언트) 전용 이미지 헬퍼.

/** data URL을 캔버스로 max 픽셀 이하로 리사이즈한 JPEG data URL 반환(전송 페이로드·속도 ↓). */
export function resizeImage(dataUrl: string, max: number, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement("canvas")
      c.width = Math.max(1, Math.round(img.width * scale))
      c.height = Math.max(1, Math.round(img.height * scale))
      const ctx = c.getContext("2d")
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL("image/jpeg", quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** File → data URL. */
export const readFile = (f: File): Promise<string> =>
  new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(f)
  })

/** Blob → data URL. */
export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(blob)
  })
