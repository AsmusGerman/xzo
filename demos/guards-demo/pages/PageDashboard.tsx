import { css, lib, signal } from 'xzo'
import type { ComponentProp, ComponentEvent } from 'xzo'

type StatCardContract = {
  label:   ComponentProp<string>
  value:   ComponentProp<string | number>
  trend:   ComponentProp<'up' | 'down' | 'flat'>
  clicked: ComponentEvent<{ label: string }>
}

lib.define<StatCardContract>('stat-card', (ctx) => {
  const { label, value, trend } = ctx.props

  const trendIcon = () =>
    trend.value === 'up' ? '▲' : trend.value === 'down' ? '▼' : '—'

  const trendClass = () => `trend trend--${trend.value}`

  const onClick = () => {
    ctx.emit('clicked', { label: label.value })
  }

  return {
    template: (
      <button class="stat-card" onclick={onClick}>
        <span class="stat-card__label">{label}</span>
        <span class="stat-card__value">{value}</span>
        <span class={trendClass()}>{trendIcon()}</span>
      </button>
    ),
    styles: css`
      .stat-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        padding: 1.25rem 1.5rem;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: border-color 0.15s, transform 0.1s;
        width: 100%;
      }

      .stat-card:hover {
        border-color: #38bdf8;
        transform: translateY(-1px);
      }

      .stat-card__label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .stat-card__value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #e2e8f0;
        line-height: 1;
      }

      .trend {
        font-size: 0.75rem;
        font-weight: 600;
      }

      .trend--up   { color: #4ade80; }
      .trend--down { color: #f87171; }
      .trend--flat { color: #94a3b8; }
    `,
  }
})

lib.page('dashboard', { path: '/dashboard' }, (ctx) => {
  const auth = ctx.inject(reg => reg.services.auth)

  ctx.guard('enter', () => {
    if (!auth.isLoggedIn.value) {
      return ctx.redirect('login')
    }
    return true
  })

  const lastClicked = signal<string | null>(null)

  ctx.listen('clicked', ((e: CustomEvent<{ label: string }>) => {
    lastClicked.value = e.detail.label
  }) as EventListener)

  return {
    template: (
      <div class="dashboard">
        <header class="page-header">
          <h1>Dashboard</h1>
          <p class="page-sub">
            This page is protected by an <strong>enter guard</strong>.
            Log out and try navigating here — you'll be sent to the login page.
          </p>
        </header>

        <div class="stats-grid">
          <stat-card label="Users" value="1,204" trend="up" />
          <stat-card label="Revenue" value="$8,430" trend="up" />
          <stat-card label="Churn" value="2.4%" trend="down" />
          <stat-card label="Uptime" value="99.9%" trend="flat" />
        </div>

        {() => lastClicked.value && (
          <p class="hint">
            You clicked: <strong>{lastClicked}</strong>
            &nbsp;&mdash; events bubble through the shadow-piercing <code>composed</code> flag.
          </p>
        )}

        <p class="hint">
          Head to <a href="/settings" class="link">Settings</a> to see the{' '}
          <strong>leave guard</strong> in action.
        </p>
      </div>
    ),
    styles: css`
      .dashboard {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-header h1 {
        margin: 0 0 0.5rem;
        font-size: 1.75rem;
        font-weight: 700;
      }

      .page-sub {
        margin: 0;
        font-size: 0.875rem;
        color: #94a3b8;
        line-height: 1.6;
        max-width: 40rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
        gap: 1rem;
      }

      .hint {
        font-size: 0.875rem;
        color: #64748b;
        line-height: 1.6;
        margin: 0;
      }

      strong { color: #e2e8f0; }

      code {
        font-family: monospace;
        background: #1e293b;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
        font-size: 0.8em;
        color: #38bdf8;
      }

      .link {
        color: #38bdf8;
        text-decoration: none;
      }

      .link:hover { text-decoration: underline; }
    `,
  }
})
