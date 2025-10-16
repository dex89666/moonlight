import { describe, it, expect } from 'vitest'
import compatHandler from '../../api/compat'
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

describe('API compat freemium', () => {
  it('compat returns brief for free user and full for pro', async () => {
  const req1 = makeReq({ birthDate1: '01.01.1990', birthDate2: '02.02.1992', userId: 'c-free' })
    const res1 = makeRes()
    await compatHandler(req1, res1)
    const out1 = res1._get()
    expect(out1.status).toBe(200)
    expect(out1.body.brief).toBe(true)
    expect(out1.body.isPro).toBe(false)

    setPro('c-pro')
  const req2 = makeReq({ birthDate1: '01.01.1990', birthDate2: '02.02.1992', userId: 'c-pro' })
    const res2 = makeRes()
    await compatHandler(req2, res2)
    const out2 = res2._get()
    expect(out2.status).toBe(200)
    expect(out2.body.brief).toBe(false)
    expect(out2.body.isPro).toBe(true)
  })
})
