import { css, lib } from 'xzo'

lib.page('not-found', { path: '*' }, (_ctx) => {
  return {
    template: (
      <div class="notfound">
        <span class="notfound__code">404</span>
        <h1 class="notfound__title">Page not found</h1>
        <p class="notfound__sub">The route you requested doesn't exist.</p>
        <a href="/login" class="link">← Go to login</a>
      </div>
    ),
    styles: css`
      .notfound {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 1rem;
        text-align: center;
        gap: 0.5rem;
      }

      .notfound__code {
        font-size: 5rem;
        font-weight: 800;
        color: #1e293b;
        line-height: 1;
      }

      .notfound__title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .notfound__sub {
        margin: 0;
        font-size: 0.9rem;
        color: #64748b;
      }

      .link {
        margin-top: 0.5rem;
        color: #38bdf8;
        font-size: 0.875rem;
        text-decoration: none;
      }

      .link:hover { text-decoration: underline; }
    `,
  }
})
