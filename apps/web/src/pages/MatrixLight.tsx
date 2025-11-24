import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';

// Вспомогательная функция для форматирования даты (DD.MM.YYYY)
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export default function MatrixLight() {
  const [d, setD] = useState('');
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTg, setIsTg] = useState(false);

  // Инициализация Telegram
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      setIsTg(true);
      tg.ready();
      tg.expand();
    }
  }, []);

  // Открытие календаря (Самый надежный способ)
  const showDatePicker = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // Вызываем нативный календарь
    tg.showDatePicker({
      title_text: "Выберите дату рождения",
      min_date: new Date('1900-01-01'),
      max_date: new Date()
    }, (selectedDate: any) => {
      // Callback: если дата выбрана
      if (selectedDate) {
        setD(formatDate(new Date(selectedDate)));
      }
    });
  };

  // Отправка формы
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!d) return;

    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'guest';
      
      // Отправляем запрос на сервер (как в Tarot)
      const data = await fetchApi<ApiAnalysisResponse>('/api/matrix', { 
        birthDate: d, 
        userId 
      });
      setRes(data);
    } catch (e: any) {
      console.error(e);
      setErr('Ошибка при расчете. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Матрица Судьбы</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Блок выбора даты */}
        {isTg ? (
          <Button type="button" onClick={showDatePicker} style={{ background: '#333', border: '1px solid #555' }}>
            {d ? `Выбрано: ${d}` : '📅 Выбрать дату'}
          </Button>
        ) : (
          // Фоллбэк для браузера
          <input 
            type="date" 
            className="input" 
            onChange={(e) => {
               if(e.target.valueAsDate) setD(formatDate(e.target.valueAsDate));
            }} 
          />
        )}

        {/* Кнопка расчета */}
        <Button onClick={() => handleSubmit()} disabled={!d || isLoading} variant="primary">
          {isLoading ? 'Считаем...' : 'Рассчитать матрицу'}
        </Button>
      </div>

      {/* Вывод ошибки */}
      {err && <p className="error" style={{ marginTop: '10px', color: 'red' }}>{err}</p>}

      {/* Вывод результата */}
      {res && (
        <div className="card" style={{ marginTop: '20px' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{res.analysis}</pre>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}