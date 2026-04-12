# xzodus

> A signal-driven UI library. No Virtual DOM. No compiler. No magic.

---

## Vision

xzodus is built on a single conviction: **the browser is already a great runtime**. Custom Elements, Constructable Stylesheets, and the DOM are mature, fast, and underused. Most UI libraries work around the browser. xzodus works with it.

The result is a library that feels like writing TypeScript — not a framework DSL. Components are functions. State is signals. Templates are JSX. The library stays out of the way.

---

## Philosophy

**Explicit over implicit.**
State that a component exposes to children is declared explicitly via `scope`. Nothing leaks by accident.

**Closure is the contract.**
`template` and `styles` live inside the setup function and have direct lexical access to everything. No props threading, no context boilerplate.

**The library absorbs complexity.**
Iteration, fine-grained reactivity, style scoping, DOM anchoring, async state, conditional rendering — these are library problems, not developer problems. The dev declares intent. xzodus handles the rest.

**`lib` registers. `ctx` operates.**
`lib.*` functions run outside the setup function and define the structure of the app — what exists globally. `ctx.*` methods run inside the setup function and are scoped to the component lifecycle — they mount with the component and are disposed when it unmounts. No exceptions. If something lives inside a setup function, it belongs on `ctx`.

**One runtime dependency.**
`@preact/signals-core` is the only runtime dependency. Everything else — CSS scoping, list reconciliation, DOM anchoring — is implemented in xzodus itself.

**Standards-aligned.**
Custom Elements for component lifecycle. Constructable Stylesheets for styles. `DocumentFragment` for anchoring. No polyfills, no workarounds.

---

## Runtime dependency

| Package | Role | Size (gzip) | Why |
|---|---|---|---|
| `@preact/signals-core` | Reactivity primitives | ~1.5kb | Battle-tested, tiny, no framework coupling |

**Dev-only dependencies** (never ship to the client):
- `babel-plugin-jsx-dom-expressions` — JSX → DOM compiler (same as Solid)
- `@rolldown/plugin-babel` — Babel integration for Vite 8
- `@babel/core` — Babel runtime for the plugin
- `vite` — dev server and build
- `typescript` — language

**No other runtime dependencies.** CSS scoping, list reconciliation, and all other utilities are implemented in xzodus directly.

---

## Estimated bundle size

| Part | gzip |
|---|---|
| `@preact/signals-core` | ~1.5kb |
| xzodus DOM runtime | ~1.5kb |
| xzodus core (lib + context + mounter) | ~2.5kb |
| `mapArray` (list reconciliation) | ~0.5kb |
| CSS scoping | ~0.3kb |
| sources (`ctx.async`, `ctx.each`) | ~0.5kb |
| **Total** | **~6.8kb** |

Comparable to Solid (~7kb). Significantly smaller than Alpine (~15kb), Vue (~33kb), React (~45kb).

---

## Project structure

```
xzodus/
│
├── packages/
│   ├── xzodus/                  ← @xzodus/core  (the library)
│   ├── router/                  ← @xzodus/router (client-side routing)
│   ├── vite-plugin/             ← @xzodus/vite-plugin (auto-imports + codegen)
│   ├── devtools/                ← @xzodus/devtools
│   └── markdown/                ← @xzodus/markdown (SSG)
│
├── demo/                        ← interactive demo app
├── docs/                        ← documentation site (built with @xzodus/markdown)
└── package.json                 ← bun workspaces
```

### `packages/xzodus/` internal structure

```
src/
├── dom/                         ← compiler runtime (xzodus/dom)
│   ├── index.ts                 ← public re-exports for the compiler
│   ├── template.ts              ← template cache + clone
│   ├── insert.ts                ← reactive node insertion
│   ├── component.ts             ← createComponent()
│   ├── spread.ts                ← spread(), mergeProps()
│   └── events.ts                ← delegateEvents(), addEventListener()
│
├── core/
│   ├── lib.ts                   ← component(), root(), service(), init(), each(), async()
│   ├── context.ts               ← Context class — inject(), ref(), emit(), listen(), observe(), when(), onMount(), onUnmount()
│   ├── scope-table.ts           ← componentTable (WeakMap), serviceTable (Map) — lazy, GC-safe
│   ├── styles.ts                ← CSS scoping + Constructable Stylesheets
│   ├── map-array.ts             ← keyed list reconciliation (no external dep)
│   ├── source-each.ts           ← ctx.each() — EachSource + distributed JSX elements
│   ├── source-async.ts          ← ctx.async() — AsyncSource + distributed JSX elements
│   ├── timing.ts                ← debounce(), throttle() — pure, exported
│   └── scheduler.ts             ← internal priority scheduler (never exported)
│
├── types.ts                     ← all shared TypeScript types
└── index.ts                     ← public API
```

---

## Tooling setup

### `package.json`
```json
{
  "name": "xzodus",
  "type": "module",
  "exports": {
    ".":     "./src/index.ts",
    "./dom": "./src/dom/index.ts"
  },
  "scripts": {
    "dev":   "bunx --bun vite demo",
    "build": "bunx --bun vite build demo",
    "test":  "bun test"
  },
  "dependencies": {
    "@preact/signals-core": "^1.5.0"
  },
  "devDependencies": {
    "vite": "^8.0.0",
    "@rolldown/plugin-babel": "^0.2.0",
    "@babel/core": "^7.0.0",
    "babel-plugin-jsx-dom-expressions": "^0.37.0",
    "typescript": "^5.0.0"
  }
}
```

### `vite.config.ts`
```ts
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    babel({
      filter: /\.[jt]sx$/,
      babelConfig: {
        plugins: [
          ['babel-plugin-jsx-dom-expressions', {
            moduleName:              'xzodus/dom',
            generate:                'dom',
            delegateEvents:          true,
            contextToCustomElements: true,
          }]
        ]
      }
    })
  ]
})
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target":           "ES2020",
    "module":           "ESNext",
    "moduleResolution": "bundler",
    "strict":           true,
    "lib":              ["ES2020", "DOM"],
    "jsx":              "preserve",
    "jsxImportSource":  "xzodus"
  }
}
```

---

## Features

---

### 1. Components — `lib.component()`

Every component is a `.tsx` file. The setup function runs once per instance. It returns an object with state, scope, template, and styles.

The component contract is declared as a single TypeScript type passed as a generic. Props and events are distinguished by their nominal type — `ComponentProp<T>` and `ComponentEvent<T>` — so xzodus can separate them automatically without any runtime cost.

```tsx
import { lib, css, ComponentProp, ComponentEvent } from 'xzodus'
import { signal } from 'xzodus'

type CounterContract = {
  initialValue: ComponentProp<number>
  'count-changed': ComponentEvent<{ count: number }>
}

lib.component<CounterContract>('counter', (ctx) => {
  const { initialValue } = ctx.props
  //      ^? Signal<number> — readonly, from parent

  const count = signal(initialValue.value)

  ctx.observe(count, (value) => {
    ctx.emit('count-changed', { count: value })
  })

  return {
    scope: { count },

    template: (
      <div>
        <p>Count: {count} — Double: {({ count }) => count * 2}</p>
        <button onclick={() => count.value++}>+</button>
      </div>
    ),

    styles: css`
      div { padding: 1rem; }
      button { background: #4f46e5; color: white; border: none; border-radius: 4px; }
    `
  }
})
```

**Contract types:**

`ComponentProp<T>` — declares a reactive readonly prop. The parent passes it as a JSX attribute. The component receives it as `Signal<T>` via `ctx.props`.

`ComponentEvent<T>` — declares a bubbling custom event. The component emits it via `ctx.emit`. An ancestor boundary (`lib.page` or `lib.root`) listens via `ctx.listen`. Use `ComponentEvent<void>` for events with no payload.

**`ctx.props`** — a Proxy that returns `Signal<T>` for each declared `ComponentProp`. Accessing a key not in the contract is a TypeScript error. Props are readonly — mutating them in dev mode logs an error.

```tsx
// parent — JSX is typed from the contract
<counter initialValue={0} />    // ✅
<counter initialValue="foo" />  // ❌ TS error — must be number
<counter />                     // ❌ TS error — initialValue required
```

**Rules:**
- `template`, `styles`, and `scope` are reserved keys. Everything else in the return is auto-exposed downward.
- `template` is JSX — compiled by `babel-plugin-jsx-dom-expressions` to direct DOM operations.
- `styles` is a CSS string — scoped automatically via a deterministic hash.
- `scope` is opt-in. If a component has nothing to share, omit it.
- The contract generic is optional — `lib.component('id', setup)` works without it for components with no props or events.

---

### 2. Root component — `lib.root()`

Identical to `lib.component()` but registers a singleton. Only one instance may exist in the DOM at a time.

```tsx
lib.root('app', (ctx) => {
  const cart = signal<Item[]>([])

  return {
    scope: { cart, addToCart },
    template: <div class="app"><product-list /><cart-summary /></div>,
    styles: css`.app { max-width: 800px; margin: 0 auto; }`
  }
})
```

If a second `<app>` appears in the DOM, xzodus removes it and logs a dev error.

---

### 3. Services — `lib.service()`

State singletons with no DOM presence. Instantiated once during `lib.init()`, before any component mounts. Available via `ctx.inject('name')` from anywhere in the tree.

```ts
lib.service('auth', () => {
  const user     = signal<User | null>(null)
  const loggedIn = signal(false)

  return {
    scope: { user, loggedIn, login, logout }
  }
})
```

```ts
lib.component('nav-bar', (ctx) => {
  const { loggedIn } = ctx.inject(reg => reg.services.auth)
  return { loggedIn, template: <nav>{loggedIn}</nav> }
})
```

---

### 4. Reactive context — `ctx.inject()`

Signals and functions flow down the component tree via `ctx.inject()`. The selector callback navigates a typed registry split into three explicit namespaces — each with its own resolution algorithm.

```ts
// components — walk bottom-up, closest ancestor wins
const { cart, addToCart } = ctx.inject(reg => reg.components.app)

// services — direct lookup, no tree walk
const { loggedIn } = ctx.inject(reg => reg.services.auth)

// page — the single active page scope, no ambiguity
const { categoryId } = ctx.inject(reg => reg.page)
```

---

#### Three namespaces

**`reg.components`** — resolves by walking up the DOM tree from the current element. The first ancestor with the requested id wins. Since every component has a unique line of ancestors, this is always unambiguous from the child's point of view. Siblings of the same type don't interfere — only the direct line upward matters.

```ts
ctx.inject(reg => reg.components.app)            // walks up → finds <app>
ctx.inject(reg => reg.components['product-list']) // walks up → finds nearest <product-list>
```

**`reg.services`** — resolves by direct id lookup against a flat `serviceTable`. No tree walk. Services are global singletons — there is no hierarchy to traverse.

```ts
ctx.inject(reg => reg.services.auth)
ctx.inject(reg => reg.services['products-session'])
```

**`reg.page`** — resolves to the single active page scope. No id, no index. From any component's point of view, there is exactly one active page — the leaf route currently mounted. The dev does not need to know how many layout levels exist above.

```ts
ctx.inject(reg => reg.page)   // always the active leaf page scope
```

---

#### Automatic type registration

`lib.component()`, `lib.root()`, `lib.service()`, and `lib.page()` capture the type of `scope` from the setup return and augment the appropriate registry automatically. No manual type declarations needed.

```ts
// App.tsx — registered automatically into ComponentRegistry
lib.root('app', (ctx) => {
  const cart = signal<Item[]>([])
  function addToCart(item: Item) { ... }

  return {
    scope: { cart, addToCart }
    //      ^— ComponentRegistry['app'] = { cart: Signal<Item[]>, addToCart: fn }
  }
})

// ProductItem.tsx — full type safety, no cast
const { cart, addToCart } = ctx.inject(reg => reg.components.app)
//      ^? Signal<Item[]>   ^? (item: Item) => void
```

---

#### Scope table — internal resolution

Three internal tables back the three namespaces:

```ts
const componentTable = new WeakMap<Element, Record<string, unknown>>()
const serviceTable   = new Map<string, Record<string, unknown>>()
// active page scope tracked by the router — single reference
```

`componentTable` is a `WeakMap` — entries are GC'd automatically when elements unmount. **Entries are created lazily on first inject, not on mount.** Leaf components — those no child ever injects from — are never written to the table.

```
app            → componentTable ✓  (children inject from it)
└── product-list   → componentTable ✓  (children inject from it)
    ├── product-item #1  → never registered
    ├── product-item #2  → never registered
    └── product-item #3  → never registered
```

The first `inject(reg => reg.components.app)` from any `product-item` pays O(depth) for the walk and writes the entry. Every subsequent call from any sibling is O(1) via `WeakMap.get()` — same element, same reference.

**`reg` internals — three Proxies, each with its own resolver:**

```ts
inject<T>(selector: (reg: Reg) => T): T {
  const reg = {
    components: new Proxy({}, { get: (_, id) => this._walkComponents(String(id)) }),
    services:   new Proxy({}, { get: (_, id) => serviceTable.get(String(id)) }),
    page:       router.getActivePageScope()
  }
  return selector(reg)
}
```

Each namespace has exactly the resolution logic it needs — no heuristics, no shared fallback path.

---

#### Naming collisions — resolved at callsite

If a local signal and an injected scope share a name, the dev aliases at the point of destructuring. xzodus never merges scopes automatically.

```ts
lib.component('product-list', (ctx) => {
  const filters = signal([])                                                    // local
  const { filters: sessionFilters } = ctx.inject(reg => reg.services['products-session'])

  return {
    template: <div>{({ filters, sessionFilters }) => ...}</div>
    //                 ^local       ^injected — no collision, dev controls names
  }
})
```

---

### 5. Reactive props — `ctx.props`

Props are declared as `ComponentProp<T>` in the component contract and received via `ctx.props` — a typed Proxy that returns `Signal<T>` for each declared prop.

```tsx
import { ComponentProp, ComponentEvent } from 'xzodus'

type ProductItemContract = {
  name:  ComponentProp<string>
  price: ComponentProp<number>
  badge: ComponentProp<string | undefined>  // optional prop
  'item-added': ComponentEvent<{ id: number, name: string }>
}

lib.component<ProductItemContract>('product-item', (ctx) => {
  const { name, price, badge } = ctx.props
  //      ^? Signal<string>
  //               ^? Signal<number>
  //                      ^? Signal<string | undefined>

  return {
    template: (
      <li>
        <span>{name}</span>
        <span>{price}</span>
        {({ badge }) => badge ? <span class="badge">{badge}</span> : null}
      </li>
    )
  }
})
```

```tsx
// parent — JSX typed from the contract
<product-item name="Apple" price={1.5} />             // ✅
<product-item name="Apple" price={1.5} badge="New" /> // ✅
<product-item name={42} price={1.5} />                // ❌ TS error — name must be string
<product-item price={1.5} />                          // ❌ TS error — name required
```

`ctx.props` is a Proxy — each property access returns the signal lazily. Props are `Computed` values derived from the parent scope. If the parent's data changes, the child's prop updates automatically. The child cannot mutate props — attempting to in dev mode logs an error.

Accessing a key not declared in the contract is a TypeScript error at compile time.

---

### 6. Child functions — inline reactivity

A function passed as a JSX child is the core primitive for inline reactivity. xzodus detects it, creates a reactive scope, and re-executes it when its dependencies change.

The function receives the component's own scope as its argument, with **all signals auto-unwrapped** — no `.value` needed inside the function.

```tsx
// derivation — reacts when count changes
<p>{({ count }) => count * 2}</p>

// conditional — plain JavaScript, reactive automatically
<div>{({ isLoggedIn }) =>
  isLoggedIn ? <dashboard /> : <login-page />
}</div>

// access multiple signals
<p>{({ firstName, lastName }) => `${firstName} ${lastName}`}</p>
```

**Rules:**
- The argument is a Proxy of the component ctx. Signal properties unwrap automatically on read.
- Tracking is automatic — xzodus observes which signals the function reads and re-runs only when those change.
- The function must be pure. Side effects belong in `ctx.observe()`.
- Signals accessed outside the argument (from closure) still require `.value`.

```tsx
// signals from closure still need .value
const extra = signal('hello')
<p>{({ name }) => `${name} ${extra.value}`}</p>
```

---

### 7. Reactive iteration — `ctx.each()`

`ctx.each()` creates an **EachSource** — an object with JSX elements as properties representing the states of the list. The source is declared once; its elements are placed freely anywhere in the template.

```tsx
const products = ctx.each(
  ({ items }) => items,   // selector — reads from ctx, auto-unwrapped
  (p) => p.id             // key — always required, TS error if missing
)

template: (
  <div>
    <products.empty>
      <p class="empty">No products yet</p>
    </products.empty>

    <ul>
      <products.item>
        {(p) => <product-item name={p.name} />}
      </products.item>
    </ul>
  </div>
)
```

**Source elements:**

| Element | Renders when | Child |
|---|---|---|
| `<source.item>` | list has items | `(item, index) => JSX` |
| `<source.empty>` | list is empty | static JSX or `() => JSX` |
| `<source.first>` | list has items | `(item) => JSX` — only first item |
| `<source.last>` | list has items | `(item) => JSX` — only last item |

**Distributed placement** — elements from the same source can appear in different parts of the template:

```tsx
const products = ctx.each(({ items }) => items, p => p.id)

template: (
  <section>
    <header>
      <products.empty><p>No products</p></products.empty>
    </header>
    <main>
      <products.item>{(p) => <product-card name={p.name} />}</products.item>
    </main>
    <footer>
      <products.item>{(p, i) => i === 0 ? <featured-badge /> : null}</products.item>
    </footer>
  </section>
)
```

**Mutation API** — available directly on the source:

```ts
products.add({ id: 4, name: 'Eggs' })
products.remove(2)
products.update(1, { name: 'Green Apple' })
products.set([...newItems])
```

When the selector returns a `Computed`, mutation methods are no-ops. TypeScript reflects this.

**Fine-grained mode** — `{ lookup: true }`:

```tsx
const prices = ctx.each(
  ({ tickers }) => tickers,
  (p) => p.ticker,
  { lookup: true }
)

// update a single item — only its DOM nodes change
prices.update('AAPL', { value: 189.42 })
```

**DOM compatibility:**
`ctx.each` uses comment nodes as start/end anchors internally. Comments are valid in all restricted HTML contexts — `<tbody>`, `<tr>`, `<ul>`, `<select>`, `<dl>`. Tables work correctly.

---

### 8. Async data — `ctx.async()`

`ctx.async()` creates an **AsyncSource** — an object with JSX elements as properties representing the three states of the async operation. The source is declared once; its elements are placed freely anywhere in the template.

```tsx
const user = ctx.async(({ userId }) => fetchUser(userId))

template: (
  <div>
    <user.loading>
      <spinner />
    </user.loading>

    <user.error>
      {(e) => <error-msg message={e.message} />}
    </user.error>

    <user.data>
      {(u) => <user-profile name={u.name} avatar={u.avatar} />}
    </user.data>
  </div>
)
```

**Source elements:**

| Element | Renders when | Child |
|---|---|---|
| `<source.loading>` | promise is pending | static JSX or `() => JSX` |
| `<source.data>` | promise resolved | `(data) => JSX` |
| `<source.error>` | promise rejected | `(error) => JSX` |
| `<source.reloading>` | refetching with stale data visible | static JSX or `() => JSX` |

The selector function receives the ctx with signals auto-unwrapped — the same contract as child functions. When a signal the selector reads changes, the async operation re-runs automatically.

Race conditions are handled automatically — only the result of the most recent call updates state.

**Distributed placement** — the same source, its states placed where the layout needs them:

```tsx
const user = ctx.async(({ userId }) => fetchUser(userId))

template: (
  <div>
    <header>
      <user.loading><skeleton-bar /></user.loading>
      <user.data>{(u) => <h1>{u.name}</h1>}</user.data>
    </header>

    <aside>
      <user.loading><skeleton-avatar /></user.loading>
      <user.data>{(u) => <avatar src={u.avatar} />}</user.data>
    </aside>

    <main>
      <user.error>{(e) => <error-msg message={e.message} />}</user.error>
      <user.data>{(u) => <user-bio text={u.bio} />}</user.data>
    </main>
  </div>
)
```

**Composing sources** — async that resolves a list:

```tsx
const catalog  = ctx.async(({ categoryId }) => fetchProducts(categoryId))
const products = ctx.each(({ catalogData }) => catalogData, p => p.id)

template: (
  <section>
    <catalog.loading><skeleton-list /></catalog.loading>
    <catalog.error>{(e) => <error-banner message={e.message} />}</catalog.error>
    <catalog.data>
      <products.empty><p>No products in this category</p></products.empty>
      <ul>
        <products.item>{(p) => <product-card name={p.name} price={p.price} />}</products.item>
      </ul>
    </catalog.data>
  </section>
)
```

`<catalog.data>` acts as a wrapper — its children only exist when data is available. Inside, `products` operates over that data.

---

### 9. `classList` — dynamic class binding

For dynamic class expressions, use the `classList` attribute — an object where values are signals or booleans. xzodus resolves the final class string reactively.

```tsx
// before — boilerplate computed
const cls = computed(() => added.value ? 'btn btn--done' : 'btn')
<button class={cls}>

// after — declarative, no variable needed
<button classList={{ btn: true, 'btn--done': added }}>
```

Values can be:
- `boolean` — static, evaluated once
- `Signal<boolean>` — reactive, updates the class when the signal changes
- A child function expression is not needed here — `classList` is already reactive.

```tsx
<li classList={{
  'item':         true,
  'item--active': isActive,
  'item--done':   isDone,
}}>
```

---

### 10. State lifecycle — three layers

xzodus has three distinct layers of state, each with a different lifecycle. Understanding which layer owns a piece of state eliminates naming collisions and unexpected behavior.

| Layer | Declared with | Lives until | Scope |
|---|---|---|---|
| **Global** | `lib.service` | App closes | Entire tree via `ctx.inject` |
| **Page** | `lib.page` | User navigates away | Subtree of that route |
| **Component** | `lib.component` / `lib.root` | Component unmounts | Local only |

**The rule:** if state needs to outlive a component but not the entire app, it belongs in a service — not in a page. Pages are ephemeral by design.

```ts
// ✅ correct — session state that survives navigation lives in a service
lib.service('products-session', () => {
  const filters = signal<Filters>({ category: 'all' })
  return { scope: { filters } }
})

// ✅ correct — UI state that resets on each visit lives in the page
lib.page('product-list-page', { path: '/products' }, (ctx) => {
  const scrollPosition = signal(0)   // resets every visit — correct
  return { template: (...) }
})
```

**Naming collisions** are resolved at the inject callsite via destructuring alias. The dev controls the local name — xzodus never merges scopes automatically:

```ts
lib.component('product-list', (ctx) => {
  const filters = signal([])                                                           // local
  const { filters: sessionFilters } = ctx.inject(reg => reg.services['products-session']) // aliased

  // both available in child functions — no collision
  return {
    template: <div>{({ filters, sessionFilters }) => ...}</div>
  }
})
```

---

### 11. DOM refs — `ctx.ref()`

Direct access to DOM elements inside the template. Only valid inside `onMount` or after.

```tsx
lib.component('search-box', (ctx) => {
  ctx.onMount(() => {
    ctx.ref<HTMLInputElement>('input').focus()
  })

  return {
    template: <input x-ref="input" type="text" />
  }
})
```

In dev mode, calling `ctx.ref()` before mount or with an unknown name throws a descriptive error.

---

### 12. Lifecycle

```ts
ctx.onMount(() => {
  // DOM is live, bindings are active
})

ctx.onUnmount(() => {
  // element removed from DOM — clean up timers, listeners, etc.
})
```

---

### 13. Reactivity — `ctx.observe()`

Reactive side effects with explicit signal declaration and automatic cleanup on unmount. No implicit tracking. No manual disposal.

```ts
// single signal — value and prev always available
ctx.observe(cart, (value, prev) => {
  localStorage.setItem('cart', JSON.stringify(value))
})

// multiple signals — array of deps, explicit
ctx.observe([userId, filters], ([id, f], [prevId]) => {
  if (id !== prevId) resetPage()
  refetch(id, f)
})

// conditional reaction — plain if, no special API needed
ctx.observe(cart, (value) => {
  if (value.length === 0) ctx.emit('cart-emptied')
})

// communicate outward explicitly
ctx.observe(status, (value) => {
  if (value === 'error') ctx.emit('fetch-failed', { status: value })
})
```

**Rules:**
- The signal(s) are declared explicitly as the first argument — no implicit tracking.
- `prev` is always the second argument to the callback — no extra setup needed.
- Disposed automatically when the component unmounts — no manual cleanup.
- For communicating outward, call `ctx.emit()` inside the callback. Visibility is a dev decision, not an API decision.
- For user action reactions — call `ctx.emit()` directly from the event handler instead.
- There is no `ctx.effect` or `ctx.when` in xzodus. `ctx.observe` with an `if` covers all cases.

---

### 14. Events — `ctx.emit()` / `ctx.listen()`

Custom events bubble up the DOM naturally. The type system is scoped to the boundary — `lib.page` or `lib.root` — which declares what events it accepts from descendants via `ComponentEvent` in its contract.

**Emitting** — components declare their events with `ComponentEvent<T>` in their contract. `ctx.emit` is typed against those declarations:

```ts
type ProductItemContract = {
  name:  ComponentProp<string>
  'item-added':   ComponentEvent<{ id: number, name: string }>
  'item-removed': ComponentEvent<void>
}

lib.component<ProductItemContract>('product-item', (ctx) => {
  const { name } = ctx.props

  return {
    template: (
      <li>
        <span>{name}</span>
        <button onclick={() =>
          ctx.emit('item-added', { id: 1, name: name.value })  // ✅ typed
        }>Add</button>
      </li>
    )
  }
})
```

**Listening** — the boundary (`lib.page` or `lib.root`) declares which events it accepts from descendants. `ctx.listen` is typed against those declarations:

```ts
type StoreContract = {
  'item-added':   ComponentEvent<{ id: number, name: string }>
  'cart-cleared': ComponentEvent<void>
}

lib.page<StoreContract>('store', { path: '/' }, (ctx) => {
  ctx.listen('item-added', (e) => {
    const { id, name } = e.detail  // ^? { id: number, name: string } — typed
    addToCart({ id, name })
  })

  ctx.listen('cart-cleared', () => {
    resetCart()
  })
})
```

**Boundary scoping** — events are scoped to the nearest boundary in the tree. A `lib.page` catches events from its subtree. If no router is installed, `lib.root` is the boundary. Events do not cross page boundaries.

**Native DOM events** — `ctx.listen` also handles native events with a typed `target` option:

```ts
ctx.listen('resize', (e) => {
  // e is WindowEventMap['resize'] — typed
}, { target: window })

ctx.listen('scroll', (e) => {
  // e is HTMLElementEventMap['scroll'] — typed
}, { target: someElement })
```

**Rules:**
- `ctx.emit` — only events declared in the component's own contract. TypeScript errors on unknown events.
- `ctx.listen` — only events declared in the boundary's contract. TypeScript errors on unknown events.
- Both `ctx.emit` and `ctx.listen` are disposed automatically on unmount.
- `ComponentEvent<void>` — no payload. `ctx.emit('cart-cleared')` accepts no second argument.

---

### 15. Scoped styles

Styles are scoped automatically using a deterministic hash derived from the component name. No Shadow DOM. No style leakage.

```ts
return {
  styles: css`
    li {
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .btn { background: #4f46e5; }
  `
}
```

The `css` tag is `String.raw` — no runtime cost. Scoping happens once at mount time via a 6-character hash (`data-xz-a3f2c1`). All rules are prefixed with the scope attribute. Styles are injected via `Constructable Stylesheets` — zero DOM elements.

```ts
// output in document.adoptedStyleSheets:
// [data-xz-a3f2c1] li { padding: 0.5rem 1rem; ... }
// [data-xz-a3f2c1] .btn { background: #4f46e5; }
```

---

### 16. Scheduling — internal, never exposed

xzodus has an internal priority scheduler. The developer never interacts with it.

| Operation | Priority |
|---|---|
| Event handlers | `INTERACTION` — synchronous |
| DOM updates from signals | `RENDER` — microtask |
| `ctx.effect()`, `ctx.onUnmount()` | `EFFECT` — microtask, after renders |
| `{ lazy: true }` mounts | `IDLE` — `requestIdleCallback` |

The only scheduling-related option exposed to the developer:

```ts
lib.component('analytics-widget', (ctx) => { ... }, { lazy: true })
```

---

## DX design — what the library absorbs

The following patterns required developer boilerplate in v1. xzodus v2 resolves them internally.

| v1 pattern | v2 equivalent | What xzodus absorbs |
|---|---|---|
| `ctx.inject('app')` → `any`, requires cast | `ctx.inject(reg => reg.components.app)` | type inference, string literals, manual declarations |
| `computed(() => a.value ? X : Y)` + variable | `{({ a }) => a ? X : Y}` child fn | computed creation, `.value` access |
| `computed(() => cond ? 'cls-a' : 'cls-b')` + variable | `classList={{ 'cls-a': sig }}` | computed string, `.value` access |
| `lib.repeat()` + `computed` for empty state | `ctx.each()` + `<source.empty>` | computed, conditional wrapping |
| `ctx.async()` signals + computed branches | `ctx.async()` distributed elements | three computed branches, state coordination |
| `ctx.effect(() => { if (cond) ... })` | `ctx.observe(sig, (v) => { if (cond) ... })` | implicit tracking, guard pattern |
| `ctx.effect(() => { ext = sig.value })` | `ctx.observe(sig, (v) => { ext = v })` | implicit tracking, manual disposal risk |
| Separate route config file + component | `lib.page('id', { path }, setup)` | decoupled registration, untyped params |
| Named collision on inject | destructuring alias at callsite | no runtime merge, dev controls names |
| `lib.each()` / `lib.async()` declared outside ctx | `ctx.each()` / `ctx.async()` inside setup | inconsistent lib/ctx boundary |
| `import { lib }` — not tree-shakeable | `import { component, service }` named exports | dead code in bundle |

---

## TypeScript contracts

### `ComponentProp` and `ComponentEvent`

```ts
// nominal types — zero runtime cost
declare const PropBrand:  unique symbol
declare const EventBrand: unique symbol

type ComponentProp<T>  = { readonly [PropBrand]:  T }
type ComponentEvent<T> = { readonly [EventBrand]: T }

// type helpers — used internally by xzodus
type PropsOf<Contract> = {
  [K in keyof Contract as Contract[K] extends ComponentProp<any> ? K : never]:
    Contract[K] extends ComponentProp<infer T> ? T : never
}

type EventsOf<Contract> = {
  [K in keyof Contract as Contract[K] extends ComponentEvent<any> ? K : never]:
    Contract[K] extends ComponentEvent<infer T> ? T : never
}

// ctx.props — Proxy returning Signal<T> per declared ComponentProp
// ctx.emit  — typed against EventsOf<Contract>
// ctx.listen — typed against EventsOf<BoundaryContract> (lib.page or lib.root)
```

### `ctx.inject()` — three registries

```ts
interface ComponentRegistry {}   // augmented by lib.component(), lib.root()
interface ServiceRegistry {}     // augmented by lib.service()

type Reg = {
  components: ComponentRegistry
  services:   ServiceRegistry
  page:       ActivePageScope
}

class Context<Contract = {}> {
  props:   { [K in keyof PropsOf<Contract>]: Signal<PropsOf<Contract>[K]> }

  inject<T>(selector: (reg: Reg) => T): T

  emit<K extends keyof EventsOf<Contract>>(
    event: K,
    ...payload: EventsOf<Contract>[K] extends void ? [] : [EventsOf<Contract>[K]]
  ): void

  listen<K extends keyof EventsOf<BoundaryContract>>(
    event: K,
    handler: (e: CustomEvent<EventsOf<BoundaryContract>[K]>) => void
  ): void

  observe<T>(sig: Signal<T>, cb: (value: T, prev: T | undefined) => void): void
  observe<T extends unknown[]>(sigs: { [K in keyof T]: Signal<T[K]> }, cb: (values: T, prev: T) => void): void
}
```

Usage:

```ts
const { cart }     = ctx.inject(reg => reg.components.app)
const { loggedIn } = ctx.inject(reg => reg.services.auth)
const { categoryId } = ctx.inject(reg => reg.page)
```

### Child function

```ts
// xzodus infers the unwrapped ctx type from the component scope
type ChildFn<Ctx> = (ctx: Unwrap<Ctx>) => JSX.Element | Primitive

// Unwrap converts Signal<T> → T for every key
type Unwrap<T> = { [K in keyof T]: T[K] extends Signal<infer V> ? V : T[K] }
```

### `ctx.each()`

```ts
type EachSource<T> = {
  // JSX elements — placed in template
  item:  (props: { children: (item: T, index: number) => JSX.Element }) => JSX.Element
  empty: (props: { children: JSX.Element | (() => JSX.Element) })       => JSX.Element
  first: (props: { children: (item: T) => JSX.Element })                => JSX.Element
  last:  (props: { children: (item: T) => JSX.Element })                => JSX.Element

  // mutation API — no-ops when source is Computed
  add:    (item: T) => void
  remove: (key: Key) => void
  update: (key: Key, patch: Partial<T>) => void
  set:    (items: T[]) => void
}

function each<T>(
  selector: (ctx: UnwrappedCtx) => T[],
  keyFn: (item: T) => Key,
  options?: { lookup?: boolean }
): EachSource<T>
```

### `ctx.async()`

```ts
type AsyncSource<T> = {
  // JSX elements — placed in template
  loading:   (props: { children: JSX.Element | (() => JSX.Element) })  => JSX.Element
  data:      (props: { children: (data: T) => JSX.Element })           => JSX.Element
  error:     (props: { children: (error: Error) => JSX.Element })      => JSX.Element
  reloading: (props: { children: JSX.Element | (() => JSX.Element) })  => JSX.Element
}

function async<T>(
  fetcher: (ctx: UnwrappedCtx) => Promise<T>
): AsyncSource<T>
```

---

## Public API

```ts
// lib — registration API (outside setup)
import { lib } from 'xzodus'

lib.root('app', setup)
lib.component('counter', setup)
lib.service('auth', setup)
lib.init()

// named exports — tree-shakeable alternative to lib object
import { component, service, root, init } from 'xzodus'

// ctx — instance API (inside setup)
// ctx.each(selector, keyFn, options?)   → EachSource<T>
// ctx.async(fetcher)                    → AsyncSource<T>
// ctx.inject(reg => ...)                → typed scope
// ctx.observe(sig, fn)                  → reactive side effect
// ctx.emit(event, payload)              → typed event
// ctx.listen(event, fn)                 → typed listener
// ctx.props                             → Signal<T> per prop
// ctx.ref(name)                         → DOM element
// ctx.onMount(fn)                       → lifecycle
// ctx.onUnmount(fn)                     → lifecycle
// ctx.router()                          → RouterSource (@xzodus/router)
// ctx.navigate(id, params, options)     → (@xzodus/router)
// ctx.path / ctx.query                  → (@xzodus/router)
// ctx.params                            → (@xzodus/router, lib.page only)
// ctx.guard(on?, fn)                    → (@xzodus/router)
// ctx.redirect(id)                      → (@xzodus/router, inside guard)

// contract types
import { ComponentProp, ComponentEvent } from 'xzodus'

// signals — re-exported from @preact/signals-core
import { signal, computed, batch } from 'xzodus'

// timing utilities — pure functions, usable anywhere
import { debounce, throttle } from 'xzodus'

// styles
import { css } from 'xzodus'

// types
import type {
  Context,
  Signal,
  Computed,
  EachSource,
  AsyncSource,
  EachOptions,
  ComponentRegistry,
  ServiceRegistry,
  ComponentProp,
  ComponentEvent
} from 'xzodus'
```

**lib vs ctx — the rule:**
`lib.*` registers something global and runs outside the setup function. `ctx.*` operates inside the setup function and is scoped to the component lifecycle. No exceptions.

**Named exports — tree-shakeable:**

```ts
// lib object — works, but not tree-shakeable by default
import { lib } from 'xzodus'
lib.component(...)

// named exports — fully tree-shakeable, /*@__PURE__*/ annotated internally
import { component, service, root, init } from 'xzodus'
component(...)
```

Both styles are valid. Named exports are preferred for bundle-size-sensitive apps.

**Renamed in public API:**
- `lib.define()` → `lib.component()` — more explicit about what it registers
- `lib.each()` → `ctx.each()` — lives inside setup, scoped to component lifecycle
- `lib.async()` → `ctx.async()` — lives inside setup, scoped to component lifecycle
- `lib.router()` → `ctx.router()` — lives inside setup, scoped to component lifecycle

**Removed from public API:**
- `lib.repeat()` — replaced by `ctx.each()` with distributed elements
- `ctx.effect()` — replaced by `ctx.observe()`

**Not part of the public API:**
- `xzodus/dom` — compiler runtime, called by the Babel plugin, not by developers
- The internal scheduler
- `mapArray` — internal to `ctx.each`

```ts
// @xzodus/router — client-side routing
import { lib } from 'xzodus'

// page declaration — id always first, path in options
lib.page('home',             { path: '/' },             setup)
lib.page('product-list',     { path: '/products' },     setup)
lib.page('product-detail',   { path: '/products/:id' }, setup)
lib.page('settings-layout',  { path: '/settings' },     setup)
lib.page('settings-profile', { path: '/settings/profile' }, setup)
lib.page('not-found',        { path: '*' },             setup)

// lazy loading — opt-in per page
lib.page('analytics', { path: '/analytics', lazy: true }, setup)

// in any setup — router source from ctx
const router = ctx.router()          // RouterSource — call once in setup
<router.outlet />                    // place in template
<router.pending><spinner /></router.pending>

// in lib.page setup — params typed from the path
ctx.params   // { id: string } for '/products/:id' — only in lib.page

// navigation — directly on ctx, no inject needed
ctx.navigate('product-detail', { id: '42' })   // ✅ typed
ctx.navigate('product-detail')                 // ❌ TS error — missing params
ctx.navigate('foo')                            // ❌ TS error — unknown id
ctx.navigate('home', {}, { replace: true })    // replace history entry
ctx.path                                       // Signal<string> — reactive
ctx.query                                      // Signal<URLSearchParams> — reactive

// guards — declared inside lib.page setup
ctx.guard(async () => { ... })                 // enter guard (default)
ctx.guard('leave', async () => { ... })        // leave guard
ctx.redirect('login')                          // use inside guard fn

// links — all <a href="..."> intercepted automatically
<a href="/products">Products</a>

// types
import type { RouteRegistry, RouterSource, GuardFn } from '@xzodus/router'
```

**Renamed in public API:**
- `lib.define()` → `lib.component()` — more explicit about what it registers

**Removed from public API (v1 → v2):**
- `lib.repeat()` — replaced by `ctx.each()` with distributed elements
- `ctx.async()` — replaced by `ctx.async()` with distributed elements
- `ctx.effect()` — replaced by `ctx.observe()`

**Not part of the public API:**
- `xzodus/dom` — compiler runtime, called by the Babel plugin, not by developers
- The internal scheduler
- `mapArray` — internal to `ctx.each`

---

## Complete demo — shopping cart

Exercises all features: hierarchy, inject, reactive props via contract types, each, async, conditionals via child functions, classList, typed emit/listen, observe, styles.

```tsx
import { lib, css, signal, ComponentProp, ComponentEvent } from 'xzodus'

// shared types
type Item = { id: number, name: string }

// ─── Contracts ───────────────────────────────────────────────

type AppContract = {
  // events accepted from descendants
  'item-added': ComponentEvent<Item>
}

type ProductItemContract = {
  name: ComponentProp<string>
  id:   ComponentProp<number>
  'item-added': ComponentEvent<Item>
}

// ─── App.tsx ─────────────────────────────────────────────────

lib.root<AppContract>('app', (ctx) => {
  const cart = signal<Item[]>([])

  ctx.listen('item-added', (e) => {
    const item = e.detail   // ^? Item — typed from AppContract
    if (!cart.value.find(i => i.id === item.id))
      cart.value = [...cart.value, item]
  })

  return {
    scope: { cart },
    template: (
      <div class="app">
        <h1>Store</h1>
        <product-list />
        <cart-summary />
      </div>
    ),
    styles: css`
      .app { max-width: 800px; margin: 0 auto; padding: 1rem; font-family: system-ui; }
    `
  }
})

// ─── ProductList.tsx ──────────────────────────────────────────

lib.component('product-list', (ctx) => {
  const items = signal<Item[]>([
    { id: 1, name: 'Apple' },
    { id: 2, name: 'Bread' },
    { id: 3, name: 'Milk'  },
  ])

  const products = ctx.each(({ items }) => items, p => p.id)

  return {
    template: (
      <div>
        <products.empty>
          <p class="empty">No products</p>
        </products.empty>

        <ul>
          <products.item>
            {(p) => <product-item name={p.name} id={p.id} />}
          </products.item>
        </ul>

        <button onclick={() => products.add({ id: Date.now(), name: 'New Item' })}>
          Add product
        </button>
      </div>
    ),
    styles: css`
      ul { list-style: none; padding: 0; }
      button { background: #4f46e5; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer; }
      .empty { color: #9ca3af; font-style: italic; }
    `
  }
})

// ─── ProductItem.tsx ──────────────────────────────────────────

lib.component<ProductItemContract>('product-item', (ctx) => {
  const { name, id } = ctx.props
  //      ^? Signal<string>  ^? Signal<number>

  const added = signal(false)

  return {
    template: (
      <li>
        <span>{name}</span>
        <button
          classList={{ btn: true, 'btn--done': added }}
          onclick={() => {
            ctx.emit('item-added', { id: id.value, name: name.value })
            added.value = true
          }}
        >
          {({ added }) => added ? '✓ Added' : 'Add'}
        </button>
      </li>
    ),
    styles: css`
      li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid #e5e7eb; }
      .btn { background: #4f46e5; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.75rem; cursor: pointer; }
      .btn--done { background: #16a34a; }
    `
  }
})

// ─── CartSummary.tsx ──────────────────────────────────────────

lib.component('cart-summary', (ctx) => {
  const { cart } = ctx.inject(reg => reg.components.app)

  const cartItems = ctx.each(({ cart }) => cart, i => i.id)

  ctx.observe(cart, (value) => {
    if (value.length === 0) console.log('cart emptied')
  })

  return {
    template: (
      <div class="cart">
        <h2>Cart ({({ cart }) => `${cart.length} item${cart.length !== 1 ? 's' : ''}`})</h2>

        <cartItems.empty>
          <p class="empty">Your cart is empty</p>
        </cartItems.empty>

        <ul>
          <cartItems.item>
            {(i) => <li>{i.name}</li>}
          </cartItems.item>
        </ul>
      </div>
    ),
    styles: css`
      .cart { border-top: 2px solid #e5e7eb; padding-top: 1rem; margin-top: 2rem; }
      .empty { color: #9ca3af; font-style: italic; }
      ul { list-style: none; padding: 0; }
    `
  }
})
```

### `main.ts`
```ts
import { lib } from 'xzodus'

import './components/App'
import './components/ProductList'
import './components/ProductItem'
import './components/CartSummary'

if (import.meta.env.DEV) {
  const { devtools } = await import('@xzodus/devtools')
  devtools.attach(lib, { panel: true })
}

lib.init()
```

### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>xzodus</title></head>
<body>
  <app></app>
  <script type="module" src="./src/main.ts"></script>
</body>
</html>
```

---

---

## `@xzodus/router`

Client-side routing as a first-class xzodus package. Routes are declared with `lib.page()` — the same pattern as `lib.component()` and `lib.service()`. Every registerable unit has an explicit id.

### Identity contract — id always first

All registration functions follow the same signature: **id first, then config, then setup**.

```ts
lib.root('app', setup)                                        // id, setup
lib.component('product-list', setup)                            // id, setup
lib.service('auth', setup)                                   // id, setup
lib.page('product-detail', { path: '/products/:id' }, setup) // id, path config, setup
```

The id is the key in `ComponentRegistry`. It is what `ctx.inject()`, devtools, error messages, and TypeScript use to identify the component. The path is routing config — separate from identity.

### `lib.page()` — declaring a page

```ts
lib.page('home',           { path: '/' },                    (ctx) => { ... })
lib.page('product-list',   { path: '/products' },            (ctx) => { ... })
lib.page('product-detail', { path: '/products/:id' },        (ctx) => { ... })
lib.page('not-found',      { path: '*' },                    (ctx) => { ... })

// lazy — loaded on demand, not in the initial bundle
lib.page('analytics',      { path: '/analytics', lazy: true }, (ctx) => { ... })
```

`lib.page` augments both `ComponentRegistry` (for `ctx.inject`) and `RouteRegistry` (for typed navigation).

### `ctx.router()` — the outlet

`ctx.router()` is called once in the setup function. It returns a `RouterSource` — an object with JSX elements as properties, following the same pattern as `ctx.each()` and `ctx.async()`. Place `<router.outlet />` in the template wherever the active page should render.

```tsx
// App — top-level outlet
lib.root('app', (ctx) => {
  const router = ctx.router()

  return {
    template: (
      <div class="app">
        <nav-bar />
        <router.pending><spinner /></router.pending>
        <router.outlet />
      </div>
    )
  }
})

// settings-layout — nested outlet for /settings/*
lib.page('settings-layout', { path: '/settings' }, (ctx) => {
  const router = ctx.router()

  return {
    template: (
      <div class="settings">
        <settings-nav />
        <router.outlet />
      </div>
    )
  }
})

lib.page('settings-profile', { path: '/settings/profile' }, (ctx) => { ... })
lib.page('settings-billing', { path: '/settings/billing' }, (ctx) => { ... })
```

xzodus infers nesting from paths — `/settings/profile` is a child of `/settings` because a `lib.page('settings-layout')` with `<router.outlet />` exists. No explicit parent declaration needed.

**`RouterSource` type:**

```ts
type RouterSource = {
  outlet:  (props: {}) => JSX.Element
  pending: (props: { children: JSX.Element | (() => JSX.Element) }) => JSX.Element
  error:   (props: { children: (e: Error) => JSX.Element }) => JSX.Element
}
```

### `ctx.params` — typed route params

Only available inside `lib.page` setup functions. TypeScript infers the type from the path string.

```ts
lib.page('product-detail', { path: '/products/:id' }, (ctx) => {
  const { id } = ctx.params
  //      ^? string — inferred from '/products/:id'

  const product = ctx.async(({ id }) => fetchProduct(id))

  return {
    template: (
      <div>
        <product.loading><spinner /></product.loading>
        <product.data>{(p) => <product-view name={p.name} />}</product.data>
      </div>
    )
  }
})
```

`ctx.params` does not exist on `lib.component` — TypeScript will error if accessed there.

### Navigation — `ctx.navigate`

Navigation primitives live directly on `ctx` — no inject needed.

```ts
// navigate by page id — TypeScript validates params
ctx.navigate('product-detail', { id: '42' })   // ✅
ctx.navigate('product-detail', { id: 42 })     // ❌ TS error — id must be string
ctx.navigate('product-detail')                 // ❌ TS error — params required
ctx.navigate('foo')                            // ❌ TS error — id not in RouteRegistry

// with replace — no new history entry
ctx.navigate('home', {}, { replace: true })

// declarative links — all <a> elements intercepted automatically
<a href="/products">Products</a>
<a href={`/products/${id}`}>View</a>
```

`ctx.path` and `ctx.query` are `Signal<string>` and `Signal<URLSearchParams>` — reactive, readable anywhere in any component.

---

### Guards — `ctx.guard()`

`ctx.guard()` intercepts navigation before entering or leaving a page. Declared inside the page setup. Two overloads:

```ts
// enter guard — runs before this page mounts (default)
ctx.guard(async () => {
  const { loggedIn } = ctx.inject(reg => reg.services.auth)
  if (!loggedIn.value) return ctx.redirect('login')
  return true
})

// leave guard — runs before this page unmounts
ctx.guard('leave', async () => {
  if (!dirty.value) return true
  return confirm('Unsaved changes. Leave anyway?')
})

// explicit enter — same as default
ctx.guard('enter', async () => { ... })
```

**Return values:**
- `true` — allow navigation
- `false` — cancel navigation
- `ctx.redirect('page-id')` — cancel and redirect to another page

**Rules:**
- A page can have multiple guards — all must return `true` to allow navigation
- Guards are async — await any async operation needed (auth check, save confirmation, etc.)
- `ctx.guard` is a no-op if `@xzodus/router` is not installed — TypeScript marks it as optional

**TypeScript contract:**

```ts
type GuardResult =
  | true
  | false
  | { redirect: string }

type GuardFn = () => Promise<GuardResult> | GuardResult

class Context {
  guard(fn: GuardFn): void                      // enter by default
  guard(on: 'enter' | 'leave', fn: GuardFn): void
  redirect(pageId: keyof RouteRegistry): { redirect: string }
}
```

---

### State and routing

Pages are ephemeral — they mount when the user arrives and unmount when they leave. UI state inside a `lib.page` resets on every visit. State that needs to survive navigation belongs in a `lib.service`.

```ts
// ✅ session state — survives navigation, lives in service
lib.service('products-session', () => {
  const filters = signal<Filters>({ category: 'all' })
  return { scope: { filters } }
})

// ✅ UI state — resets on each visit, lives in page
lib.page('product-list', { path: '/products' }, (ctx) => {
  const { filters } = ctx.inject(reg => reg['products-session'])
  const scrollY = signal(0)   // ephemeral — resets every visit
  return { template: (...) }
})
```

### TypeScript contracts

```ts
// RouteRegistry — augmented automatically by lib.page()
interface RouteRegistry {}
// after lib.page('product-detail', { path: '/products/:id' }, ...):
// RouteRegistry['product-detail'] = { id: string }

// ctx.navigate — typed against RouteRegistry
class Context {
  navigate<K extends keyof RouteRegistry>(
    id: K,
    ...params: RouteRegistry[K] extends Record<string, never>
      ? [params?: {}, options?: { replace?: boolean }]
      : [params: RouteRegistry[K], options?: { replace?: boolean }]
  ): void

  path:   Signal<string>           // current pathname — reactive
  query:  Signal<URLSearchParams>  // current query string — reactive
  params: ParamsOf<ActiveRoute>    // current route params — only in lib.page

  router(): RouterSource           // outlet — call once in setup
  guard(fn: GuardFn): void
  guard(on: 'enter' | 'leave', fn: GuardFn): void
  redirect(id: keyof RouteRegistry): { redirect: string }
}

// ctx.router(), ctx.navigate, ctx.path, ctx.query, ctx.guard, ctx.redirect
// are available in lib.root, lib.component, lib.page
// ctx.params is only available in lib.page — TypeScript error if accessed elsewhere
```

---

## `@xzodus/devtools`

Dev-only package. Zero bytes in production.

### Features
- Contextual errors with Rust-style hints: **where**, **why**, **what to do**
- Fuzzy matching for typos in component ids and inject keys
- `performance.mark/measure` integration — visible in the browser Performance tab
- Source tracking — devtools knows which `ctx.async` / `ctx.each` source is active per element
- Route tracking — active route, navigation history, params per page
- Panel overlay with four tabs:
  - **Component tree** — live hierarchy with signal values and state layer indicators
  - **Event log** — all `ctx.emit()` calls with payload
  - **Async tracking** — status and duration of all `ctx.async()` sources
  - **Performance** — mount times and re-render counts per component

### Usage
```ts
if (import.meta.env.DEV) {
  const { devtools } = await import('@xzodus/devtools')
  devtools.attach(lib, { panel: true })
}
```

### Error format
```
[xzodus] InjectNotFoundError — "addToCart" not found in ancestor scopes

  ✘ Searched from:
      product-item → product-list → app (root)

  ✘ Available in each ancestor:
      product-list: { products }
      app:          { cart, addToCart }

  ✦ Hint: "addToCart" exists in "app". You may have a typo.
          Try: ctx.inject(reg => reg.components.app) to target that ancestor explicitly.
```

---

## `@xzodus/markdown`

SSG package for blogs and documentation sites.

### Features
- File-based routing — folder structure = URL structure
- Frontmatter (title, date, slug, description, tags, draft, layout)
- Layouts as xzodus components — full reactivity available
- Syntax highlighting via Shiki — zero client runtime
- `x-html` directive for injecting pre-rendered HTML safely
- Sitemap generation

### Usage
```ts
// xzodus.config.ts
import { defineConfig } from '@xzodus/markdown'

export default defineConfig({
  content:       './content',
  layouts:       './layouts',
  output:        './dist',
  defaultLayout: 'docs',
  markdown: {
    highlight: { theme: 'catppuccin-mocha', langs: ['ts', 'html', 'css'] }
  },
  site: { base: 'https://xzodus.dev', sitemap: true }
})
```

---

## Implementation order

Each step is a vertical slice — a working, testable unit before moving to the next.

### Step 1 — DOM runtime (`xzodus/dom`)
`template.ts` → `insert.ts` → `events.ts` → `spread.ts` → `component.ts` → `dom/index.ts`

Goal: the compiler can call these functions and produce working DOM.

### Step 2 — Styles
`styles.ts` — `scopeHash()`, CSS scoping, Constructable Stylesheets injection.

### Step 3 — Scheduler
`scheduler.ts` — Priority queue, `queueMicrotask`, `requestIdleCallback`. Internal only.

### Step 4 — Scope table
`scope-table.ts` — `scopeTable: WeakMap<Element, Scope>`, `serviceTable: Map<string, Scope>`. Internal only. Lazy registration on first inject. GC-safe via WeakMap.

### Step 5 — Context
`context.ts` — `Context` class, `inject()` with three-namespace `_reg` + `_walkComponents()` + `serviceTable` lookup + active page resolver, `ref()`, `emit()`, `listen()`, `observe()`, `onMount()`, `onUnmount()`.

### Step 6 — Lib core
`lib.ts` — `component()`, `root()`, `service()`, `init()`, Custom Elements registration, singleton guard, automatic `ComponentRegistry` augmentation from setup return type. `PropsOf` / `EventsOf` type helpers. `JSX.IntrinsicElements` augmentation from `ComponentProp` contract.

### Step 7 — List reconciliation
`map-array.ts` — `mapArray()` implementation over `@preact/signals-core`.

### Step 8 — `ctx.each()`
`source-each.ts` — `EachSource`, distributed JSX elements (`item`, `empty`, `first`, `last`), mutation API, comment anchors, `lookup` Proxy. Registered on `Context` — scoped to component lifecycle, disposed on unmount.

### Step 9 — `ctx.async()`
`source-async.ts` — `AsyncSource`, distributed JSX elements (`loading`, `data`, `error`, `reloading`), race condition guard, ctx selector with auto-unwrap. Registered on `Context` — scoped to component lifecycle, disposed on unmount.

### Step 10 — Child functions + `classList`
`insert.ts` — detect function child, create reactive scope, ctx Proxy with auto-unwrap.
`spread.ts` — `classList` attribute handling.

### Step 11 — Timing utilities
`timing.ts` — `debounce(fn, ms)`, `throttle(fn, ms)`. Pure functions, no signals dependency. Exported from public API.

### Step 12 — Public API + tree shaking
`index.ts` — named exports (`component`, `service`, `root`, `init`, `css`, `signal`, `computed`, `batch`, `debounce`, `throttle`, `ComponentProp`, `ComponentEvent`). `lib` object re-exported with `/*@__PURE__*/` annotations for bundler tree shaking. `css` tag as `String.raw`.

### Step 13 — Vite + Babel config
Wire up `babel-plugin-jsx-dom-expressions` with `@rolldown/plugin-babel`.

### Step 14 — `@xzodus/router`
`packages/router/` — `lib.page()`, `RouteRegistry` augmentation, `ctx.router()` returning `RouterSource`, `ctx.params` typed from path, `ctx.navigate()` typed against `RouteRegistry`, `ctx.path` / `ctx.query` signals, `ctx.guard()` with enter/leave + `ctx.redirect()`, History API integration, `<a>` interception, nested outlet resolution from path hierarchy, lazy page loading.

### Step 15 — Demo
Shopping cart with routing exercising all features end to end.

### Step 16 — Devtools
`@xzodus/devtools` — error catalog, source tracking, route tracking, performance marks, panel overlay.

---

## Known limitations — v1

| Limitation | Notes |
|---|---|
| Requires Babel for JSX | `babel-plugin-jsx-dom-expressions` needs Babel. Oxc plugin is a future option. |
| No SSR | Client-only. `@xzodus/markdown` covers SSG. |
| No CSS `@layer` / container queries | CSS scoping handles standard rules and `@media`. Advanced at-rules in v2. |
| No incremental SSG builds | Full rebuild. Incremental in v2. |
| No animations/transitions API | Use CSS transitions or Web Animations API directly. |
| Constructable Stylesheets | All modern browsers. No IE11. |
| `ctx.router()` requires `@xzodus/router` | Not part of core. Install separately. |

---

## Roadmap

**v1 — foundation**
Everything in this document, including `@xzodus/router`.

**v2 — quality**
- Incremental SSG builds
- `@xzodus/vite-plugin` — auto-imports all components/pages/services, generates `.xzo/registry.d.ts` in watch mode, eliminates manual imports and `declare module` from `main.ts`
- PostCSS for CSS scoping (handles all at-rules correctly)
- `@xzodus/language-tools` — VS Code IntelliSense for templates
- Oxc JSX transform (eliminate Babel dependency)
- Route-level data loaders with cache TTL
- `@xzodus/router` scroll restoration and view transitions

**v3 — independence**
- Own signals implementation (eliminate `@preact/signals-core`)
- SSR support
- i18n primitives