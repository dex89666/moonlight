import { describe, it, expect } from 'vitest'
import matrixHandler from '../../api/matrix'
import tarotHandler from '../../api/tarot'
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

describe('API integration freemium', () => {
  it('matrix returns brief for free user and full for pro', async () => {
    const req1 = makeReq({ birthDate: '01.01.1990', userId: 'u-free' })
    const res1 = makeRes()
    await matrixHandler(req1, res1)
    const out1 = res1._get()
    expect(out1.status).toBe(200)
    expect(out1.body.brief).toBe(true)
    expect(out1.body.isPro).toBe(false)

    // set user as pro
    setPro('u-pro')
    const req2 = makeReq({ birthDate: '01.01.1990', userId: 'u-pro' })
    const res2 = makeRes()
    await matrixHandler(req2, res2)
    const out2 = res2._get()
    expect(out2.status).toBe(200)
    expect(out2.body.brief).toBe(false)
    expect(out2.body.isPro).toBe(true)
  })

  it('tarot returns brief for free user and full for pro', async () => {
    const req1 = makeReq({ userId: 't-free' })
    const res1 = makeRes()
    await tarotHandler(req1, res1)
    const out1 = res1._get()
    expect(out1.status).toBe(200)
    expect(out1.body.brief).toBe(true)
    expect(out1.body.isPro).toBe(false)

    // pro
    setPro('t-pro')
    const req2 = makeReq({ userId: 't-pro' })
    const res2 = makeRes()
    await tarotHandler(req2, res2)
    const out2 = res2._get()
    expect(out2.status).toBe(200)
    expect(out2.body.brief).toBe(false)
    expect(out2.body.isPro).toBe(true)
  })
})
