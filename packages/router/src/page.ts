import type { ComponentFactory, ComponentResult, Context } from 'xzo'
import { lib as xzoLib } from 'xzo'
import type { PathParams } from './types'
import { router } from './router'

function compileSegments(path: string): string[] {
    return path.replace(/^\//, '').split('/').filter(Boolean)
}

export function page<
    Id extends string,
    Path extends string,
>(
    id: Id,
    options: { path: Path; lazy?: boolean },
    factory: (ctx: Context & { params: PathParams<Path> }) => ComponentResult,
): void {
    const entry = { id, path: options.path, tagName: id }
    const segments = compileSegments(options.path)

    router.insert(entry, segments);
    xzoLib.define(id, factory as ComponentFactory);
}