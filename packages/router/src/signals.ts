// TODO: use xzo/signals instead of @preact/signals-core when it is ready
import { router } from './router'
import { activeRouteId, path, query } from './state'
import { routeEnterGuards, routeLeaveGuards, runGuards } from './guards'

export function navigateByUrl(url: string, replace = false): void {
    if (replace) {
        history.replaceState(null, '', url)
    } else {
        history.pushState(null, '', url)
    }
    path.value = location.pathname
    query.value = new URLSearchParams(location.search)
}

export async function navigate(
    id: string,
    params?: Record<string, string>,
    opts?: { replace?: boolean },
): Promise<void> {
    const route = router.getById(id)

    if (!route) {
        if (__DEV__) throw new Error(
            `[xzo/router] navigate() — unknown route id "${id}". ` +
            `Registered: ${router.registeredIds().join(', ')}`
        )
        return
    }

    // build URL from path template
    let url = route.path
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, encodeURIComponent(value))
        }
    }

    // leave guards for current page
    if (activeRouteId) {
        const leaveResult = await runGuards(routeLeaveGuards.get(activeRouteId))
        if (leaveResult.cancel) {
            if (leaveResult.redirect) return navigate(leaveResult.redirect)
            return
        }
    }

    // enter guards for target page
    const enterResult = await runGuards(routeEnterGuards.get(id))
    if (enterResult.cancel) {
        if (enterResult.redirect) return navigate(enterResult.redirect)
        return
    }

    navigateByUrl(url, opts?.replace)
}