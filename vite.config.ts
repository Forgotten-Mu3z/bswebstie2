import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  // Keep Wrangler's logs and registry inside the project.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler reads its log path when the plugin is imported, so import late.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    // No public source maps in production builds.
    build: { sourcemap: false },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: {
          main: 'vinext/server/fetch-handler',
          compatibility_flags: ['nodejs_compat'],
        },
        // Windows paths over 260 characters crash the local runtime; point
        // LOCAL_STATE_DIR at a short folder when the project path is long.
        persistState: {
          path: process.env.LOCAL_STATE_DIR || '.wrangler/state',
        },
      }),
    ],
  };
});
