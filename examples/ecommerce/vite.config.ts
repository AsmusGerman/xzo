import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'

export default defineConfig(async () => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: {
    __DEV__: JSON.stringify(true),
  },
  plugins: [
    await babel({
      include: /\.[jt]sx$/,
      parserOpts: {
        plugins: ['jsx', 'typescript'],
      },
      plugins: [
        ['babel-plugin-jsx-dom-expressions', {
          moduleName: 'xzo/dom',
          generate: 'dom',
          delegateEvents: true,
          contextToCustomElements: true,
        }],
      ],
    }),
  ],
}))
