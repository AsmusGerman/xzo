# xzo

xzo is a small UI library built around JSX compiled by `babel-plugin-jsx-dom-expressions`, fine-grained reactivity from `@preact/signals-core`, scoped styles with `stylis`, and Constructable Stylesheets for zero style-tag DOM footprint.

## Objective / Aim

xzo aims to make browser-native UI development reactive without introducing framework-heavy abstractions. The library is built to keep code explicit and close to platform primitives while handling the hard runtime concerns internally.

Primary goals:

- no Virtual DOM
- no framework DSL beyond JSX
- no hidden runtime magic
- small runtime surface with standards-aligned behavior

## Philosophy

- Explicit over implicit: values flow downward intentionally via component return values and `scope`.
- Closure is the contract: `template` and `styles` live with state and logic in the same setup function.
- Library absorbs complexity: reconciliation, async state distribution, style scoping, and DOM anchoring are runtime concerns.
- Browser-first runtime: use mature standards (DOM, events, Constructable Stylesheets) as the foundation.

For a spec-style overview of architecture and concepts, see `docs/library-spec.md`.

## What is included

- `xzo/dom`: compiler runtime consumed by `babel-plugin-jsx-dom-expressions`
- `lib.define()` and `lib.root()` for authoring DOM-scanned components by tag name
- root singleton enforcement: only one live root instance per root tag
- `lib.each()` for source-based distributed iteration (`each`, `empty`, `first`, `last`)
- `lib.async()` for source-based async states (`loading`, `data`, `error`, `reloading`)
- `lib.service()` for global singleton services initialized during `lib.init()`
- `ctx.inject()` with lookup order: own scope -> nearest ancestors -> services
- `ctx.emit()` / `ctx.listen()` for custom DOM events
- `ctx.effect()` for tracked reactive side effects
- `ctx.onMount()` / `ctx.onUnmount()` for lifecycle hooks
- `css`` ` for scoped component styles injected through `document.adoptedStyleSheets`
- A shopping-cart demo under `demo/`

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

## Component shape

```tsx
import { computed } from '@preact/signals-core'
import { css, lib, signal } from 'xzo'

lib.define('product-item', (ctx) => {
  const { name } = ctx
  const added = signal(false)
  const label = computed(() => added.value ? 'Added' : 'Add')

  return {
    template: <button onclick={() => { added.value = true }}>{label}</button>,
    styles: css`
      button { border-radius: 999px; }
    `,
  }
})
```

Reserved keys in the returned object:

- `template`: rendered DOM node
- `styles`: scoped CSS string
- `scope`: explicit provider values for descendants

Any other returned fields are exposed to descendants through `ctx.inject()`.

`lib.root()` registers a singleton root tag. If a second instance of the same root tag appears, xzo removes the duplicate and logs an error.

## Public API

```ts
import { batch, computed, css, effect, lib, signal } from 'xzo'
import type { AnySignal, AsyncSource, Context, EachSource } from 'xzo'
```

### `lib.each()`

Accepts a selector or signal source, a required key function, and an optional `{ lookup: true }` mode. Returns distributed source elements: `each`, `empty`, `first`, `last` plus mutation helpers.

Default reconciliation mode uses keyed shallow equality: existing DOM is preserved for items whose shallow properties are unchanged.

When the source is a readonly/computed signal, mutation helpers (`add`, `remove`, `update`, `set`) are no-ops.

### `lib.async(fetcher)`

Creates a distributed async source with `loading`, `data`, `error`, and `reloading` element states.

### `ctx.emit(eventName, detail?)` / `ctx.listen(eventName, handler, options?)`

Fire and listen for `CustomEvent`s on the host element. Events bubble and are composed by default.

### `ctx.effect(callback)`

Creates a tracked reactive effect scoped to the component's lifecycle. Automatically disposed on unmount.

### `ctx.tagName` / `ctx.prop(name)`

Use `ctx.tagName` when you need the component tag name. Use `ctx.prop(name)` to explicitly access a host prop signal when a prop name could collide with a context API field such as `name`.

### `ctx.onMount(callback)` / `ctx.onUnmount(callback)`

Register lifecycle hooks. `onMount` fires after the component's template is inserted; `onUnmount` fires when the element is removed from the DOM.

### `lib.service(name, factory)`

Register a global singleton service. Services are instantiated during `lib.init()` before component mounting and resolved via `ctx.inject(name)` when no component in the scope chain matches.

## Limitations

- Client-side only. SSR is out of scope for this MVP.
- JSX compilation depends on Babel through `babel-plugin-jsx-dom-expressions`.
- Constructable Stylesheets require modern browser support.
- The current component runtime mounts registered tags by scanning the DOM instead of relying on Custom Elements, which keeps support for root tags like `<app>`.

## Example

Run `bun run dev` and open the shopping-cart demo. It exercises:

- root and nested components (`lib.root`, `lib.define`)
- context injection from `app` to child tags (`ctx.inject`)
- source-based iteration through `lib.each()`
- source-based async rendering through `lib.async()`
- custom DOM events for cart add/remove (`ctx.emit`, `ctx.listen`)
- reactive side effects updating the document title (`ctx.effect`)
- lifecycle logging on mount and unmount (`ctx.onMount`, `ctx.onUnmount`)
- global logger service tracking all actions (`lib.service`)
- remove-from-cart with reactive button state reset
- event delegation from JSX handlers
- scoped styles stored in `document.adoptedStyleSheets` with hashed scope attributes (`data-xz-<hash>`)

## Current API state

- `lib.repeat()` is removed.
- `ctx.async()` is removed.
- Iteration is handled by `lib.each()` sources.
- Async rendering is handled by `lib.async()` sources.