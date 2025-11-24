import { useState, useEffect } from 'react';
import { Button, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import { fetchApi } from '../lib/fetchApi';
import ProCTA from '../components/ProCTA';

// Вспомогательные функции для работы с датами
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
  const [apiResponse, setApiResponse] = useState<ApiAnalysisResponse | null>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Состояние для проверки: мы в Telegram или в браузере?
  const [isTg, setIsTg] = useState(false);

  useEffect(() => {
    // Проверяем наличие объекта Telegram при загрузке
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTg(true);
      tg.ready();
      tg.expand();
    }
  }, []);

  const showDatePicker = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    // ⭐️ ИСПРАВЛЕНИЕ: Передаем объект с настройками первым аргументом!
    tg.showDatePicker({
      title_text: "Дата рождения",
      min_date: new Date('1900-01-01'),
      max_date: new Date()
    }, (selectedDate: any) => {
      // Callback функция (второй аргумент)
      if (selectedDate) {
        // Telegram возвращает дату, создаем из неё объект Date и форматируем
        setD(formatDate(new Date(selectedDate)));
      }
    });
  };

  const handleKeyNumberClick = (keyNumber: number) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    alert(`Вы нажали на ${keyNumber}. \n\nЗдесь будет подробное PRO-описание этой энергии!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    setApiResponse(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) tg.HapticFeedback.impactOccurred('medium');

      const userId = tg?.initDataUnsafe?.user?.id?.toString() || 'guest';
      
      const response = await fetchApi<ApiAnalysisResponse>('/api/matrix', {
        birthDate: d,
        userId: userId,
      });
      setApiResponse(response);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) tg.HapticFeedback.impactOccurred('light');
    
    setD('');
    setApiResponse(null);
    setErr('');
  };

  return (
    <Section>
      <h2>Психологический портрет по дате</h2>
      <form onSubmit={handleSubmit}>
        <div className="date-picker-control" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Если Telegram - показываем кнопку, иначе - обычный инпут */}
          {isTg ? (
            <Button
              type="button"
              onClick={showDatePicker}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {d ? `Дата: ${d}` : 'Выбрать дату рождения 📅'}
            </Button>
          ) : (
            <input 
              type="date" 
              className="input"
              value={formatToInput(d)}
              onChange={(e) => setD(formatFromInput(e.target.value))}
              style={{ flex: 1, padding: '12px' }}
              disabled={isLoading}
            />
          )}

          {d.length > 0 && !isLoading && (
            <Button
              type="button"
              onClick={handleClear}
              style={{ padding: '12px' }}
            >
              ✕
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

      {apiResponse && (
        <div className="card" style={{marginTop: '20px'}}>
          
          {apiResponse.matrixData?.keyNumber && (
            <div className="matrix-key-number" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{fontSize: '1.1rem'}}>Ключевое число:</span>
              <Button
                type="button"
                onClick={() => handleKeyNumberClick(apiResponse.matrixData!.keyNumber!)}
                style={{ padding: '10px 15px', fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                {apiResponse.matrixData.keyNumber}
              </Button>
            </div>
          )}
          
          {/* Текстовый анализ */}
          {apiResponse.analysis && (
             <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{apiResponse.analysis}</pre>
          )}

          {/* PRO CTA */}
          {apiResponse.brief && (
            <ProCTA reason={apiResponse.briefReason} />
          )}
        </div>
      )}
    </Section>
  );
}