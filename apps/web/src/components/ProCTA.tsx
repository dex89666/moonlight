import React, { useState } from 'react';
// ⭐️ НОВОЕ: Импортируем твою стандартную функцию для получения ID
import { initTelegram } from '../lib/telegram';

function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram) {
    return window.Telegram.WebApp;
  }
  return null;
}

export default function ProCTA({ reason }: { reason?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProClick = () => {
    setError('');
    const tg = getTelegramWebApp();

    if (!tg) {
      setError('Ошибка: не удалось найти Telegram WebApp. Откройте в Telegram.');
      return;
    }

    // ⭐️ НОВОЕ: Мы должны получить ID пользователя СНАЧАЛА
    const userId = initTelegram();
    if (!userId || userId === 'guest') {
      setError('Ошибка: не удалось определить вашего пользователя Telegram. Попробуйте перезапустить приложение.');
      return;
    }

    setIsLoading(true);

    tg.showStarsPopup(
      {
        amount: 350, // Наша цена
      },
      async (result) => {
        if (result.status === 'paid') {
          tg.HapticFeedback.notificationOccurred('success');
          
          try {
            // ⭐️ ИСПРАВЛЕНО: Отправляем userId в теле запроса
            const res = await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId, // ⬅️ Вот это мы исправили
              }),
            });

            if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error || 'Ошибка сервера при активации подписки.');
            }

            alert('PRO-доступ на 1 месяц успешно активирован! \n\nСтраница будет перезагружена.');
            window.location.reload();

          } catch (e: any) {
            setError(`Оплата прошла, но ОШИБКА АКТИВАЦИИ: ${e.message}. \n\nНапишите в поддержку.`);
          } finally {
            setIsLoading(false);
          }
          
        } else if (result.status === 'cancelled') {
          tg.HapticFeedback.impactOccurred('light');
          setIsLoading(false);
          
        } else if (result.status === 'failed') {
          tg.HapticFeedback.notificationOccurred('error');
          setError(`Ошибка оплаты: ${result.message || 'неизвестная ошибка'}`);
          setIsLoading(false);
        }
      },
    );
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '0.5rem', color: '#666' }}>
        {reason === 'free_quota'
          ? 'Вы исчерпали дневной лимит бесплатных сообщений.'
          : 'Доступ ограничен.'}
      </div>

      <button
        className="btn btn--float"
        onClick={handleProClick}
        disabled={isLoading}
      >
        <span className="icon" aria-hidden>
          ✨
        </span>
        {isLoading ? 'Обработка...' : 'Оформить PRO (350 Stars)'}
      </button>

      {error && (
        <p className="error" style={{ color: 'red', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}