import { css, lib, computed } from 'xzo'

lib.page('home', { path: '/' }, (ctx) => {
  const auth = ctx.inject(reg => reg.services.auth)

  const greeting = computed(() =>
    auth.isLoggedIn.value
      ? `Welcome back, ${auth.user.value}!`
      : 'Welcome to the xzo guards demo.'
  )

  return {
    template: (
      <div class="home">
        <header class="hero">
          <div class="hero__badge">xzo · guards demo</div>
          <h1 class="hero__title">{greeting}</h1>
          <p class="hero__sub">
            This demo exercises the full routing and guard API: enter guards,
            leave guards, redirects, typed component contracts, and the
            <code>debounce()</code> utility.
          </p>
        </header>

        <ul class="feature-list">
          <li class="feature">
            <span class="feature__icon">🔐</span>
            <div>
              <strong>Enter guard</strong>
              <p>
                <a class="link" href="/dashboard">Dashboard</a> and{' '}
                <a class="link" href="/settings">Settings</a> redirect to{' '}
                <a class="link" href="/login">Login</a> when you're not signed in.
              </p>
            </div>
          </li>
          <li class="feature">
            <span class="feature__icon">🚪</span>
            <div>
              <strong>Leave guard</strong>
              <p>
                Make a change on <a class="link" href="/settings">Settings</a>{' '}
                without saving, then try navigating away — a confirmation dialog blocks you.
              </p>
            </div>
          </li>
          <li class="feature">
            <span class="feature__icon">↩️</span>
            <div>
              <strong>Anti-guard (redirect on enter)</strong>
              <p>
                Visit <a class="link" href="/login">Login</a> while already
                signed in and you'll be redirected straight to the dashboard.
              </p>
            </div>
          </li>
          <li class="feature">
            <span class="feature__icon">🧩</span>
            <div>
              <strong>Typed component contracts</strong>
              <p>
                <code>stat-card</code> and <code>toggle-switch</code> use
                <code>lib.define&lt;Contract&gt;()</code> with{' '}
                <code>ComponentProp</code> / <code>ComponentEvent</code> brands.
              </p>
            </div>
          </li>
        </ul>

        <div class="cta">
          {() => auth.isLoggedIn.value
            ? <a href="/dashboard" class="btn btn--primary">Go to Dashboard →</a>
            : <a href="/login" class="btn btn--primary">Sign in to continue →</a>
          }
        </div>
      </div>
    ),
    styles: css`
      .home {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .hero__badge {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #38bdf8;
        margin-bottom: 0.75rem;
      }

      .hero__title {
        margin: 0 0 0.75rem;
        font-size: clamp(1.75rem, 4vw, 2.5rem);
        font-weight: 700;
        line-height: 1.1;
      }

      .hero__sub {
        margin: 0;
        font-size: 0.95rem;
        color: #94a3b8;
        line-height: 1.7;
        max-width: 38rem;
      }

      code {
        font-family: monospace;
        background: #1e293b;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
        font-size: 0.85em;
        color: #38bdf8;
      }

      .feature-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .feature {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
      }

      .feature__icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 0.1rem;
      }

      .feature strong {
        display: block;
        font-size: 0.9rem;
        color: #e2e8f0;
        margin-bottom: 0.2rem;
      }

      .feature p {
        margin: 0;
        font-size: 0.85rem;
        color: #94a3b8;
        line-height: 1.6;
      }

      .link {
        color: #38bdf8;
        text-decoration: none;
      }

      .link:hover { text-decoration: underline; }

      .cta {
        display: flex;
      }

      .btn {
        display: inline-block;
        padding: 0.65rem 1.5rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        font-size: 0.95rem;
        font-family: inherit;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.15s;
      }

      .btn--primary {
        background: #0ea5e9;
        color: #fff;
      }

      .btn--primary:hover {
        background: #38bdf8;
      }
    `,
  }
})
