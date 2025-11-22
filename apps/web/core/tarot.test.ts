import { describe, it, expect } from 'vitest'
import { draw3, MAJOR_ARCANA } from './tarot'

describe('tarot', () => {
  it('draw3 returns three cards', () => {
    const r = draw3(() => 0.42)
    expect(r).toHaveLength(3)
    expect(MAJOR_ARCANA.length).toBeGreaterThan(9)
  })
})
