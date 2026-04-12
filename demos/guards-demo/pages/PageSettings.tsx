import { css, lib, signal, computed } from 'xzo'
import type { ComponentProp, ComponentEvent } from 'xzo'
import { debounce } from 'xzo'

type ToggleContract = {
  label:   ComponentProp<string>
  checked: ComponentProp<boolean>
  change:  ComponentEvent<boolean>
}

lib.define<ToggleContract>('toggle-switch', (ctx) => {
  const { label, checked } = ctx.props

  const onToggle = () => {
    ctx.emit('change', !checked.value)
  }

  return {
    template: (
      <label class="toggle">
        <span class="toggle__label">{label}</span>
        <button
          class={computed(() => `toggle__btn${checked.value ? ' toggle__btn--on' : ''}`)}
          role="switch"
          aria-checked={computed(() => String(checked.value))}
          onclick={onToggle}
        >
          <span class="toggle__thumb" />
        </button>
      </label>
    ),
    styles: css`
      .toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        cursor: pointer;
      }

      .toggle__label {
        font-size: 0.9rem;
        color: #e2e8f0;
      }

      .toggle__btn {
        position: relative;
        width: 2.75rem;
        height: 1.5rem;
        border-radius: 999px;
        border: none;
        background: #334155;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }

      .toggle__btn--on {
        background: #0ea5e9;
      }

      .toggle__thumb {
        position: absolute;
        top: 50%;
        left: 0.2rem;
        transform: translateY(-50%);
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        background: #fff;
        transition: left 0.2s;
      }

      .toggle__btn--on .toggle__thumb {
        left: calc(100% - 1.3rem);
      }
    `,
  }
})

lib.page('settings', { path: '/settings' }, (ctx) => {
  const auth = ctx.inject(reg => reg.services.auth)

  ctx.guard('enter', () => {
    if (!auth.isLoggedIn.value) {
      return ctx.redirect('login')
    }
    return true
  })

  const displayName = signal(auth.user.value ?? '')
  const notifyEmail = signal(true)
  const notifyPush  = signal(false)
  const darkMode    = signal(true)

  const isDirty = signal(false)
  const saveStatus = signal<'idle' | 'saving' | 'saved'>('idle')

  const markDirty = () => { isDirty.value = true; saveStatus.value = 'idle' }

  ctx.guard('leave', () => {
    if (isDirty.value) {
      return window.confirm('You have unsaved changes. Leave anyway?')
    }
    return true
  })

  const autoSave = debounce(() => {
    saveStatus.value = 'saving'
    setTimeout(() => {
      saveStatus.value = 'saved'
      isDirty.value = false
    }, 800)
  }, 1200)

  const onNameInput = (e: InputEvent) => {
    displayName.value = (e.target as HTMLInputElement).value
    markDirty()
    autoSave()
  }

  const onSave = () => {
    saveStatus.value = 'saving'
    setTimeout(() => {
      saveStatus.value = 'saved'
      isDirty.value = false
    }, 600)
  }

  const statusText = computed(() => {
    if (saveStatus.value === 'saving') return 'Saving…'
    if (saveStatus.value === 'saved')  return 'All changes saved ✓'
    if (isDirty.value)                 return 'Unsaved changes'
    return ''
  })

  const statusClass = computed(() =>
    saveStatus.value === 'saved' ? 'status status--saved'
    : isDirty.value              ? 'status status--dirty'
    : 'status'
  )

  const onToggleChange = (key: 'email' | 'push' | 'dark') =>
    (e: CustomEvent<boolean>) => {
      if (key === 'email') notifyEmail.value = e.detail
      if (key === 'push')  notifyPush.value  = e.detail
      if (key === 'dark')  darkMode.value    = e.detail
      markDirty()
    }

  return {
    template: (
      <div class="settings">
        <header class="page-header">
          <h1>Settings</h1>
          <p class="page-sub">
            This page has a <strong>leave guard</strong>: if you have unsaved changes
            and try to navigate away, a confirmation dialog will appear.
            It also uses <code>debounce()</code> from xzo for auto-saving.
          </p>
        </header>

        <div class="form-card">
          <h2 class="section-title">Profile</h2>

          <label class="field">
            <span class="field__label">Display name</span>
            <input
              class="field__input"
              type="text"
              value={displayName}
              oninput={onNameInput}
            />
          </label>
        </div>

        <div class="form-card">
          <h2 class="section-title">Notifications</h2>
          <toggle-switch
            label="Email notifications"
            checked={notifyEmail}
            onchange={onToggleChange('email')}
          />
          <toggle-switch
            label="Push notifications"
            checked={notifyPush}
            onchange={onToggleChange('push')}
          />
        </div>

        <div class="form-card">
          <h2 class="section-title">Appearance</h2>
          <toggle-switch
            label="Dark mode"
            checked={darkMode}
            onchange={onToggleChange('dark')}
          />
        </div>

        <div class="footer">
          {() => statusText.value && <span class={statusClass}>{statusText}</span>}
          <button class="btn btn--primary" onclick={onSave} disabled={!isDirty.value}>
            Save changes
          </button>
        </div>
      </div>
    ),
    styles: css`
      .settings {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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

      strong { color: #e2e8f0; }

      code {
        font-family: monospace;
        background: #1e293b;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
        font-size: 0.8em;
        color: #38bdf8;
      }

      .form-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .section-title {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .field__label {
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .field__input {
        padding: 0.55rem 0.875rem;
        border-radius: 0.5rem;
        border: 1px solid #475569;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        max-width: 20rem;
        transition: border-color 0.15s;
      }

      .field__input:focus {
        border-color: #38bdf8;
      }

      .footer {
        display: flex;
        align-items: center;
        gap: 1rem;
        justify-content: flex-end;
      }

      .status {
        font-size: 0.8rem;
        color: #64748b;
      }

      .status--dirty { color: #fb923c; }
      .status--saved { color: #4ade80; }

      .btn {
        padding: 0.55rem 1.25rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        font-family: inherit;
        font-weight: 600;
        transition: background 0.15s, opacity 0.15s;
      }

      .btn--primary {
        background: #0ea5e9;
        color: #fff;
      }

      .btn--primary:hover:not(:disabled) {
        background: #38bdf8;
      }

      .btn--primary:disabled {
        opacity: 0.4;
        cursor: default;
      }
    `,
  }
})
