export type TarotCard = { name: string; meaning: string }

export const MAJOR_ARCANA: TarotCard[] = [
  { name: 'Шут', meaning: 'новый путь, спонтанность' },
  { name: 'Маг', meaning: 'воля, ресурсность' },
  { name: 'Верховная Жрица', meaning: 'интуиция, тайна' },
  { name: 'Императрица', meaning: 'рост, забота' },
  { name: 'Император', meaning: 'структура, власть' },
  { name: 'Иерофант', meaning: 'традиции, обучение' },
  { name: 'Влюблённые', meaning: 'выбор, отношения' },
  { name: 'Колесница', meaning: 'движение, победа' },
  { name: 'Справедливость', meaning: 'равновесие, честность' },
  { name: 'Отшельник', meaning: 'поиск, уединение' },
  { name: 'Колесо Фортуны', meaning: 'циклы, удача' },
  { name: 'Сила', meaning: 'мужество, сострадание' },
]

export function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function draw3(rnd = Math.random) {
  const s = shuffle(MAJOR_ARCANA, rnd)
  return s.slice(0, 3).map((c) => ({ ...c, reversed: rnd() < 0.5 }))
}
