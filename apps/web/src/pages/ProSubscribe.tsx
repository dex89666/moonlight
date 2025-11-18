import { Section } from '../components/UI';
import ProCTA from '../components/ProCTA';

export default function ProSubscribe() {
  return (
    <Section>
      <h2>Оформление PRO</h2>
      <p>Получите доступ ко всем функциям без ограничений.</p>
      <div className="card pro">
        <ul>
            <li>✅ Полный анализ Матрицы Судьбы</li>
            <li>✅ Подробная Совместимость</li>
            <li>✅ Личный гороскоп и Таро каждый день</li>
        </ul>
        <ProCTA />
      </div>
    </Section>
  );
}