import type { MatchResult, RouteEntry, TrieNode } from "./types";


/** 
 * @internal
 * A trie-based router implementation that efficiently matches pathnames to registered routes.
 * The router maintains a trie data structure where each node represents a segment of the path.
 * 
 * All methods are synchronous by design — trie traversal is pure in-memory
 * computation with no I/O, and completes in microseconds even with hundreds
 * of routes.
 */
export class Router {
    // The root of the trie data structure that will hold all the routes
    private root: TrieNode = Router.createNode();
    private registry = new Map<string, RouteEntry>()

    private static createNode(): TrieNode {
        return { children: new Map(), paramChild: null, route: null, wildCardRoute: null }
    }

    /**
     * Inserts a route into the trie based on its path segments.
     * @param route The route entry to insert.
     * @param segments The segments of the route's path.
     * 
     * @example
     * router.insert({ id: 'product', path: '/products/:id', tagName: 'product' }, ['products', ':id'])
     * router.insert({ id: 'about',   path: '/about',        tagName: 'about'   }, ['about'])
     */
    insert(route: RouteEntry, segments: string[]): void {

        if (__DEV__ && this.registry.has(route.id)) {
            throw new Error(
                `[xzo/router] Duplicate route id "${route.id}"`,
            )
        }

        this.registry.set(route.id, route);

        // start from the root
        let node = this.root;

        for (const segment of segments) {
            // segment is wildcard,
            // store the route in the current node and stop processing further segments
            if (segment === '*') {
                node.wildCardRoute = route;
                return;
            }

            // segment is dynamic,
            // store the param name and move to the param child node
            if (segment.startsWith(':')) {
                if (!node.paramChild) {
                    // create a new param child node if it doesn't exist
                    node.paramChild = { name: segment.slice(1), node: Router.createNode() };
                } else if (__DEV__ && node.paramChild.name !== segment.slice(1)) {
                    throw new Error(
                        `[xzo/router] Route conflict: dynamic segment name mismatch. ` +
                        `":${node.paramChild.name}", already exists on this level`
                    );
                }
                node = node.paramChild.node;
            } else {
                // segment is static,
                // move to the child node corresponding to the segment, creating it if necessary
                if (!node.children.has(segment)) {
                    node.children.set(segment, Router.createNode());
                }

                // get the child for the current segment and move to it
                const child = node.children.get(segment);
                if (!child) {
                    throw new Error(`[xzo/router] Unexpected error: child node for segment "${segment}" should exist`);
                }

                node = child;
            }
        }

        if (__DEV__ && node.route !== null) {
            throw new Error(
                `[xzo/router] Route conflict: route with path "${route.path}" already exists. ` +
                `Existing route path: "${node.route!.path}"`
            );
        }

        node.route = route;
    }

    /**
     * Matches a given pathname against the registered routes in the trie.
     * @param pathname The pathname to match (e.g. "/products/123").
     * @returns The match result containing the matched route and extracted params, or null if no match is found.
     * 
     * @example
     * router.match('/about')
     * // → { route: { id: 'about', ... }, params: {} }
     *
     * @example
     * router.match('/products/42/edit')
     * // → { route: { id: 'product-edit', ... }, params: { id: '42' } }
     *
     * @example
     * router.match('/does-not-exist')
     * // → null
     */
    match(pathname: string): MatchResult | null {
        // split the pathname into segments, ignoring leading and trailing slashes
        const segments = pathname.split('/').filter(Boolean);
        return this.search(this.root, segments, 0, {});
    }

    /**
   * Resolves a route entry by id.
   * Used by navigate() to build the URL without a separate idToPath map.
   *
   * @param id - The route id as registered in lib.page()
   * @returns The route entry, or `undefined` if not found
   *
   * @example
   * router.getById('product-detail')
   * // → { id: 'product-detail', path: '/products/:id', tagName: 'product-detail' }
   *
   * @example
   * router.getById('unknown')
   * // → undefined
   */
    getById(id: string): RouteEntry | undefined {
        return this.registry.get(id)
    }

    /**
    * Returns all registered route ids.
    * Used in dev to provide helpful error messages in navigate().
    *
    * @example
    * router.registeredIds()
    * // → ['home', 'products', 'product-detail', 'about']
    */
    registeredIds(): string[] {
        return Array.from(this.registry.keys())
    }

    /**
     * Recursively searches for a matching route in the trie.
     * @param node The current trie node.
     * @param segments The segments of the path to match.
     * @param index The current index in the segments array.
     * @param params The collected parameters from dynamic segments.
     * @returns The match result if a route is found, otherwise null.
     * 
     * @example
     * // Matching "/users/99/settings":
     * // index=0 → "users"   (static)
     * // index=1 → "99"      (paramChild, params={ id: "99" })
     * // index=2 → "settings"(static)
     * // index=3 → leaf found
     */
    private search(node: TrieNode, segments: string[], index: number, params: Record<string, string>): MatchResult | null {

        // reached the end of the segments to match
        if (index === segments.length) {
            if (node.route) {
                // exact match found, return the route and the collected params
                return { route: node.route, params };
            }
            if (node.wildCardRoute) {
                // route with wildcard match, return it with the params collected so far
                return { route: node.wildCardRoute, params };
            }
            // no more segments to match, but no route found
            return null;
        }

        // get the current segment to match
        const segment = segments[index];

        // try to match a static segment first
        const staticChild = node.children.get(segment);
        if (staticChild) {
            const result = this.search(staticChild, segments, index + 1, params);
            if (result) {
                return result;
            }
        }

        // try to match dynamic segment
        if (node.paramChild) {
            // call recursively to match the rest of the segments,
            // and add the current segment as a param
            const result = this.search(
                node.paramChild.node,
                segments,
                index + 1,
                { ...params, [node.paramChild.name]: segment }
            );
            if (result) {
                return result;
            }
        }

        // try to match wildcard segment
        if (node.wildCardRoute) {
            return { route: node.wildCardRoute, params };
        }

        // no match found for this segment
        return null;
    }
}

export const router = new Router()  // singleton instance used by the rest of the library