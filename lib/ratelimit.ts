/**
 * 아주 가벼운 인메모리 슬라이딩 윈도우 레이트리밋.
 * 주의: 인스턴스별 상태라 다중 인스턴스에선 완벽하지 않음(기본 남용 방지용).
 * 강한 보호가 필요하면 Redis 등 공유 저장소 기반으로 교체.
 */
type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

/** key(보통 IP)에 대해 windowMs 동안 limit회 허용. 초과 시 false. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

/** 프록시(예: Cloud Run) 뒤의 클라이언트 IP 추출. */
export function clientIp(req: Request): string {
  const h = req.headers
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim()
}
