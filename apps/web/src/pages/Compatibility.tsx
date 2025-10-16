import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, Input, Section } from '../components/UI';
import { api, ApiAnalysisResponse } from '../api/client';
import ProCTA from '../components/ProCTA';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';

export default function Compatibility() {
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [res, setRes] = useState<null | ApiAnalysisResponse>(null);
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErr('');
    setRes(null);

    try {
      // --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
      const userId = initTelegram() || 'guest'
  const r = await fetchApi<ApiAnalysisResponse>('/api/compat', {
        birthDate1: d1,
        birthDate2: d2,
        userId,
      });
      // ------------------------
  setRes(r);
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
        <div className="row">
          <Input
            placeholder="Ваша дата (dd.mm.yyyy)"
            value={d1}
            onChange={(e) => setD1(e.target.value)}
            disabled={isLoading}
          />
          <Input
            placeholder="Дата партнера (dd.mm.yyyy)"
            value={d2}
            onChange={(e) => setD2(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading} style={{marginTop: '1rem'}}>
          {isLoading ? 'Анализ...' : 'Рассчитать совместимость'}
        </Button>
      </form>

      {err && <p className="error">{err}</p>}

      {res && (
        <div className="card">
          <ReactMarkdown>{res.analysis}</ReactMarkdown>
          {res.brief && <ProCTA reason={res.briefReason} />}
        </div>
      )}
    </Section>
  );
}