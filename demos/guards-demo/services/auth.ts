import { lib, signal, computed } from 'xzo'

lib.service('auth', () => {
  const user = signal<string | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  function login(username: string) {
    user.value = username
  }

  function logout() {
    user.value = null
  }

  return { user, isLoggedIn, login, logout }
})
