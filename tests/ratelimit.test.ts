import { describe, it, expect } from "vitest"
import { clientIp, rateLimit } from "@/lib/ratelimit"

const req = (headers: Record<string, string>) => new Request("http://test/", { headers })

describe("clientIp (프록시 뒤 IP 추출)", () => {
  it("XFF는 플랫폼이 덧붙인 우측 항목만 신뢰 — 클라이언트가 앞에 붙인 스푸핑 무시", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9")
    expect(clientIp(req({ "x-forwarded-for": "a, b, 1.2.3.4" }))).toBe("1.2.3.4")
  })

  it("단일 XFF는 그대로", () => {
    expect(clientIp(req({ "x-forwarded-for": "5.5.5.5" }))).toBe("5.5.5.5")
  })

  it("XFF 없으면 x-real-ip, 둘 다 없으면 local", () => {
    expect(clientIp(req({ "x-real-ip": "7.7.7.7" }))).toBe("7.7.7.7")
    expect(clientIp(req({}))).toBe("local")
  })
})

describe("rateLimit (인메모리 슬라이딩 윈도우)", () => {
  it("limit 초과 시 false, 키가 다르면 독립 버킷", () => {
    expect(rateLimit("rl-a", 2)).toBe(true)
    expect(rateLimit("rl-a", 2)).toBe(true)
    expect(rateLimit("rl-a", 2)).toBe(false)
    expect(rateLimit("rl-b", 2)).toBe(true)
  })
})
