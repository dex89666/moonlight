import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import ProCTA from '../components/ProCTA';
import { ApiAnalysisResponse } from '../api/client';

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export default function Compatibility() {
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTg, setIsTg] = useState(false);
  const [hasTgPicker, setHasTgPicker] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      setIsTg(true);
      try { setHasTgPicker(typeof tg.showDatePicker === 'function'); } catch {}
      try { tg.ready(); } catch {}
    }
  }, []);

  const showDatePicker = (index: 1 | 2) => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.showDatePicker) {
      // fallback to native input
      const id = index === 1 ? 'compat-native-1' : 'compat-native-2';
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.showPicker ? el.showPicker() : el.focus();
      return;
    }

    try {
      const maybePromise = tg.showDatePicker({
        title_text: index === 1 ? 'Ваша дата' : 'Дата партнера',
        min_date: new Date('1900-01-01'),
        max_date: new Date()
      }, (selectedDate: any) => {
        if (selectedDate) {
          const str = formatDate(normalizePickedDate(selectedDate));
          if (index === 1) setD1(str);
          else setD2(str);
        }
      });

      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then((selectedDate: any) => {
          if (selectedDate) {
            const str = formatDate(normalizePickedDate(selectedDate));
            if (index === 1) setD1(str);
            else setD2(str);
          }
        }).catch((err: any) => console.warn('Date picker promise rejected', err));
      }
    } catch (e) {
      console.error('showDatePicker failed', e);
    }
  };

  function normalizePickedDate(selected: any): Date {
    if (!selected) return new Date();
    if (typeof selected === 'number') return new Date(selected);
    if (typeof selected === 'string') return new Date(selected);
    if (selected.date) return new Date(selected.date);
    if (selected.value) return new Date(selected.value);
    if (selected instanceof Date) return selected;
    return new Date(selected);
  }

  const handleSubmit = async () => {
    if (!d1 || !d2) return;
    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      const userId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'guest';
      
      const data = await fetchApi<ApiAnalysisResponse>('/api/compat', {
        birthDate1: d1,
        birthDate2: d2,
        userId
      });
      setRes(data);
    } catch (e: any) {
      setErr(e.message || 'Ошибка сервера');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Совместимость</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Дата 1 */}
        <div>
          <div style={{color: '#888', marginBottom: '5px', fontSize: '14px'}}>Ваша дата:</div>
          {isTg && hasTgPicker ? (
            <Button type="button" onClick={() => showDatePicker(1)} style={{background: '#333'}}>
              {d1 || 'Выбрать дату 📅'}
            </Button>
          ) : (
             <input id="compat-native-1" type="date" className="input" onChange={(e) => e.target.value && setD1(formatDate(new Date(e.target.value)))} />
          )}
        </div>

        {/* Дата 2 */}
        <div>
          <div style={{color: '#888', marginBottom: '5px', fontSize: '14px'}}>Дата партнера:</div>
          {isTg && hasTgPicker ? (
            <Button type="button" onClick={() => showDatePicker(2)} style={{background: '#333'}}>
              {d2 || 'Выбрать дату 📅'}
            </Button>
          ) : (
             <input id="compat-native-2" type="date" className="input" onChange={(e) => e.target.value && setD2(formatDate(new Date(e.target.value)))} />
          )}
        </div>

        {/* Кнопка Расчета */}
        <Button onClick={handleSubmit} disabled={!d1 || !d2 || isLoading} variant="primary">
          {isLoading ? 'Считаем...' : 'Рассчитать'}
        </Button>
      </div>

      {err && <p className="error" style={{ marginTop: '10px' }}>{err}</p>}

      {res && (
        <div className="card" style={{ marginTop: '20px' }}>
          <ReactMarkdown>{res.analysis}</ReactMarkdown>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}