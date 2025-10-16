import { useState, useEffect } from 'react'; // 1. Добавляем useEffect
import { Button, Input, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import { fetchApi } from '../lib/fetchApi';
import ProCTA from '../components/ProCTA';
import { initTelegram } from '../lib/telegram';

export default function MatrixLight() {
  const [d, setD] = useState('');
  // Состояние для полного объекта ответа от API
  const [apiResponse, setApiResponse] = useState<null | ApiAnalysisResponse>(null);
  // Состояние ТОЛЬКО для текста, который мы будем отображать
  const [analysisText, setAnalysisText] = useState('');
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    setAnalysisText(''); // Сбрасываем все состояния
    setApiResponse(null);

    try {
      // 2. Получаем ответ и сохраняем его в apiResponse
  const userId = initTelegram() || 'guest'
  const response = await fetchApi<ApiAnalysisResponse>('/api/matrix', {
        birthDate: d,
        userId,
      });
  setApiResponse(response);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Этот "слушатель" сработает ТОЛЬКО когда apiResponse изменится.
  useEffect(() => {
    // Если в apiResponse появились данные, мы извлекаем текст и обновляем analysisText
    if (apiResponse && apiResponse.analysis) {
      setAnalysisText(apiResponse.analysis);
    }
  }, [apiResponse]); // <-- Массив зависимостей: следим только за apiResponse

  return (
    <Section>
      <h2>Психологический портрет по дате</h2>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <Input
            placeholder="dd.mm.yyyy"
            value={d}
            onChange={(e) => setD(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Расчёт...' : 'Начать анализ'}
          </Button>
        </div>
      </form>

      {err && <p className="error" style={{ color: 'red' }}>{err}</p>}

      {/* 4. Отображаем финальный текст */}
      {analysisText && (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{analysisText}</pre>
          {apiResponse && apiResponse.brief && (
                  <ProCTA reason={apiResponse.briefReason} />
          )}
        </div>
      )}
    </Section>
  );
}