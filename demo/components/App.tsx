import { computed } from '@preact/signals-core'
import { css, lib, signal } from 'xzo'
import type { AnySignal } from 'xzo'
import type { Product } from './types'

lib.root('app', (ctx) => {
  const cart = signal<Product[]>([])
  const checkoutMessage = signal('')
  const total = computed(() => cart.value.length)
  const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price, 0).toFixed(2),
  )

  type LogEntry = { id: number; text: string }

  // Retrieve the logger service registered in main.ts
  const logger = ctx.inject((reg) => reg.services.logger) as {
    entries: AnySignal<LogEntry[]>
    log: (message: string) => void
  }

  function addToCart(item: Product) {
    if (!cart.value.find((entry) => entry.id === item.id)) {
      cart.value = [...cart.value, item]
      checkoutMessage.value = ''
      logger.log(`Added "${item.name}" to cart`)
    }
  }

  function removeFromCart(id: number) {
    const item = cart.value.find((entry) => entry.id === id)
    if (item) {
      cart.value = cart.value.filter((entry) => entry.id !== id)
      logger.log(`Removed "${item.name}" from cart`)
    }
  }

  function completeCheckout() {
    if (cart.value.length === 0) {
      checkoutMessage.value = 'Add at least one item before checkout.'
      logger.log('Checkout blocked because the cart is empty')
      return
    }

    const items = cart.value
    const amount = totalPrice.value
    cart.value = []
    checkoutMessage.value = `Checkout complete for ${items.length} item${items.length === 1 ? '' : 's'} totaling $${amount}.`
    logger.log(`Checkout completed for $${amount}`)
  }

  // Demonstrate ctx.listen — listen for custom events bubbling from children
  ctx.listen('cart-add', ((event: CustomEvent<Product>) => {
    addToCart(event.detail)
  }) as EventListener)

  ctx.listen('cart-remove', ((event: CustomEvent<{ id: number }>) => {
    removeFromCart(event.detail.id)
  }) as EventListener)

  ctx.listen('cart-checkout', (() => {
    completeCheckout()
  }) as EventListener)

  // Demonstrate ctx.effect — keep the document title in sync with the cart
  ctx.effect(() => {
    const count = total.value
    document.title = count > 0
      ? `Storefront Demo (${count} item${count === 1 ? '' : 's'})`
      : 'Storefront Demo'
  })

  // Demonstrate ctx.onMount / ctx.onUnmount
  ctx.onMount(() => {
    console.log('[app] mounted')
    logger.log('App mounted')
  })

  ctx.onUnmount(() => {
    console.log('[app] unmounted')
  })

  const logSource = lib.each(() => logger.entries.value, (entry) => entry.id)

  return {
    scope: { cart, total, totalPrice, checkoutMessage, addToCart, removeFromCart, completeCheckout },
    template: (
      <div class="app-shell">
        <header class="hero">
          <p class="eyebrow">xzo</p>
          <h1>Storefront Demo</h1>
          <p class="intro">
            Fine-grained JSX, scoped styles, context injection, keyed iteration,
            async data, custom events, lifecycle hooks, and services — all without a VDOM.
          </p>
        </header>

        <main class="grid">
          <section class="panel panel--products">
            <div class="panel__header">
              <h2>Products</h2>
              <span class="badge">{total} in cart &middot; ${totalPrice}</span>
            </div>
            <product-list />
          </section>

          <section class="panel panel--cart">
            <cart-summary />
          </section>
        </main>

        <p class="checkout-message" style:display={computed(() => checkoutMessage.value ? '' : 'none')}>
          {checkoutMessage}
        </p>

        <aside class="panel panel--log">
          <h3>Activity Log <span class="log-badge">lib.service</span></h3>
          <logSource.empty>
            <p class="empty">No activity yet.</p>
          </logSource.empty>
          <ul class="log-list">
            <logSource.each>{(entry) => <li class="log-entry">{entry.text}</li>}</logSource.each>
          </ul>
        </aside>
      </div>
    ),
    styles: css`
      .app-shell {
        min-height: 100vh;
        padding: 3rem 1.5rem;
        color: #0f172a;
        background:
          radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 28%),
          linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%);
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
      }

      .hero {
        max-width: 56rem;
        margin: 0 auto 2rem;
      }

      .eyebrow {
        margin: 0 0 0.75rem;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #0369a1;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 6vw, 4.5rem);
        line-height: 0.95;
      }

      .intro {
        max-width: 42rem;
        margin: 1rem 0 0;
        font-size: 1.05rem;
        line-height: 1.7;
        color: #334155;
      }

      .grid {
        display: grid;
        gap: 1.5rem;
        max-width: 72rem;
        margin: 0 auto;
      }

      .panel {
        backdrop-filter: blur(18px);
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 1.5rem;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
      }

      .panel--products,
      .panel--cart {
        padding: 1.25rem;
      }

      .panel--log {
        max-width: 72rem;
        margin: 1.5rem auto 0;
        padding: 1.25rem;
      }

      .checkout-message {
        max-width: 72rem;
        margin: 1rem auto 0;
        padding: 0.9rem 1rem;
        border-radius: 1rem;
        background: rgba(22, 163, 74, 0.12);
        color: #166534;
        font-weight: 700;
      }

      .panel__header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .badge {
        font-size: 0.88rem;
        font-weight: 700;
        color: #0369a1;
      }

      .log-badge {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        padding: 0.15rem 0.45rem;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
      }

      .log-list {
        display: grid;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        list-style: none;
        max-height: 10rem;
        overflow-y: auto;
      }

      .log-entry {
        font-size: 0.8rem;
        font-family: "Courier New", monospace;
        color: #475569;
        padding: 0.2rem 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      }

      .empty {
        color: #64748b;
        font-style: italic;
        margin: 0;
      }

      @media (min-width: 900px) {
        .grid {
          grid-template-columns: minmax(0, 1.3fr) minmax(20rem, 0.9fr);
        }
      }
    `,
  }
})