declare global {
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