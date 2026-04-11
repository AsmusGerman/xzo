import { computed } from '@preact/signals-core'
import { css, lib } from 'xzo'

lib.page('page-checkout-confirm', { path: '/checkout/confirm' }, (ctx) => {
  const { lastCheckout } = ctx.inject(reg => reg.services.cart)

  const itemCount = computed(() => lastCheckout.value?.items.length ?? 0)
  const total     = computed(() => lastCheckout.value?.total ?? '0.00')
  const itemWord  = computed(() => itemCount.value === 1 ? 'item' : 'items')

  const confirmedItems = lib.each(
    () => lastCheckout.value?.items ?? [],
    (item) => item.id,
  )

  return {
    template: (
      <div class="confirm-page">
        <div class="confirm-card">
          <div class="confirm-icon">✓</div>
          <h2>Order confirmed!</h2>
          <p class="confirm-summary">
            {itemCount}&nbsp;{itemWord} &middot; ${total}
          </p>

          <ul class="confirm-items">
            <confirmedItems.each>
              {(item) => (
                <li class="confirm-item">
                  <span class="confirm-item-name">{item.name}</span>
                  <span class="confirm-item-price">${item.price.toFixed(2)}</span>
                </li>
              )}
            </confirmedItems.each>
          </ul>

          <a class="back-link" href="/">← Back to shop</a>
        </div>
      </div>
    ),
    styles: css`
      .confirm-page {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 3rem 1rem;
        min-height: 55vh;
      }

      .confirm-card {
        width: 100%;
        max-width: 32rem;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 2rem;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
        padding: 2.5rem 2rem;
        text-align: center;
      }

      .confirm-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        font-size: 1.75rem;
        font-weight: 700;
        margin-bottom: 1.25rem;
      }

      h2 {
        margin: 0 0 0.5rem;
        font-size: 1.6rem;
      }

      .confirm-summary {
        margin: 0 0 1.5rem;
        font-weight: 700;
        color: #0369a1;
        font-size: 1rem;
      }

      .confirm-items {
        list-style: none;
        margin: 0 0 2rem;
        padding: 0;
        border-top: 1px solid rgba(148, 163, 184, 0.25);
        text-align: left;
      }

      .confirm-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        font-size: 0.9rem;
        color: #334155;
      }

      .confirm-item-price {
        font-weight: 700;
        color: #0369a1;
      }

      .back-link {
        display: inline-block;
        padding: 0.65rem 1.5rem;
        background: #0369a1;
        color: #fff;
        border-radius: 999px;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 700;
        transition: background 0.15s;
      }

      .back-link:hover {
        background: #0284c7;
      }
    `,
  }
})
