import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';

const LOCAL_STORAGE_KEY_BASE_1 = 'compatBirthDate1';
const LOCAL_STORAGE_KEY_BASE_2 = 'compatBirthDate2';

// ... (Тут функции formatDate, formatFromInput, formatToInput - они не меняются) ...
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0'); // Месяцы с 0
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}
function formatFromInput(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}
function formatToInput(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('.');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}


export default function Compatibility() {
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  // ⭐️ ИЗМЕНЕНО: 'res' (response) - наш единственный источник правды
  const [res, setRes] = useState<null | ApiAnalysisResponse>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [storageKey1, setStorageKey1] = useState<string | null>(null);
  const [storageKey2, setStorageKey2] = useState<string | null>(null);
  const [tg, setTg] = useState<WebApp | null>(() => {
    if (typeof window !== 'undefined' && window.Telegram) {
      return window.Telegram.WebApp;
    }
    return null;
  });

  // ... (Эффекты 1 и 2, showDatePicker, handleBrowserDateChange не меняются) ...
  useEffect(() => {
    const id = initTelegram() || 'guest';
    setStorageKey1(`${LOCAL_STORAGE_KEY_BASE_1}_${id}`);
    setStorageKey2(`${LOCAL_STORAGE_KEY_BASE_2}_${id}`);
    if (!tg && typeof window !== 'undefined' && window.Telegram) {
      const webApp = window.Telegram.WebApp;
      setTg(webApp);
      webApp.ready();
    } else if (tg) {
      tg.ready();
    }
  }, [tg]);
  useEffect(() => {
    if (storageKey1) {
      const savedDate1 = localStorage.getItem(storageKey1);
      if (savedDate1) setD1(savedDate1);
    }
    if (storageKey2) {
      const savedDate2 = localStorage.getItem(storageKey2);
      if (savedDate2) setD2(savedDate2);
    }
  }, [storageKey1, storageKey2]);
  const showDatePicker = (dateIndex: 1 | 2) => {
    if (!tg) return;
    tg.HapticFeedback.impactOccurred('light');
    tg.showDatePicker((selectedDate: Date) => {
      if (selectedDate) {
        tg.HapticFeedback.impactOccurred('medium');
        const formattedDate = formatDate(selectedDate);
        if (dateIndex === 1) {
          setD1(formattedDate);
          if (storageKey1) localStorage.setItem(storageKey1, formattedDate);
        } else {
          setD2(formattedDate);
          if (storageKey2) localStorage.setItem(storageKey2, formattedDate);
        }
      }
    });
  };
  const handleBrowserDateChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    dateIndex: 1 | 2
  ) => {
    const formattedDate = formatFromInput(e.target.value);
    if (dateIndex === 1) {
      setD1(formattedDate);
      if (storageKey1) localStorage.setItem(storageKey1, formattedDate);
    } else {
      setD2(formattedDate);
      if (storageKey2) localStorage.setItem(storageKey2, formattedDate);
    }
  };

  // ⭐️ НОВОЕ: Обработчик клика по числу (Шаг 1.2)
  const handleEnergyClick = (energyNumber: number) => {
    tg?.HapticFeedback.notificationOccurred('success');
    alert(`Вы нажали на энергию ${energyNumber}. \n\nЗдесь будет PRO-описание этой энергии!`);
  };

  // ⭐️ ИЗМЕНЕНО: handleClear (он уже сбрасывал 'res', так что все ок)
  const handleClear = (dateIndex: 1 | 2) => {
    tg?.HapticFeedback.impactOccurred('light');
    if (dateIndex === 1) {
      setD1('');
      if (storageKey1) localStorage.removeItem(storageKey1);
    } else {
      setD2('');
      if (storageKey2) localStorage.removeItem(storageKey2);
    }
    setRes(null); // Сбрасываем результат
    setErr('');
  };

  // ⭐️ ИЗМЕНЕНО: handleSubmit (он уже ставил 'res', так что все ок)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    tg?.HapticFeedback.impactOccurred('medium');
    
    setIsLoading(true);
    setErr('');
    setRes(null); // Сбрасываем ВЕСЬ ответ

    try {
      const userId = initTelegram() || 'guest';
      const r = await fetchApi<ApiAnalysisResponse>('/api/compat', {
        birthDate1: d1,
        birthDate2: d2,
        userId,
      });
      setRes(r); // Устанавливаем ВЕСЬ ответ
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Совместимость</h2>
      <form onSubmit={handleSubmit}>
        {/* ... (Форма с календарями остается без изменений) ... */}
        <div className="date-picker-control" style={{ marginBottom: '1rem' }}>
          {!tg ? (
            <div className="browser-date-picker" style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="birthdate-picker-1" style={{ marginRight: '10px' }}>Ваша дата:</label>
              <input 
                type="date"
                id="birthdate-picker-1"
                value={formatToInput(d1)}
                onChange={(e) => handleBrowserDateChange(e, 1)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <Button type="button" onClick={() => showDatePicker(1)} disabled={isLoading}>
              {d1 ? `Ваша дата: ${d1}` : 'Выбрать вашу дату'}
            </Button>
          )}
          {d1.length > 0 && !isLoading && (
            <Button type="button" onClick={() => handleClear(1)} variant="outline" style={{ marginLeft: '8px' }}>
              Очистить
            </Button>
          )}
        </div>
        <div className="date-picker-control">
          {!tg ? (
            <div className="browser-date-picker" style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="birthdate-picker-2" style={{ marginRight: '10px' }}>Дата партнера:</label>
              <input 
                type="date"
                id="birthdate-picker-2"
                value={formatToInput(d2)}
                onChange={(e) => handleBrowserDateChange(e, 2)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <Button type="button" onClick={() => showDatePicker(2)} disabled={isLoading}>
              {d2 ? `Дата партнера: ${d2}` : 'Выбрать дату партнера'}
            </Button>
          )}
          {d2.length > 0 && !isLoading && (
            <Button type="button" onClick={() => handleClear(2)} variant="outline" style={{ marginLeft: '8px' }}>
              Очистить
            </Button>
          )}
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !d1 || !d2}
          style={{marginTop: '1.5rem'}}
        >
          {isLoading ? 'Анализ...' : 'Рассчитать совместимость'}
        </Button>
      </form>

      {err && <p className="error">{err}</p>}

      {/* ⭐️⭐️⭐️ ГЛАВНОЕ ИЗМЕНЕНИЕ (Шаг 1.2) ⭐️⭐️⭐️ */}
      {/* Теперь мы проверяем 'res', а не 'analysisText' */}
      {res && (
        <div className="card">
          
          {/* 1. Блок "Живой Матрицы" (кликабельные числа) */}
          {res.matrixData?.energies && res.matrixData.energies.length > 0 && (
            <div className="matrix-key-number" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{fontSize: '1.1rem'}}>Ключевые энергии:</span>
              
              {/* Рендерим КАЖДОЕ число как кнопку */}
              {res.matrixData.energies.map((energy, index) => (
                <Button
                  key={index} // Используем index, так как числа могут повторяться (напр. 8 и 8)
                  type="button"
                  onClick={() => handleEnergyClick(energy)}
                  variant="primary"
                  style={{ padding: '10px 15px', fontSize: '1.2rem', fontWeight: 'bold' }}
                >
                  {energy}
                </Button>
              ))}
            </div>
          )}

          {/* 2. Текстовый анализ (ReactMarkdown) */}
          {res.analysis && (
            // Мы используем ReactMarkdown, как и было в твоем коде
            <ReactMarkdown>{res.analysis}</ReactMarkdown>
          )}
          
          {/* 3. Остальная информация (ProCTA) */}
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}