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
  if (process.env.GITHUB_PAGES === 'true') {
    if (process.env.GITHUB_REPOSITORY) {
      const repo = process.env.GITHUB_REPOSITORY.split('/')[1]
      return `/${repo}/`
    }
    // Fallback: https://patguettler.github.io/guardian-md/
    return '/guardian-md/'
  }
  return '/'
}

function ghPagesSpaFallback(): Plugin {
  return {
    name: 'gh-pages-spa-fallback',
    closeBundle() {
      if (process.env.GITHUB_PAGES !== 'true') return
      const dist = path.resolve(__dirname, 'dist')
      const base = getPagesBase()
      const baseUrl = base.endsWith('/') ? base : `${base}/`

      // GitHub Pages serves 404.html for unknown paths — redirect to app root, then
      // main.tsx restores the deep link (see restoreGhPagesSpaRedirect).
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KeyTrain Learning</title>
  <script>
    sessionStorage.setItem('redirect', location.href);
    location.replace(location.origin + ${JSON.stringify(baseUrl)});
  </script>
</head>
<body></body>
</html>
`
      fs.writeFileSync(path.join(dist, '404.html'), fallbackHtml, 'utf-8')
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
