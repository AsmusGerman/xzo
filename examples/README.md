# Examples Guide

All examples for this repository must live inside the `examples/` folder. Each example is a self-contained package that references `xzo` as a local dependency through the bun workspace, so no relative path hacks or `tsconfig` path aliases are needed.

## Folder Naming

Each example must use a clear, unique folder name that describes what it shows.

Good names:
- `ecommerce`
- `todo-signals`
- `async-data-table`

Avoid:
- `test`
- `demo2`
- `new-example`

## Required File Structure

```text
examples/
  your-example-name/
    index.html
    main.ts
    tsconfig.json
    vite.config.ts
    package.json
    components/
    public/
```

## `package.json`

Declare `xzo` as a `file:` dependency pointing to the repository root. Use script binaries directly (`vite`, `vite build`) so scripts do not hardcode root `node_modules` paths.

```json
{
  "name": "xzo-example-your-name",
  "type": "module",
  "private": true,
  "dependencies": {
    "xzo": "file:../.."
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "bunx --bun tsc --noEmit"
  }
}
```

## `tsconfig.json`

Every example has its own standalone `tsconfig.json`. Do **not** extend the root config. Include the library's ambient declaration files so JSX types and the `stylis` module are resolved.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2020", "DOM"],
    "jsx": "preserve",
    "jsxImportSource": "xzo",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["./**/*", "../../src/jsx.d.ts", "../../src/stylis.d.ts"]
}
```

## `vite.config.ts`

Point `root` at the example directory and configure the babel JSX transform. No `resolve.alias` is needed — `xzo` resolves through `node_modules` after `bun install`.

```ts
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
      parserOpts: { plugins: ['jsx', 'typescript'] },
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
```

## Registry Augmentations (`declare module 'xzo'`)

TypeScript module augmentations for `ComponentRegistry` and `ServiceRegistry` must all be declared in `main.ts` — not scattered across individual component files. This keeps the type surface in one place and avoids duplicate declaration conflicts.

```ts
// main.ts
declare module 'xzo' {
  interface ComponentRegistry {
    'my-component': {
      // signals/values exposed via the component's scope
    }
  }

  interface ServiceRegistry {
    myService: {
      // shape of the service returned by lib.service()
    }
  }
}
```

## Running an Example

Enter the example folder, install dependencies, and start the dev server:

```bash
cd examples/<example-name>
bun install
bun run dev
```

Bun detects the workspace root automatically and hoists all packages, including the `xzo` local link. Open the local URL printed in the terminal.
