import { useState } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';
import { ApiAnalysisResponse } from '../api/client';
import ReactMarkdown from 'react-markdown';
import ProCTA from '../components/ProCTA';

export default function TarotSimple() {
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDraw = async () => {
    setLoading(true);
    try {
      const userId = initTelegram() || 'guest';
      const data = await fetchApi<ApiAnalysisResponse>('/api/tarot', { userId });
      setRes(data);
    } catch (e) {
      alert('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section>
      <h2>Карта дня</h2>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🃏</div>
        <Button onClick={handleDraw} disabled={loading}>
          {loading ? 'Вытягиваем...' : 'Вытянуть карту'}
        </Button>
      </div>
      {res && (
        <div className="card">
          <ReactMarkdown>{res.analysis}</ReactMarkdown>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}