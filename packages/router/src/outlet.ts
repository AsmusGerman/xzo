import { effect } from '@preact/signals-core'
import { addCleanup, getOwner } from 'xzo'
import type { RouterSource } from './types'
import { path, pageParamsMap, setActiveRouteId } from './state'
import { router } from './router'

function clearRange(start: Comment, end: Comment): void {
    let cursor = start.nextSibling
    while (cursor && cursor !== end) {
        const next = cursor.nextSibling
        cursor.parentNode?.removeChild(cursor)
        cursor = next
    }
}

export function routerFactory(): RouterSource {
    const owner = getOwner()
    const start = document.createComment('[xzo/router outlet]')
    const end = document.createComment('[/xzo/router outlet]')
    let currentElement: Element | null = null
    let currentRouteId: string | null = null

    const dispose = effect(() => {
        const currentPath = path.value

        if (!end.parentNode) return

        const match = router.match(currentPath)

        if (!match) {
            if (currentElement) {
                currentElement.remove()
                currentElement = null
                currentRouteId = null
                setActiveRouteId(null)
            }
            clearRange(start, end)
            return
        }

        if (match.route.id === currentRouteId) return

        if (currentElement) {
            currentElement.remove()
            currentElement = null
        }

        currentRouteId = match.route.id
        setActiveRouteId(match.route.id)
        const el = document.createElement(match.route.tagName)
        pageParamsMap.set(el, match.params)
        end.parentNode.insertBefore(el, end)
        currentElement = el
    })

    if (owner) addCleanup(owner, dispose)

    function outlet(_props?: Record<string, unknown>): Node {
        const frag = document.createDocumentFragment()
        frag.appendChild(start)
        const match = router.match(path.value)
        if (match) {
            currentRouteId = match.route.id
            setActiveRouteId(match.route.id)
            const el = document.createElement(match.route.tagName)
            pageParamsMap.set(el, match.params)
            frag.appendChild(el)
            currentElement = el
        }
        frag.appendChild(end)
        return frag
    }

    function pending(_props?: { children?: unknown }): Node {
        return document.createComment('[xzo/router pending]')
    }

    function error(_props?: { children?: unknown }): Node {
        return document.createComment('[xzo/router error]')
    }

    return { outlet, pending, error }
}