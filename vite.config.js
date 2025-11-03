import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                // Suppress warnings
                if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
                warn(warning);
            }
        }
    },
    server: {
        port: 3000
    }
})