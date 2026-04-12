import { css, lib, computed } from 'xzo'

lib.define('nav-bar', (ctx) => {
  const auth = ctx.inject(reg => reg.services.auth)

  const userLabel = computed(() =>
    auth.isLoggedIn.value ? `Signed in as ${auth.user.value}` : 'Not signed in'
  )

  const onLogout = () => {
    auth.logout()
    void ctx.navigate('login')
  }

  return {
    template: (
      <nav class="nav">
        <div class="nav__brand">
          <span class="nav__logo">xzo</span>
          <span class="nav__tagline">guards demo</span>
        </div>

        <div class="nav__links">
          <a href="/" class="nav__link">Home</a>
          <a href="/dashboard" class="nav__link">Dashboard</a>
          <a href="/settings" class="nav__link">Settings</a>
        </div>

        <div class="nav__user">
          <span class="nav__user-label">{userLabel}</span>
          {() => auth.isLoggedIn.value && (
            <button class="btn btn--ghost" onclick={onLogout}>Log out</button>
          )}
        </div>
      </nav>
    ),
    styles: css`
      :host {
        display: block;
      }

      .nav {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.75rem 1.5rem;
        background: #1e293b;
        border-bottom: 1px solid #334155;
      }

      .nav__brand {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-right: auto;
      }

      .nav__logo {
        font-weight: 700;
        font-size: 1.1rem;
        color: #38bdf8;
        letter-spacing: -0.02em;
      }

      .nav__tagline {
        font-size: 0.75rem;
        color: #64748b;
      }

      .nav__links {
        display: flex;
        gap: 0.25rem;
      }

      .nav__link {
        padding: 0.35rem 0.75rem;
        border-radius: 0.4rem;
        color: #94a3b8;
        text-decoration: none;
        font-size: 0.875rem;
        transition: background 0.15s, color 0.15s;
      }

      .nav__link:hover {
        background: #334155;
        color: #e2e8f0;
      }

      .nav__user {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .nav__user-label {
        font-size: 0.8rem;
        color: #64748b;
      }

      .btn {
        padding: 0.35rem 0.9rem;
        border-radius: 0.4rem;
        border: none;
        cursor: pointer;
        font-size: 0.8rem;
        font-family: inherit;
        transition: background 0.15s;
      }

      .btn--ghost {
        background: transparent;
        border: 1px solid #475569;
        color: #94a3b8;
      }

      .btn--ghost:hover {
        background: #334155;
        color: #e2e8f0;
      }
    `,
  }
})
