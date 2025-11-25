// Pre-generated canned responses for offline mode.
function make(n:number, prefix:string){
  const arr = [] as string[];
  for(let i=1;i<=n;i++) arr.push(`${prefix} — готовый ответ #${i}. Коротко, ясно и по делу.`);
  return arr;
}

export const MATRIX_RESPONSES = make(100, 'Матрица. Прогноз');
export const COMPAT_RESPONSES = make(100, 'Совместимость. Оценка');
export const TAROT_RESPONSES = make(100, 'Таро. Карта');
export const ZODIAC_RESPONSES = make(100, 'Зодиак. Гороскоп');

export function pickDeterministic(key:string, arr:string[]){
  // simple hash
  let h=0; for(let i=0;i<key.length;i++){ h = ((h<<5)-h) + key.charCodeAt(i); h |= 0; }
  const idx = Math.abs(h) % arr.length;
  return arr[idx];
}

export function pickRandom(arr:string[]){
  return arr[Math.floor(Math.random()*arr.length)];
}
