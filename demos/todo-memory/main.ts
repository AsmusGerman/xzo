import { init } from 'xzo'
import './components/App'

const root = document.getElementById('root')!
const toggle = document.getElementById('toggle') as HTMLButtonElement
const status = document.getElementById('status')!

let mounted = false

function mount(): void {
  const el = document.createElement('todo-app')
  root.appendChild(el)
  toggle.textContent = 'Unmount app'
  toggle.classList.add('mounted')
  status.textContent = 'mounted'
  mounted = true
}

function unmount(): void {
  root.innerHTML = ''
  toggle.textContent = 'Mount app'
  toggle.classList.remove('mounted')
  status.textContent = 'unmounted'
  mounted = false
}

toggle.addEventListener('click', () => {
  if (mounted) {
    unmount()
  } else {
    mount()
  }
})

// Register all components then initialise the library.
// Do NOT auto-mount on page load — user drives it via the button.
init()
