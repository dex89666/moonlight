import { PropsWithChildren, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, DetailedHTMLProps } from 'react'

export function Section({ children }: PropsWithChildren) {
  return <section className="section">{children}</section>
}

// ⭐️ 1. Определяем свой интерфейс для Кнопки
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'; // Разрешаем эти варианты
}

// ⭐️ 2. Обновляем компонент Кнопки
export function Button({ variant, className, ...props }: ButtonProps) {
  // Если передан variant="outline", мы добавим CSS-класс "btn--outline"
  // (Предполагаем, что в твоем CSS есть классы .btn--outline, .btn--primary и т.д.)
  const variantClass = variant ? `btn--${variant}` : '';
  
  return (
    <button 
      className={`btn ${variantClass} ${className || ''}`} 
      {...props} 
    />
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function Select(
  props: DetailedHTMLProps<
    SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >,
) {
  return <select className="select" {...props} />
}