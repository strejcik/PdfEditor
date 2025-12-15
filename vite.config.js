import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // CRA's default build output
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and ReactDOM into separate chunk
          'react-vendor': ['react', 'react-dom'],

          // Split PDF library into its own chunk (likely very large)
          'pdf-vendor': ['pdf-lib', '@pdf-lib/fontkit'],

          // Split Socket.io into its own chunk
          'socket-vendor': ['socket.io-client'],

          // Client utilities only (bcryptjs and jsonwebtoken removed - server-side only)
          'utils-vendor': ['axios'],
        },
      },
    },
    // Increase chunk size warning limit to 1500kb to account for pdf-lib
    chunkSizeWarningLimit: 1500,
  },
});