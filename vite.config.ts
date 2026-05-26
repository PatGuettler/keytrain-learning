import path from 'path'
import fs from 'fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** GitHub Pages project site base: https://<user>.github.io/<repo>/ */
function getPagesBase(): string {
  if (process.env.GH_PAGES_BASE) {
    const base = process.env.GH_PAGES_BASE
    return base.endsWith('/') ? base : `${base}/`
  }
  if (process.env.GITHUB_PAGES === 'true' && process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1]
    return `/${repo}/`
  }
  return '/'
}

function ghPagesSpaFallback(): Plugin {
  return {
    name: 'gh-pages-spa-fallback',
    closeBundle() {
      if (process.env.GITHUB_PAGES !== 'true') return
      const dist = path.resolve(__dirname, 'dist')
      const index = path.join(dist, 'index.html')
      const fallback = path.join(dist, '404.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, fallback)
      }
      // Prevent Jekyll from skipping asset folders on legacy gh-pages branch deploys
      fs.writeFileSync(path.join(dist, '.nojekyll'), '')
    },
  }
}

export default defineConfig({
  plugins: [react(), ghPagesSpaFallback()],
  base: getPagesBase(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
