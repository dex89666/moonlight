console.log('✅ [LOG] Файл core/numerology.ts начал загружаться...');
export function digits(dateStr: string): number[] {
  const m = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) throw new Error('Неверный формат даты, используйте dd.mm.yyyy')
  return [...m[1], ...m[2], ...m[3]].map((c) => parseInt(c, 10))
}

export function sumDigits(arr: number[] | string): number {
  const nums = typeof arr === 'string' ? arr.split('').map((c) => parseInt(c, 10)) : arr
  return nums.reduce((a, b) => a + (Number.isFinite(b) ? (b as number) : 0), 0)
}

export function reduceToOne(n: number): number {
  let x = Math.abs(n)
  while (x > 9) {
    x = sumDigits(String(x))
  }
  return x
}

export function pathNumber(dateStr: string): number {
  return reduceToOne(sumDigits(digits(dateStr)))
}

export function summaryForPath(n: number): { summary: string; traits: string[] } {
  const map: Record<number, { summary: string; traits: string[] }> = {
    1: { summary: 'Инициатива и самостоятельность', traits: ['лидерство', 'воля', 'энергия'] },
    2: { summary: 'Дипломатия и баланс', traits: ['партнёрство', 'интуиция'] },
    3: { summary: 'Творчество и общение', traits: ['яркость', 'идеи'] },
    4: { summary: 'Структура и стабильность', traits: ['надёжность', 'трудолюбие'] },
    5: { summary: 'Свобода и перемены', traits: ['гибкость', 'путешествия'] },
    6: { summary: 'Забота и гармония', traits: ['семья', 'красота'] },
    7: { summary: 'Анализ и поиск смысла', traits: ['инсайт', 'учёба'] },
    8: { summary: 'Амбиции и результат', traits: ['цели', 'управление'] },
    9: { summary: 'Служение и завершение', traits: ['эмпатия', 'мудрость'] },
  }
  return map[n] ?? { summary: 'Нейтральный период', traits: [] }
}
