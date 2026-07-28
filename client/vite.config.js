import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Dependencies change far less often than app code. Splitting them out
        // means a normal deploy only invalidates the app chunks, so returning
        // visitors keep the cached vendor bundles.
        //
        // This has to match on module path rather than package name: naming
        // 'react-dom' alone left most of its code in the app chunk, because the
        // entry point imports 'react-dom/client' and Rollup resolves that to a
        // different module.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('lucide-react')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
})
