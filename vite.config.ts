import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'

export default defineConfig(async () => ({
  root: fileURLToPath(new URL('./examples/storefront', import.meta.url)),
  define: {
    // Inject __DEV__ global for conditional code paths in the library and demo components
    // todo: replace with environment variable for production builds
    __DEV__: JSON.stringify(true),
  },
  resolve: {
    alias: [
      {
        find: /^xzo\/dom$/,
        replacement: fileURLToPath(new URL('./src/dom/index.ts', import.meta.url)),
      },
      {
        find: /^xzo$/,
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
    ],
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