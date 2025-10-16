import { describe, it, expect } from 'vitest'
import zodiacHandler from '../../api/zodiac'
import { setPro } from '../../data/store'

function makeReq(body: any) {
  return {
    method: 'POST',
    body,
  } as any
}

function makeRes() {
  let status = 200
  let body: any = null
  return {
    status(code: number) { status = code; return this },
    json(obj: any) { body = obj; return this },
    send(s: any) { body = s; return this },
    _get() { return { status, body } }
  } as any
}

describe('API zodiac freemium', () => {
  it('zodiac returns brief for free user and full for pro', async () => {
  const req1 = makeReq({ sign: 'овен', userId: 'z-free' })
    const res1 = makeRes()
    await zodiacHandler(req1, res1)
    const out1 = res1._get()
    expect(out1.status).toBe(200)
    expect(out1.body.brief).toBe(true)
    expect(out1.body.isPro).toBe(false)

    setPro('z-pro')
  const req2 = makeReq({ sign: 'овен', userId: 'z-pro' })
    const res2 = makeRes()
    await zodiacHandler(req2, res2)
    const out2 = res2._get()
    expect(out2.status).toBe(200)
    expect(out2.body.brief).toBe(false)
    expect(out2.body.isPro).toBe(true)
  })
})
