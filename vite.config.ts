import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/supabase-api': {
          target: env.VITE_SUPABASE_URL || 'https://supabase-hml.quantumtecnologia.com.br',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/supabase-api/, '')
        }
      }
    },
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      // Rastreamento de conversão (opcionais — no-op sem valor)
      'process.env.VITE_GA4_ID': JSON.stringify(env.VITE_GA4_ID || ''),
      'process.env.VITE_META_PIXEL_ID': JSON.stringify(env.VITE_META_PIXEL_ID || ''),
      'process.env.VITE_GADS_ID': JSON.stringify(env.VITE_GADS_ID || ''),
      'process.env.VITE_GADS_CONVERSION_LABEL': JSON.stringify(env.VITE_GADS_CONVERSION_LABEL || ''),
      // Handoff de vendas (WhatsApp) — só dígitos, ex. "5562999999999"
      'process.env.VITE_SALES_WHATSAPP': JSON.stringify(env.VITE_SALES_WHATSAPP || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
