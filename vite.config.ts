import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix: Replaced `path.resolve(process.cwd(), '.')` with `path.resolve('.')` to avoid a TypeScript type error.
          // This correctly resolves to the project's root directory.
          '@': path.resolve('.'),
        }
      }
    };
});