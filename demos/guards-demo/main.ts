
import '@xzo/router'
import { lib } from 'xzo'
import type { AnySignal } from 'xzo'

import './services/auth'
import './components/AppShell'
import './components/NavBar'
import './pages/PageHome'
import './pages/PageLogin'
import './pages/PageDashboard'
import './pages/PageSettings'
import './pages/PageNotFound'

declare module '@xzo/router' {
  interface RouteRegistry {
    home:        Record<string, never>
    login:       Record<string, never>
    dashboard:   Record<string, never>
    settings:    Record<string, never>
    'not-found': Record<string, never>
  }
}

declare module 'xzo' {
  interface ServiceRegistry {
    auth: {
      user: AnySignal<string | null>
      isLoggedIn: AnySignal<boolean>
      login: (username: string) => void
      logout: () => void
    }
  }
}

lib.init()
