console.log('✅ [LOG] Файл core/guard.ts начал загружаться...');
export function isValidDateStr(d: string): boolean {
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return false
  const day = parseInt(m[1], 10), mon = parseInt(m[2], 10) - 1, y = parseInt(m[3], 10)
  const dt = new Date(y, mon, day)
  return dt.getFullYear() === y && dt.getMonth() === mon && dt.getDate() === day
}

export function isAllowedTopic(t: string): boolean {
  return ['matrix', 'compat', 'tarot', 'zodiac'].includes(t)
}

export function isValidSign(s: string): boolean {
  const set = new Set(['овен','телец','близнецы','рак','лев','дева','весы','скорпион','стрелец','козерог','водолей','рыбы'])
  return set.has(s)
}
