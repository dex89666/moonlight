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
    const tg: any = getTelegramWebApp();

    if (!tg) {
      // Provide a fallback simulate button for testing
      const ok = window.confirm('Telegram WebApp не найден. Выполнить тестовую симуляцию оплаты? (тестовая среда)')
      if (!ok) { setError('Ошибка: не удалось найти Telegram WebApp. Откройте в Telegram.'); return }
      // simulate payment flow by calling /api/payments directly
      (async ()=>{
        setIsLoading(true)
        try {
          const userId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || prompt('Введите тестовый userId (только для dev)') || 'guest'
          const birthDate = (() => { try { return localStorage.getItem('birthDate') } catch (e) { return null } })()
          const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, birthDate }) })
          if (!res.ok) throw new Error('Ошибка активации тестовой подписки')
          alert('Тестовая оплата принята — PRO активирован (симуляция). Страница будет перезагружена.')
          window.location.reload()
        } catch (e:any) { setError(String(e.message || e)) } finally { setIsLoading(false) }
      })()
      return
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
      async (result: any) => {
        if (result.status === 'paid') {
          tg.HapticFeedback.notificationOccurred('success');
          
          try {
            // ⭐️ ИСПРАВЛЕНО: Отправляем userId в теле запроса
            const birthDate = (() => { try { return localStorage.getItem('birthDate') } catch (e) { return null } })()
            const res = await fetch('/api/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userId, birthDate }),
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