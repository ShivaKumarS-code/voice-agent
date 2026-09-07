import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'fix-simli-client-case',
      resolveId(source, importer) {
        if (importer && importer.includes('simli-client') && source === './Client') {
          return this.resolve('./client', importer, { skipSelf: true });
        }
      },
    },
  ],
})
