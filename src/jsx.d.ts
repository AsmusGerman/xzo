declare global {
  // Injected by Vite define — true in dev, false in production builds
  const __DEV__: boolean

  /** Augment this interface to register typed JSX for custom elements:
   *  declare global { interface IntrinsicElementsRegistry { 'my-el': PropsOf<MyContract> } }
   */
  interface IntrinsicElementsRegistry {}

  namespace JSX {
    type Element = Node

    interface ElementChildrenAttribute {
      children: unknown
    }

    interface IntrinsicAttributes {
      [name: string]: unknown
    }

    interface IntrinsicElements extends IntrinsicElementsRegistry {
      [name: string]: Record<string, unknown>
    }
  }
}

export {}