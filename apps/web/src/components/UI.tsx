import { PropsWithChildren, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

export function Section({ children }: PropsWithChildren) {
  return <section className="section">{children}</section>
}

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="btn" {...props} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function Select(
  props: React.DetailedHTMLProps<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    HTMLSelectElement
  >,
) {
  return <select className="select" {...props} />
}
