import { defineConfig, loadEnv } from 'vite'
import type { PreRenderedAsset } from 'rollup'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error Optional local development plugin.
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {
    // The optional source-tag plugin is not required for the app to run.
  }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    base: mode === 'production' ? '/ZARA-AI-INTERVIEWER/' : '/',
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    build: {
      rollupOptions: {
        output: {
          /*
           * GitHub Pages caches index.html for up to 10 minutes. With a
           * content-hashed entry name, a browser holding the old HTML after a
           * redeploy requests an asset that no longer exists and the page
           * fails to boot (the load watchdog's exact case). A stable entry
           * name means every revision of index.html resolves to a script and
           * stylesheet that exist — a stale HTML just runs the fresh bundle.
           * Chunk names keep their hashes; no lazy chunks are imported from
           * HTML directly.
           */
          entryFileNames: 'assets/index.js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo: PreRenderedAsset) =>
            assetInfo.names?.includes('style.css') || assetInfo.name?.endsWith('.css')
              ? 'assets/index.css'
              : 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
})
