import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import './styles/index.css'

// Импорт страниц
import Home from './pages/Home'
import MatrixLight from './pages/MatrixLight'
import Compatibility from './pages/Compatibility'
import TarotSimple from './pages/TarotSimple'
import Zodiac from './pages/Zodiac'
import ProSubscribe from './pages/ProSubscribe'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="matrix" element={<MatrixLight />} />
          <Route path="compat" element={<Compatibility />} />
          <Route path="tarot" element={<TarotSimple />} />
          <Route path="zodiac" element={<Zodiac />} />
          <Route path="pro" element={<ProSubscribe />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)