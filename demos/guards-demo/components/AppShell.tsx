import { css, lib } from 'xzo'

lib.root('app-shell', (_ctx) => {
  const router = lib.router()

  return {
    template: (
      <div class="app">
        <nav-bar />
        <main class="content">
          <router.outlet />
        </main>
      </div>
    ),
    styles: css`
      :host {
        display: block;
        min-height: 100vh;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }

      .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .content {
        flex: 1;
        padding: 2rem 1.5rem;
        max-width: 56rem;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }
    `,
  }
})
