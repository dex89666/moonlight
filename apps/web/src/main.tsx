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
import DesignPreview from './components/DesignPreview'
import ThreeHome from './pages/ThreeHome'
import AdminPage from './pages/admin'

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
  { path: 'r3d', element: <ThreeHome /> },
  { path: 'designs', element: <DesignPreview /> },
  { path: 'pro', element: <ProSubscribe /> },
  { path: 'admin', element: <AdminPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
