import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import { fetchApi } from '../lib/fetchApi';
import ProCTA from '../components/ProCTA';
import { initTelegram } from '../lib/telegram';

const LOCAL_STORAGE_KEY_BASE = 'savedBirthDate';

// ... (Тут функции formatDate, formatFromInput, formatToInput - они не меняются) ...
function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
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

export default function MatrixLight() {
  const [d, setD] = useState('');
  // ⭐️ ИЗМЕНЕНО: apiResponse теперь ЕДИНЫЙ источник правды.
  const [apiResponse, setApiResponse] = useState<null | ApiAnalysisResponse>(null);
  // ⭐️ УДАЛЕНО: const [analysisText, setAnalysisText] = useState(''); (Больше не нужно)
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [tg, setTg] = useState<WebApp | null>(() => {
    if (typeof window !== 'undefined' && window.Telegram) {
      return window.Telegram.WebApp;
    }
    return null;
  });

  // ... (Эффекты 1 и 2, showDatePicker, handleBrowserDateChange не меняются) ...
  useEffect(() => {
    const id = initTelegram() || 'guest';
    setStorageKey(`${LOCAL_STORAGE_KEY_BASE}_${id}`);
    if (!tg && typeof window !== 'undefined' && window.Telegram) {
      setTg(window.Telegram.WebApp);
    }
  }, []);
  useEffect(() => {
    if (storageKey) {
      const savedDate = localStorage.getItem(storageKey);
      if (savedDate) {
        setD(savedDate);
      }
    }
  }, [storageKey]);
  const showDatePicker = () => {
    if (!tg) return;
    tg.showDatePicker((selectedDate: Date) => {
      if (selectedDate) {
        const formattedDate = formatDate(selectedDate);
        setD(formattedDate);
        if (storageKey) {
          localStorage.setItem(storageKey, formattedDate);
        }
      }
    });
  };
  const handleBrowserDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputDate = e.target.value;
    const formattedDate = formatFromInput(inputDate);
    setD(formattedDate);
    if (storageKey) {
      localStorage.setItem(storageKey, formattedDate);
    }
  };

  // ⭐️ НОВОЕ: Обработчик клика по числу (Шаг 1.2)
  const handleKeyNumberClick = (keyNumber: number) => {
    // Включаем вибрацию (Шаг 3 нашего плана)
    tg?.HapticFeedback.notificationOccurred('success');
    
    // Пока что просто выводим alert.
    // В Этапе 3 (Монетизация) мы будем здесь показывать PRO-описание.
    alert(`Вы нажали на ${keyNumber}. \n\nЗдесь будет подробное PRO-описание этой энергии!`);
  };

  // ⭐️ ИЗМЕНЕНО: handleSubmit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    // setAnalysisText(''); // ⭐️ УДАЛЕНО
    setApiResponse(null); // ⭐️ Сбрасываем ВЕСЬ ответ

    if (storageKey && d) {
      localStorage.setItem(storageKey, d);
    }

    try {
      const currentUserId = initTelegram() || 'guest';
      const response = await fetchApi<ApiAnalysisResponse>('/api/matrix', {
        birthDate: d,
        userId: currentUserId,
      });
      setApiResponse(response); // ⭐️ Устанавливаем ВЕСЬ ответ
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐️ ИЗМЕНЕНО: handleClear
  const handleClear = () => {
    setD('');
    // setAnalysisText(''); // ⭐️ УДАЛЕНО
    setApiResponse(null); // ⭐️ Сбрасываем ВЕСЬ ответ
    setErr('');
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  };

  // ⭐️ УДАЛЕНО: useEffect, который следил за apiResponse и ставил analysisText (Больше не нужен)

  return (
    <Section>
      <h2>Психологический портрет по дате</h2>
      <form onSubmit={handleSubmit}>
        {/* ... (Форма с календарями остается без изменений) ... */}
        <div className="date-picker-control">
          {!tg ? (
            <div className="browser-date-picker" style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="birthdate-picker" style={{ marginRight: '10px' }}>Дата рождения:</label>
              <input 
                type="date"
                id="birthdate-picker"
                value={formatToInput(d)}
                onChange={handleBrowserDateChange}
                style={{ padding: '8px' }}
                disabled={isLoading}
              />
            </div>
          ) : (
            <Button
              type="button"
              onClick={showDatePicker}
              disabled={isLoading}
              variant="primary" 
            >
              {d ? `Дата: ${d}` : 'Выбрать дату рождения'}
            </Button>
          )}
          {d.length > 0 && !isLoading && (
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              style={{ marginLeft: '8px' }}
            >
              Очистить
            </Button>
          )}
        </div>
        <div className="row" style={{ marginTop: '1rem' }}>
          <Button type="submit" disabled={isLoading || !d}>
            {isLoading ? 'Расчёт...' : 'Начать анализ'}
          </Button>
        </div>
      </form>

      {err && <p className="error" style={{ color: 'red' }}>{err}</p>}

      {/* ⭐️⭐️⭐️ ГЛАВНОЕ ИЗМЕНЕНИЕ (Шаг 1.2) ⭐️⭐️⭐️ */}
      {/* Теперь мы проверяем не analysisText, а сам apiResponse */}
      {apiResponse && (
        <div className="card">
          
          {/* 1. Блок "Живой Матрицы" (кликабельное число) */}
          {apiResponse.matrixData?.keyNumber && (
            <div className="matrix-key-number" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{fontSize: '1.1rem'}}>Ключевое число:</span>
              <Button
                type="button"
                onClick={() => handleKeyNumberClick(apiResponse.matrixData!.keyNumber!)}
                variant="primary" // (Можешь использовать любой стиль)
                style={{ padding: '10px 15px', fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                {apiResponse.matrixData.keyNumber}
              </Button>
            </div>
          )}

          {/* 2. Текстовый анализ (теперь читаем прямо из apiResponse) */}
          {apiResponse.analysis && (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{apiResponse.analysis}</pre>
          )}

          {/* 3. Остальная информация (stub, ProCTA) */}
          {apiResponse.source === 'stub' && (
            <p style={{ color: '#999', marginTop: '0.5rem' }}>
              Это локальный тестовый ответ (stub). Настройте OPENAI_API_KEY для
              реальных ответов.
            </p>
          )}
          {apiResponse.brief && (
            <ProCTA reason={apiResponse.briefReason} />
          )}
        </div>
      )}
    </Section>
  );
}