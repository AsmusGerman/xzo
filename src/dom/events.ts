const delegated = new Set<string>()

function normalizeEventName(event: string): string {
  return event.toLowerCase()
}

function getEventHandler(node: Element, event: string): EventListener | undefined {
  return (node as unknown as Record<string, EventListener | undefined>)[`$$${event}`]
    ?? (node as unknown as Record<string, EventListener | undefined>)[`__xz_${event}`]
}

function dispatchDelegatedEvent(event: Event): void {
  let node = (event.composedPath?.()[0] ?? event.target) as Node | null

  while (node) {
    if (node instanceof Element) {
      const handler = getEventHandler(node, event.type)
      if (handler) {
        handler(event)
        if (event.cancelBubble) {
          return
        }
      }
      node = node.parentElement
      continue
    }

    node = node.parentNode
  }
}

export function delegateEvents(events: string[]): void {
  for (const event of events) {
    const name = normalizeEventName(event)
    if (delegated.has(name)) {
      continue
    }

    delegated.add(name)
    document.addEventListener(name, dispatchDelegatedEvent)
  }
}

export function addEventListener(
  el: Element,
  event: string,
  handler: EventListener,
  delegate: boolean
): void {
  const name = normalizeEventName(event)

  if (delegate) {
    ;(el as unknown as Record<string, EventListener | undefined>)[`$$${name}`] = handler
    return
  }

  el.addEventListener(name, handler)
}