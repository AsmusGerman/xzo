const cache = new Map<string, HTMLTemplateElement>()

function getMarkup(html: string, isSVG: boolean, isMathML: boolean): string {
  if (isSVG) {
    return `<svg>${html}</svg>`
  }

  if (isMathML) {
    return `<math>${html}</math>`
  }

  return html
}

export function template(
  html: string,
  isImportNode = false,
  isSVG = false,
  isMathML = false
): () => Node {
  const key = `${isImportNode}:${isSVG}:${isMathML}:${html}`
  let tpl = cache.get(key)

  if (!tpl) {
    tpl = document.createElement('template')
    tpl.innerHTML = getMarkup(html, isSVG, isMathML)
    cache.set(key, tpl)
  }

  return () => {
    const fragment = tpl.content.cloneNode(true) as DocumentFragment

    if (isSVG || isMathML) {
      const wrapper = fragment.firstChild

      if (!(wrapper instanceof Element)) {
        return fragment
      }

      if (wrapper.childNodes.length === 1) {
        return wrapper.firstChild as Node
      }

      const inner = document.createDocumentFragment()
      while (wrapper.firstChild) {
        inner.appendChild(wrapper.firstChild)
      }
      return inner
    }

    return fragment.childNodes.length === 1 ? (fragment.firstChild as Node) : fragment
  }
}

export function getNextElement(factory?: () => Node): Node {
  return factory ? factory() : document.createComment('xz-next-element')
}

export function getNextMarker(node: Node): [Node, Node | null] {
  return [node, node.nextSibling]
}