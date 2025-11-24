console.log('✅ [LOG] Файл core/guard.ts загружен');

// ⭐️ ВАЖНО: Список должен быть на АНГЛИЙСКОМ, так как мы переводим в zodiac.ts
export const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

export function isValidSign(sign: string): boolean {
  // Проверяем, есть ли знак в списке
  return ZODIAC_SIGNS.includes(sign.toLowerCase());
}

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