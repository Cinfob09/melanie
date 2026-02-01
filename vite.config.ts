import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
plugins: [react()],
optimizeDeps: {
exclude: ['lucide-react'],
},
build: {
// Increase the warning limit slightly (optional, prevents noise for 501kb files)
chunkSizeWarningLimit: 800,
rollupOptions: {
output: {
// This splits the single index.js into multiple smaller files
manualChunks: {
'vendor-react': ['react', 'react-dom', 'react-router-dom'],
'vendor-supabase': ['@supabase/supabase-js'],
'vendor-icons': ['lucide-react'],
'vendor-utils': ['@simplewebauthn/browser'],
},
},
},
},
});