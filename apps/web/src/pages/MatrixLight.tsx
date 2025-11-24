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

  useEffect(() => {
    // DEBUG 1: Проверка старта
    console.log('MatrixLight mounted');
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTg(true);
      tg.ready();
      tg.expand();
    }
  }, []);

  const showDatePicker = () => {
    // DEBUG 2: Нажатие на календарь
    alert('DEBUG: Кнопка календаря нажата');
    
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      alert('ERROR: Telegram WebApp не найден!');
      return;
    }

    try {
        alert('DEBUG: Открываю нативный календарь...');
        tg.showDatePicker({
            title_text: "Выберите дату",
            max_date: new Date()
        }, (selectedDate: any) => {
            if (selectedDate) {
                alert(`DEBUG: Дата выбрана: ${selectedDate}`);
                setD(formatDate(new Date(selectedDate)));
            } else {
                alert('DEBUG: Календарь закрыт без выбора');
            }
        });
    } catch (e: any) {
        alert(`CRASH Calendar: ${e.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('DEBUG: Нажата кнопка Рассчитать'); // Жучок 3
    
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
      
      alert(`DEBUG: Отправляем запрос на API... User: ${userId}, Date: ${d}`);

      // Прямой запрос через fetch для проверки (минуя обертку, чтобы видеть чистую ошибку)
      const response = await fetch('/api/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ birthDate: d, userId })
      });

      alert(`DEBUG: Статус ответа сервера: ${response.status}`);

      if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      alert('DEBUG: Ответ получен! JSON OK');
      setRes(data);

    } catch (e: any) {
      alert(`CRASH API: ${e.message}`);
      setErr(e.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Матрица (DEBUG MODE)</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {isTg ? (
          <Button type="button" onClick={showDatePicker} style={{ border: '2px solid yellow' }}>
            {d || '🔍 ТЕСТ КАЛЕНДАРЯ'}
          </Button>
        ) : (
          <input type="date" className="input" value={formatToInput(d)} onChange={(e) => setD(formatFromInput(e.target.value))} />
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