import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';

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
  }, []);

  const showDatePicker = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.showDatePicker === 'function') {
      try {
        tg.showDatePicker({ title_text: 'Выберите дату', max_date: new Date() }, (selectedDate: any) => {
          if (selectedDate) setD(formatDate(new Date(selectedDate)));
        });
      } catch (e: any) {
        console.error('Calendar open failed', e);
      }
    } else {
      // no tg picker available — fall back to native input by focusing it
      const el = document.getElementById('matrix-native-date') as HTMLInputElement | null;
      if (el) el.showPicker ? el.showPicker() : el.focus();
    }
  };

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
      <h2>Матрица (DEBUG MODE)</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {isTg && hasTgPicker ? (
          <Button type="button" onClick={showDatePicker} style={{ border: '2px solid yellow' }}>
            {d || '🔍 ТЕСТ КАЛЕНДАРЯ'}
          </Button>
        ) : (
          <input id="matrix-native-date" type="date" className="input" value={formatToInput(d)} onChange={(e) => setD(formatFromInput(e.target.value))} />
        )}

        <Button type="submit" disabled={!d || isLoading} variant="primary" style={{ border: '2px solid red' }}>
          {isLoading ? 'Думаю...' : '🚀 ТЕСТ ЗАПРОСА'}
        </Button>
      </form>

      {err && <p className="error" style={{ color: 'red', border: '1px solid red', padding: '10px' }}>{err}</p>}

      {res && (
        <div className="card">
          <h3>Успех!</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{JSON.stringify(res, null, 2)}</pre>
        </div>
      )}
    </Section>
  );
}