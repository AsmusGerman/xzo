export function createComponent<T>(component: (props: T) => unknown, props: T): unknown {
  return component(props)
}