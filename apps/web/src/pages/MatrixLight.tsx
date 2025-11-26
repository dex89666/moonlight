import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI'
import { fetchApi } from '../lib/fetchApi'
import { ApiAnalysisResponse } from '../api/client'
import ProCTA from '../components/ProCTA'
import ReactMarkdown from 'react-markdown'

// Хелперы
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}
function formatToInput(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}
function formatFromInput(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

export default function MatrixLight() {
  const [d, setD] = useState('');
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [hasTgPicker, setHasTgPicker] = useState(false);

  useEffect(() => {
    // Проверка старта
    console.log('MatrixLight mounted');
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTg(true);
      setHasTgPicker(typeof tg.showDatePicker === 'function');
      try { tg.ready(); } catch {}
      try { tg.expand(); } catch {}
    }

    // restore last saved date if any
    try {
      const saved = localStorage.getItem('birthDate')
      if (saved) setD(saved)
    } catch (e) {}
  }, []);

  const showDatePicker = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.showDatePicker === 'function') {
      try {
        // support both callback and promise-style implementations
        const maybePromise = tg.showDatePicker({ title_text: 'Выберите дату', max_date: new Date() }, (selectedDate: any) => {
          // callback-style
          if (selectedDate) setD(formatDate(normalizePickedDate(selectedDate)));
        });

        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then((selectedDate: any) => {
            if (selectedDate) setD(formatDate(normalizePickedDate(selectedDate)));
          }).catch((err: any) => console.warn('Date picker promise rejected', err));
        }
      } catch (e: any) {
        console.error('Calendar open failed', e);
      }
    } else {
      // no tg picker available — fall back to native input by focusing it
      const el = document.getElementById('matrix-native-date') as HTMLInputElement | null;
      if (el) el.showPicker ? el.showPicker() : el.focus();
    }
  };

  // Normalizes various picker return shapes into a Date instance
  function normalizePickedDate(selected: any): Date {
    if (!selected) return new Date();
    // some implementations return timestamp number
    if (typeof selected === 'number') return new Date(selected);
    // some return ISO string
    if (typeof selected === 'string') return new Date(selected);
    // callback-style may send an object with 'date' or 'selected_date' fields
    if (selected.date) return new Date(selected.date);
    if (selected.value) return new Date(selected.value);
    // if it's already a Date
    if (selected instanceof Date) return selected;
    // fallback
    return new Date(selected);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  console.log('submit', d);
    
    if (!d) {
        alert('ERROR: Дата пустая');
        return;
    }

    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'guest';

  // persist chosen date so it is associated with subscription later
  try { localStorage.setItem('birthDate', d) } catch (e) {}

  const data = await fetchApi<ApiAnalysisResponse>('/api/matrix', { birthDate: d, userId });
      setRes(data as ApiAnalysisResponse);
    } catch (e: any) {
      console.error('API error', e);
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Матрица</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {isTg && hasTgPicker ? (
          <Button type="button" onClick={showDatePicker} variant="primary" style={{ background: 'linear-gradient(90deg,#b77df2,#74e2d9)', color: '#111', padding: '10px 14px' }}>
            {d || 'Выбрать дату'}
          </Button>
        ) : (
          <input id="matrix-native-date" type="date" className="input" value={formatToInput(d)} onChange={(e) => setD(formatFromInput(e.target.value))} />
        )}

        <Button type="submit" disabled={!d || isLoading} variant="primary" style={{ border: '2px solid red' }}>
          {isLoading ? 'Думаю...' : 'Рассчитать'}
        </Button>
      </form>

      {err && <p className="error" style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{err}</p>}

      {res && (
        <div className="card">
          <h3>Успех!</h3>
          <div style={{ marginTop: '10px' }}>
            <ReactMarkdown>{res.analysis}</ReactMarkdown>
          </div>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
  <Button type="button" variant="outline" onClick={async () => {
          // clear saved date both locally and on server if user is known
          try { localStorage.removeItem('birthDate'); setD('') } catch (e) {}
          const tg = (window as any).Telegram?.WebApp;
          const userId = tg?.initDataUnsafe?.user?.id?.toString();
          if (userId) {
            await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action: 'clearDate' }) })
          }
        }}>Очистить сохранённую дату</Button>
      </div>
    </Section>
  );
}