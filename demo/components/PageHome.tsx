import { css, lib } from 'xzo'
import type { AnySignal } from 'xzo'
import type { Product } from './types'

lib.page('page-home', { path: '/' }, (ctx) => {
    const cart = ctx.inject(reg => reg.services.cart)
    const logger = ctx.inject(reg => reg.services.logger);

    ctx.listen('cart-add', ((event: CustomEvent<Product>) => {
        const added = cart.addToCart(event.detail)
        if (added) logger.log(`Added "${event.detail.name}" to cart`)
    }) as EventListener)

    ctx.listen('cart-remove', ((event: CustomEvent<{ id: number }>) => {
        const removed = cart.removeFromCart(event.detail.id)
        if (removed) logger.log(`Removed "${removed.name}" from cart`)
    }) as EventListener)

    ctx.listen('cart-checkout', (() => {
        const result = cart.checkout()
        if (result) {
            logger.log(`Checkout completed for $${result.total}`)
            void ctx.navigate('page-checkout-confirm')
        } else {
            logger.log('Checkout blocked because the cart is empty')
        }
    }) as EventListener)

    ctx.observe(cart.total, (count) => {
        document.title = count > 0
            ? `Storefront Demo (${count} item${count === 1 ? '' : 's'})`
            : 'Storefront Demo'
    })

    const { total, totalPrice } = cart

    return {
        template: (
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
        ),
        styles: css`
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

      .badge {
        font-size: 0.88rem;
        font-weight: 700;
        color: #0369a1;
      }

      @media (min-width: 900px) {
        .grid {
          grid-template-columns: minmax(0, 1.3fr) minmax(20rem, 0.9fr);
        }
      }
    `,
    }
})
