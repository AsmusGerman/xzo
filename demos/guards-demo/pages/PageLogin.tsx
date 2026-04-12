import { css, lib, signal } from 'xzo'

lib.page('login', { path: '/login' }, (ctx) => {
  const auth = ctx.inject(reg => reg.services.auth)

  // Anti-guard: if the user is already logged in, skip straight to dashboard.
  ctx.guard('enter', () => {
    if (auth.isLoggedIn.value) {
      return ctx.redirect('dashboard')
    }
    return true
  })

  const username = signal('')
  const error = signal('')

  const onSubmit = (e: Event) => {
    e.preventDefault()
    const name = username.value.trim()
    if (!name) {
      error.value = 'Username cannot be empty.'
      return
    }
    auth.login(name)
    void ctx.navigate('dashboard')
  }

  return {
    template: (
      <div class="login-page">
        <div class="card">
          <h1 class="card__title">Sign in</h1>
          <p class="card__sub">
            Try navigating to <code>/dashboard</code> or <code>/settings</code> while
            logged out — the <strong>enter guard</strong> will redirect you back here.
          </p>

          <form class="form" onsubmit={onSubmit}>
            <label class="form__label" for="username">Username</label>
            <input
              id="username"
              class="form__input"
              type="text"
              placeholder="any name works"
              value={username}
              oninput={(e: InputEvent) => {
                username.value = (e.target as HTMLInputElement).value
                error.value = ''
              }}
            />
            {() => error.value && <p class="form__error">{error}</p>}
            <button class="btn btn--primary" type="submit">Log in</button>
          </form>
        </div>
      </div>
    ),
    styles: css`
      .login-page {
        display: flex;
        justify-content: center;
        padding-top: 3rem;
      }

      .card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 1rem;
        padding: 2rem;
        width: 100%;
        max-width: 26rem;
      }

      .card__title {
        margin: 0 0 0.5rem;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .card__sub {
        margin: 0 0 1.5rem;
        font-size: 0.85rem;
        color: #94a3b8;
        line-height: 1.6;
      }

      code {
        font-family: monospace;
        background: #0f172a;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
        font-size: 0.8em;
        color: #38bdf8;
      }

      .form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .form__label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #94a3b8;
      }

      .form__input {
        padding: 0.6rem 0.875rem;
        border-radius: 0.5rem;
        border: 1px solid #475569;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
      }

      .form__input:focus {
        border-color: #38bdf8;
      }

      .form__error {
        margin: 0;
        font-size: 0.8rem;
        color: #f87171;
      }

      .btn {
        padding: 0.6rem 1.25rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        font-size: 0.95rem;
        font-family: inherit;
        font-weight: 600;
        transition: background 0.15s;
      }

      .btn--primary {
        background: #0ea5e9;
        color: #fff;
        margin-top: 0.5rem;
      }

      .btn--primary:hover {
        background: #38bdf8;
      }
    `,
  }
})
