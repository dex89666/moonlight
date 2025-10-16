import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';

export default function TarotSimple() {
  const [res, setRes] = useState<null | ApiAnalysisResponse>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetCard = async () => {
    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
  // Вызываем наш новый API для метафорических карт
  const userId = initTelegram() || 'guest'
  const r = await fetchApi<ApiAnalysisResponse>('/api/tarot', { userId });
  setRes(r);
    } catch (e: any) {
      setErr(e?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Карта дня</h2>
      <Button onClick={handleGetCard} disabled={isLoading}>
  {isLoading ? 'Тасуем колоду...' : 'Сгенерировать отчет'}
      </Button>

      {err && <p className="error">{err}</p>}

      {res && (
        <div className="card" style={{ textAlign: 'left', marginTop: '1rem' }}>
          <ReactMarkdown>{res.analysis}</ReactMarkdown>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}