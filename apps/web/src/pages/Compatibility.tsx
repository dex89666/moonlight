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

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      setIsTg(true);
      tg.ready();
    }
  }, []);

  const showDatePicker = (index: 1 | 2) => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.showDatePicker({
      title_text: index === 1 ? "Ваша дата" : "Дата партнера",
      min_date: new Date('1900-01-01'),
      max_date: new Date()
    }, (selectedDate: any) => {
      if (selectedDate) {
        const str = formatDate(new Date(selectedDate));
        if (index === 1) setD1(str);
        else setD2(str);
      }
    });
  };

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
          {isTg ? (
            <Button type="button" onClick={() => showDatePicker(1)} style={{background: '#333'}}>
              {d1 || 'Выбрать дату 📅'}
            </Button>
          ) : (
             <input type="date" className="input" onChange={(e) => e.target.valueAsDate && setD1(formatDate(e.target.valueAsDate))} />
          )}
        </div>

        {/* Дата 2 */}
        <div>
          <div style={{color: '#888', marginBottom: '5px', fontSize: '14px'}}>Дата партнера:</div>
          {isTg ? (
            <Button type="button" onClick={() => showDatePicker(2)} style={{background: '#333'}}>
              {d2 || 'Выбрать дату 📅'}
            </Button>
          ) : (
             <input type="date" className="input" onChange={(e) => e.target.valueAsDate && setD2(formatDate(e.target.valueAsDate))} />
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