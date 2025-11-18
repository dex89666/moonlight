import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.', // Явно указываем текущую папку как корень
  base: './', // Относительные пути
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'] // Помогаем найти расширения
  },
  build: {
    outDir: 'dist',
  }
})