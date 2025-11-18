import { Button, Section } from '../components/UI';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <Section>
      <h1>Добро пожаловать</h1>
      <p>Выберите инструмент для анализа:</p>
      
      <div className="grid">
        <Link to="/matrix" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>🔢 Матрица Судьбы</h3>
            <p>Психологический портрет по дате рождения.</p>
          </div>
        </Link>

        <Link to="/compat" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>💞 Совместимость</h3>
            <p>Анализ отношений по датам партнеров.</p>
          </div>
        </Link>

        <Link to="/tarot" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>🃏 Карты Таро</h3>
            <p>Метафорическая карта дня и совет.</p>
          </div>
        </Link>
        
        <Link to="/zodiac" style={{ textDecoration: 'none' }}>
          <div className="card">
            <h3>♈ Зодиак</h3>
            <p>Астрологический прогноз.</p>
          </div>
        </Link>
      </div>
    </Section>
  );
}