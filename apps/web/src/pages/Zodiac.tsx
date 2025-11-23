import { useState } from 'react';
import { Button, Section } from '../components/UI';
import { fetchApi } from '../lib/fetchApi';
import { initTelegram } from '../lib/telegram';
import { ApiAnalysisResponse } from '../api/client';
import ReactMarkdown from 'react-markdown';
import ProCTA from '../components/ProCTA';

// ⭐️ Словарь знаков: (значение для API) : (Название на русском)
const SIGN_OPTIONS = [
  { value: 'oven', label: '♈ Овен' },
  { value: 'telets', label: '♉ Телец' },
  { value: 'bliznetsy', label: '♊ Близнецы' },
  { value: 'rak', label: '♋ Рак' },
  { value: 'lev', label: '♌ Лев' },
  { value: 'deva', label: '♍ Дева' },
  { value: 'vesy', label: '♎ Весы' },
  { value: 'scorpion', label: '♏ Скорпион' },
  { value: 'strelets', label: '♐ Стрелец' },
  { value: 'kozerog', label: '♑ Козерог' },
  { value: 'vodoley', label: '♒ Водолей' },
  { value: 'ryby', label: '♓ Рыбы' }
];

export default function Zodiac() {
  const [sign, setSign] = useState(SIGN_OPTIONS[0].value);
  const [res, setRes] = useState<ApiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const userId = initTelegram() || 'guest';
      // Лог для проверки
      console.log('Отправляем запрос:', { userId, sign });
      
      const data = await fetchApi<ApiAnalysisResponse>('/api/zodiac', { userId, sign });
      setRes(data);
    } catch (e: any) {
      alert(`Ошибка сервера: ${e.message || JSON.stringify(e)}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section>
      <h2>Астрологический прогноз</h2>
      <div className="row" style={{ gap: '10px', marginBottom: '15px' }}>
        <select 
          value={sign} 
          onChange={e => setSign(e.target.value)} 
          className="select"
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #444', background: '#222', color: '#fff' }}
        >
          {SIGN_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        
        <Button onClick={handlePredict} disabled={loading} style={{ flex: 1 }}>
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