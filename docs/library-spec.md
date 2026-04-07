# xzo Library Documentation

## Objective / Aim

xzo aims to provide a signal-driven UI runtime that stays close to web platform primitives:

- No Virtual DOM
- No framework-owned template DSL
- No runtime magic

The library is designed so developers write standard TypeScript + JSX while xzo handles the hard runtime concerns:

- Reactive DOM updates
- Scoped styles
- State propagation through component hierarchy
- Distributed iteration and async rendering

## Vision

The browser is treated as the primary runtime, not an implementation detail to abstract away. xzo builds directly on:

- Custom Elements lifecycle style registration/mount flow
- Native DOM nodes and fragments
- Constructable Stylesheets

## Philosophy

### Explicit over implicit
Only values deliberately exposed through component return fields and `scope` should flow to descendants.

### Closure is the contract
`template` and `styles` are authored in the setup closure, with direct lexical access to component state.

### Library absorbs complexity
List anchoring, reactive insertion, scoped CSS, and async state orchestration are runtime responsibilities.

### Standards-aligned
Prefer stable browser capabilities and avoid polyfill-heavy abstractions.

## Core Concepts

### Component registration
- `lib.define(name, setup)`
- `lib.root(name, setup)` for singleton roots
- `lib.service(name, factory)` for app-wide singleton providers
- `lib.init()` bootstraps scanning/mounting and service initialization

### Context surface
`ctx` provides:

- `inject()` for ancestor/service lookup
- `effect()` for reactive side effects
- `onMount()` / `onUnmount()` lifecycle hooks
- `emit()` / `listen()` event communication
- `ref()` for mounted DOM refs

### Reactive props
Props reaching child components are reactive and readonly from the child perspective.

### Iteration source model
`lib.each()` returns an iteration source with distributed JSX entry points:

- `.each`
- `.empty`
- `.first`
- `.last`

It also exposes mutations (`add/remove/update/set`) for writable sources.

### Async source model
`lib.async()` returns distributed async states:

- `.loading`
- `.data`
- `.error`
- `.reloading`

The implementation is race-safe and only commits the latest request result.

### Child-function conditionals
Function children may be used for inline reactive derivations and conditionals, with an unwrapped context argument when declared.

### Scoped styles
`css` template strings are scoped per component using deterministic hash attributes and injected via `document.adoptedStyleSheets`.