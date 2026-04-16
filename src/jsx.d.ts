declare global {
  // Injected by Vite define — true in dev, false in production builds
  const __DEV__: boolean

  namespace JSX {
    type Element = Node

    interface ElementChildrenAttribute {
      children: unknown
    }

    interface IntrinsicAttributes {
      [name: string]: unknown
    }

    interface IntrinsicElements {
      [name: string]: Record<string, unknown>
    }
  }
}

export {}