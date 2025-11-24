import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';

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

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    // Проверяем, есть ли initData (это значит, что мы точно в Telegram)
    if (tg && tg.initData) {
      setIsTg(true);
      tg.ready();
      tg.expand();
    }
  }, []);

  const showDatePicker = () => {
    // 1. ОТЛАДКА: Проверяем, нажалась ли кнопка
    alert('Кнопка нажата! Ищем Telegram...');

    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      alert('ОШИБКА: Объект Telegram WebApp не найден!');
      return;
    }

    alert('Telegram найден. Запускаем календарь...');

    // 2. ОТЛАДКА: Вызываем календарь
    try {
        tg.showDatePicker({
          title_text: "Дата рождения"
        }, (selectedDate: any) => {
          // 3. ОТЛАДКА: Проверяем, вернул ли календарь дату
          if (selectedDate) {
            alert(`Дата выбрана: ${selectedDate}`);
            setD(formatDate(new Date(selectedDate)));
          } else {
            alert('Дата не выбрана (отмена)');
          }
        });
    } catch (e: any) {
        alert(`КРИТИЧЕСКАЯ ОШИБКА: ${e.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'guest';
      const data = await fetchApi<ApiAnalysisResponse>('/api/matrix', { birthDate: d, userId });
      setRes(data);
    } catch (e: any) {
      setErr(e.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Матрица Судьбы</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Если мы в Telegram - показываем кнопку Debug, иначе input */}
        {isTg ? (
          <Button type="button" onClick={showDatePicker} style={{ border: '2px solid yellow' }}>
            {d || '📅 НАЖМИ МЕНЯ (DEBUG)'}
          </Button>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <span style={{fontSize: '12px', color: '#888'}}>Режим браузера (Telegram не найден):</span>
            <input type="date" className="input" value={formatToInput(d)} onChange={e => setD(formatFromInput(e.target.value))} />
          </div>
        )}

        <Button type="submit" disabled={!d || isLoading} variant="primary">
          {isLoading ? 'Расчет...' : 'Начать анализ'}
        </Button>
      </form>

      {err && <p className="error">{err}</p>}

      {res && (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{res.analysis}</pre>
        </div>
      )}
    </Section>
  );
}