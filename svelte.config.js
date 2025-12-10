import { mdsvex } from 'mdsvex'
import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [vitePreprocess(), mdsvex()],
  kit: {
    // Using Cloudflare Pages adapter for deployment
    adapter: adapter({
      // Routes configuration is handled by _routes.json
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),
  },
  extensions: ['.svelte', '.svx'],
}

export default config
