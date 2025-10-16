import Header from './Header'
import Footer from './Footer'
import { PropsWithChildren } from 'react'

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="app">
      <Header />
      <main className="container">{children}</main>
      <Footer />
    </div>
  )
}
