import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dynamische backend URL (fallback = Railway)
const API_BASE =
    process.env.VITE_API_BASE_URL ||
    "https://world-studio-production.up.railway.app";

// Path alias helper
import path from "path";

export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@components": path.resolve(__dirname, "src/components"),
            "@api": path.resolve(__dirname, "src/api"),
            "@styles": path.resolve(__dirname, "src/styles"),
        },
    },

    server: {
        port: 5173,
        open: true,

        // Proxy voor lokale backend (indien je lokaal test)
        proxy: {
            "/api": {
                target: API_BASE,
                changeOrigin: true,
                secure: false,
            },
            "/socket.io": {
                target: API_BASE,
                ws: true,
            },
        },
    },

    build: {
        outDir: "dist",
        sourcemap: false,
        chunkSizeWarningLimit: 1000,
        emptyOutDir: true,

        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react", "react-dom"],
                    vendor: ["axios", "lucide-react"],
                },
            },
        },
    },
});

