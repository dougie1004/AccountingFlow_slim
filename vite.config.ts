import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@bridge': path.resolve(__dirname, './src/bridge'),
            '@core': path.resolve(__dirname, './src/core_engine'),
            '@strategic': path.resolve(__dirname, './src/strategic_layer'),
            '@constitution': path.resolve(__dirname, './src/constitution'),
            '@types': path.resolve(__dirname, './src/types'),
            '@const': path.resolve(__dirname, './src/constants'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@components': path.resolve(__dirname, './src/components'),
        },
    },
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
    },
    envPrefix: ['VITE_', 'TAURI_'],
});
