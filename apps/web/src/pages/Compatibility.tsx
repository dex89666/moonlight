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

export default function Compatibility() {
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // ⭐️ Умная проверка поддержки календаря
  const [hasNativePicker, setHasNativePicker] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    // Проверяем, есть ли функция календаря
    if (tg && tg.initData && typeof tg.showDatePicker === 'function') {
      setHasNativePicker(true);
      tg.ready();
      tg.expand();
    } else if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  const showDatePicker = (index: 1 | 2) => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.showDatePicker) return;

    try { tg.HapticFeedback.impactOccurred('light'); } catch (e) {}

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

  const handleEnergyClick = (n: number) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    alert(`Энергия совместимости: ${n}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      
      const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'guest';
      
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

  const DateField = ({ label, value, index }: { label: string, value: string, index: 1 | 2 }) => (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px', color: '#888', fontSize: '0.9rem' }}>{label}</label>
      {hasNativePicker ? (
        <Button type="button" onClick={() => showDatePicker(index)} style={{ width: '100%', justifyContent: 'flex-start' }}>
          {value || 'Выбрать дату 📅'}
        </Button>
      ) : (
        <input 
          type="date" 
          className="input" 
          value={formatToInput(value)} 
          onChange={(e) => {
             const val = formatFromInput(e.target.value);
             if (index === 1) setD1(val); else setD2(val);
          }}
          style={{ width: '100%', padding: '12px' }} 
        />
      )}
    </div>
  );

  return (
    <Section>
      <h2>Совместимость</h2>
      <form onSubmit={handleSubmit}>
        <DateField label="Ваша дата:" value={d1} index={1} />
        <DateField label="Дата партнера:" value={d2} index={2} />

        <Button type="submit" disabled={!d1 || !d2 || isLoading} style={{ marginTop: '15px', width: '100%' }}>
          {isLoading ? 'Анализ...' : 'Рассчитать совместимость'}
        </Button>
      </form>

      {err && <p className="error" style={{ marginTop: '10px' }}>{err}</p>}

      {res && (
        <div className="card" style={{ marginTop: '20px' }}>
           {res.matrixData?.energies && (
             <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
               <span>Энергии:</span>
               {res.matrixData.energies.map((n, i) => (
                 <div key={i} 
                      onClick={() => handleEnergyClick(n)}
                      style={{ 
                        width: '36px', height: '36px', 
                        background: '#444', color: '#fff', 
                        borderRadius: '50%', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}>
                   {n}
                 </div>
               ))}
             </div>
          )}
          <ReactMarkdown>{res.analysis}</ReactMarkdown>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}