import { computed } from '@preact/signals-core'
import { css, lib, signal } from 'xzo'
import type { AnySignal } from 'xzo'
import type { Product } from './types'

lib.define('product-item', (ctx) => {
  // todo: need to declare the props type somewhere to avoid the `as unknown` assertion here
  // since the component is expecting the product we have to give visibility on the props the parent can use
  
  const product = ctx.product as unknown as AnySignal<Product>
  const name = computed(() => product.value.name)
  const id = computed(() => product.value.id)
  const price = computed(() => product.value.price)
  const description = computed(() => product.value.description)
  const imagePath = computed(() => product.value.imagePath)

  const { cart } = ctx.inject(reg => reg.services.cart)
  const added = signal(false)

  const image = lib.async(async () => {
    const response = await fetch(imagePath.value)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const svg = await response.text()
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })

  // Demonstrate ctx.observe — sync the "added" flag with the cart signal
  // so that if an item is removed from the cart, the button resets
  ctx.observe(cart, (cartValue) => {
    const inCart = cartValue.some((entry) => entry.id === Number(id.value))
    added.value = inCart
  })

  const buttonLabel = computed(() => (added.value ? 'Added \u2713' : 'Add to cart'))
  const buttonClass = computed(() => (added.value ? 'button button--done' : 'button'))
  const priceLabel = computed(() => `$${Number(price.value).toFixed(2)}`)

  // Demonstrate ctx.emit — fire a custom event instead of calling addToCart directly
  function handleAdd() {
    if (added.value) return
    ctx.emit('cart-add', {
      ...product.value,
    } satisfies Product)
  }

  // Demonstrate ctx.onMount / ctx.onUnmount
  ctx.onMount(() => {
    console.log(`[product-item] mounted: ${name.value}`)
  })
  ctx.onUnmount(() => {
    console.log(`[product-item] unmounted: ${name.value}`)
  })

  return {
    template: (
      <li class="product-card">
        <div class="product-image-wrap">
          <image.loading>
            <div class="loader">
              <div class="spinner" />
            </div>
          </image.loading>
          <image.data>
            {(src) => <img class="product-image" src={src} alt={name} />}
          </image.data>
          <image.error>
            {(err) => <p class="img-error">{err.message || 'Image unavailable'}</p>}
          </image.error>
        </div>
        <div class="product-info">
          <p class="product-name">{name}</p>
          <p class="product-desc">{description}</p>
          <p class="product-price">{priceLabel}</p>
        </div>
        <button class={buttonClass} onclick={handleAdd}>
          {buttonLabel}
        </button>
      </li>
    ),
    styles: css`
      .product-card {
        display: grid;
        grid-template-columns: 4rem 1fr auto;
        align-items: center;
        gap: 1rem;
        padding: 0.85rem 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.26);
      }

      .product-card:last-child {
        border-bottom: 0;
      }

      .product-image-wrap {
        width: 4rem;
        height: 4rem;
        border-radius: 0.75rem;
        overflow: hidden;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .product-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .loader {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spinner {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #cbd5e1;
        border-top-color: #0284c7;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .img-error {
        margin: 0;
        color: #ef4444;
        font-weight: 700;
        font-size: 0.6rem;
        text-align: center;
        padding: 0.35rem;
      }

      .product-info {
        min-width: 0;
      }

      .product-name,
      .product-desc,
      .product-price {
        margin: 0;
      }

      .product-name {
        font-weight: 700;
      }

      .product-desc {
        margin-top: 0.1rem;
        color: #64748b;
        font-size: 0.82rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .product-price {
        margin-top: 0.25rem;
        color: #0369a1;
        font-weight: 700;
        font-size: 0.95rem;
      }

      .button {
        min-width: 8rem;
        padding: 0.6rem 0.85rem;
        border: 0;
        border-radius: 999px;
        background: #0f172a;
        color: white;
        font: inherit;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s;
      }

      .button:hover {
        background: #1e293b;
      }

      .button--done {
        background: #16a34a;
        cursor: default;
      }

      .button--done:hover {
        background: #16a34a;
      }
    `,
  }
})