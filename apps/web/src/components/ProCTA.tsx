import React, { useState } from 'react';
import { initTelegram } from '../lib/telegram';

const PRO_PRICE_STARS = 350;

function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram) {
    return window.Telegram.WebApp;
  }
  return null;
}

export default function ProCTA({ reason }: { reason?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Открыть ссылку на инвойс (fallback метод)
  const openInvoiceLink = async (userId: string) => {
    try {
      const res = await fetch('/api/pay-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const data = await res.json();
      
      if (data.alreadyPro) {
        alert('У вас уже есть активная PRO подписка!');
        window.location.reload();
        return;
      }
      
      if (data.invoiceLink) {
        // Открываем инвойс через Telegram WebApp
        const tg = getTelegramWebApp();
        if (tg?.openInvoice) {
          tg.openInvoice(data.invoiceLink, (status: string) => {
            if (status === 'paid') {
              alert('PRO подписка активирована! Страница будет перезагружена.');
              window.location.reload();
            }
          });
        } else {
          // Fallback - открываем в браузере
          window.open(data.invoiceLink, '_blank');
        }
      } else if (data.botLink) {
        // Крайний fallback - ссылка на бота
        window.open(data.botLink, '_blank');
      } else {
        throw new Error(data.error || 'Не удалось создать ссылку на оплату');
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка создания платежа');
    }
  };

  const handleProClick = async () => {
    setError('');
    setIsLoading(true);
    
    const tg: any = getTelegramWebApp();
    const userId = initTelegram();

    if (!userId || userId === 'guest') {
      // Если нет Telegram - пробуем через API
      const testUserId = prompt('Введите ваш Telegram ID для тестовой оплаты:');
      if (testUserId) {
        await openInvoiceLink(testUserId);
      } else {
        setError('Для оплаты нужно открыть приложение через Telegram');
      }
      setIsLoading(false);
      return;
    }

    // Метод 1: Пробуем showStarsPopup (новый API Telegram Mini Apps)
    if (tg?.showStarsPopup) {
      try {
        tg.showStarsPopup(
          { amount: PRO_PRICE_STARS },
          async (result: any) => {
            if (result.status === 'paid') {
              tg.HapticFeedback?.notificationOccurred?.('success');
              
              try {
                // Активируем подписку на сервере
                const res = await fetch('/api/payments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, action: 'activate' }),
                });

                if (!res.ok) {
                  const errData = await res.json();
                  throw new Error(errData.error || 'Ошибка активации');
                }

                alert('PRO-доступ на 30 дней успешно активирован!');
                window.location.reload();

              } catch (e: any) {
                setError(`Оплата прошла, но ошибка активации: ${e.message}`);
              }
              
            } else if (result.status === 'cancelled') {
              tg.HapticFeedback?.impactOccurred?.('light');
            } else if (result.status === 'failed') {
              tg.HapticFeedback?.notificationOccurred?.('error');
              setError(`Ошибка оплаты: ${result.message || 'попробуйте снова'}`);
            }
            setIsLoading(false);
          },
        );
        return;
      } catch (e) {
        console.warn('showStarsPopup failed, trying invoice method:', e);
      }
    }

    // Метод 2: Fallback на инвойс
    await openInvoiceLink(userId);
    setIsLoading(false);
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ marginBottom: '0.5rem', color: '#888', fontSize: '14px' }}>
        {reason === 'free_quota'
          ? '📊 Вы использовали все бесплатные запросы на сегодня.'
          : '✨ Получите подробный анализ без ограничений!'}
      </div>

      <button
        className="btn btn--float"
        onClick={handleProClick}
        disabled={isLoading}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          padding: '14px 28px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '300px'
        }}
      >
        <span aria-hidden>⭐</span>
        {isLoading ? 'Обработка...' : `PRO на 30 дней — ${PRO_PRICE_STARS} звёзд`}
      </button>

      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        Безлимитный доступ ко всем функциям
      </div>

      {error && (
        <p style={{ 
          color: '#ff6b6b', 
          marginTop: '12px',
          padding: '10px',
          background: 'rgba(255,100,100,0.1)',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          {error}
        </p>
      )}
    </div>
  );
}