import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import App from './App'
import Home from './pages/Home'
import MatrixLight from './pages/MatrixLight'
import MatrixPro from './pages/MatrixPro'
import Compatibility from './pages/Compatibility'
import TarotSimple from './pages/TarotSimple'
import Zodiac from './pages/Zodiac'
import ProSubscribe from './pages/ProSubscribe'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'matrix', element: <MatrixLight /> },
      { path: 'matrix-pro', element: <MatrixPro /> },
      { path: 'compat', element: <Compatibility /> },
      { path: 'tarot', element: <TarotSimple /> },
      { path: 'zodiac', element: <Zodiac /> },
      { path: 'pro', element: <ProSubscribe /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
