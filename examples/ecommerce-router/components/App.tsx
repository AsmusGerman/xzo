import { css, lib } from 'xzo'
import '@xzo/router'

lib.root('app', (ctx) => {
  const logger = ctx.inject(reg => reg.services.logger);
  const router = lib.router()

  const logs = lib.each(() => logger.entries.value, (entry) => entry.id)

  return {
    template: (
      <div class="app-shell">
        <header class="hero">
          <p class="eyebrow">xzo</p>
          <h1>Storefront Demo</h1>
          <p class="intro">
            Fine-grained JSX, scoped styles, context injection, keyed iteration,
            async data, custom events, lifecycle hooks, and services — all without a VDOM.
          </p>
        </header>

        <router.outlet />

        <aside class="panel panel--log">
          <h3>Activity Log <span class="log-badge">lib.service</span></h3>
          <logs.empty>
            <p class="empty">No activity yet.</p>
          </logs.empty>
          <ul class="log-list">
            <logs.each>{(entry) => <li class="log-entry">{entry.text}</li>}</logs.each>
          </ul>
        </aside>
      </div>
    ),
    styles: css`
      .app-shell {
        min-height: 100vh;
        padding: 3rem 1.5rem;
        color: #0f172a;
        background:
          radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 28%),
          linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
      }

      .hero {
        max-width: 56rem;
        margin: 0 auto 2rem;
      }

      .eyebrow {
        margin: 0 0 0.75rem;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #0369a1;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        line-height: 0.95;
      }

      .intro {
        max-width: 42rem;
        margin: 1rem 0 0;
        font-size: 1.05rem;
        line-height: 1.7;
        color: #334155;
      }

      .panel--log {
        backdrop-filter: blur(18px);
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 1.5rem;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
        max-width: 72rem;
        margin: 1.5rem auto 0;
        padding: 1.25rem;
      }

      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .log-badge {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
      }

      .log-list {
        display: grid;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        list-style: none;
        max-height: 10rem;
        overflow-y: auto;
      }

      .log-entry {
        font-size: 0.8rem;
        font-family: "Courier New", monospace;
        color: #475569;
        padding: 0.2rem 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      }

      .empty {
        color: #64748b;
        font-style: italic;
        margin: 0;
      }
    `,
  }
})
