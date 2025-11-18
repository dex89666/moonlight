import { useState } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';
import { ApiAnalysisResponse } from '../api/client';
import ReactMarkdown from 'react-markdown';
import ProCTA from '../components/ProCTA';

const SIGNS = ['oven', 'telets', 'bliznetsy', 'rak', 'lev', 'deva', 'vesy', 'scorpion', 'strelets', 'kozerog', 'vodoley', 'ryby'];

export default function Zodiac() {
  const [sign, setSign] = useState(SIGNS[0]);
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const userId = initTelegram() || 'guest';
      const data = await fetchApi<ApiAnalysisResponse>('/api/zodiac', { userId, sign });
      setRes(data);
    } catch (e) {
      alert('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section>
      <h2>Астрологический прогноз</h2>
      <div className="row">
        <select value={sign} onChange={e => setSign(e.target.value)} className="select">
          {SIGNS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <Button onClick={handlePredict} disabled={loading}>
          {loading ? 'Загрузка...' : 'Получить прогноз'}
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