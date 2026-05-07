<div align="center">
  <img src="public/title.svg" alt="xzo title" width="320" align="middle" />
  <img src="public/mascot.svg" alt="xzo mascot" width="120" align="middle" />
  <p><em>Reactive browser-native UI, no Virtual DOM</em></p>
</div>

XZO is a small UI library built around JSX compiled by `babel-plugin-jsx-dom-expressions`, fine-grained reactivity from `@preact/signals-core`, scoped styles with `stylis`, and Constructable Stylesheets for zero style-tag DOM footprint.

## Objective / Aim

XZO aims to make browser-native UI development reactive without introducing framework-heavy abstractions. The library is built to keep code explicit and close to platform primitives while handling the hard runtime concerns internally.

## Philosophy

- Explicit over implicit: values flow downward intentionally via component return values and `scope`.
- Closure is the contract: `template` and `styles` live with state and logic in the same setup function.
- Library absorbs complexity: reconciliation, async state distribution, style scoping, and DOM anchoring are runtime concerns.
- Browser-first runtime: use mature standards (DOM, events, Constructable Stylesheets) as the foundation.

For a spec-style overview of architecture and concepts, see `docs/library-spec.md`.

## Install

```bash
bun install
```

## Development

```bash
bun run dev
```

This serves the example from `demo/` using Vite 8 and Rolldown.

## Build

```bash
bun run build
```

## Typecheck

```bash
bun run typecheck
```

## Tooling

`vite.config.ts` wires `@rolldown/plugin-babel` only for `.tsx` and `.jsx` files so Oxc can continue handling the rest of the pipeline. TypeScript keeps JSX intact with `jsx: "preserve"`, and Babel performs the DOM compilation step.

## Limitations

- Client-side only. SSR is out of scope for this MVP.
- JSX compilation depends on Babel through `babel-plugin-jsx-dom-expressions`.
- Constructable Stylesheets require modern browser support.