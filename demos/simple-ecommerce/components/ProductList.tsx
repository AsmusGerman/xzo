import { computed } from '@preact/signals-core'
import { css, lib, signal } from 'xzo'
import type { Product } from './types'

lib.define('product-list', () => {
  const products = signal<Product[]>([
    {
      id: 1,
      name: 'Apple',
      price: 1.29,
      description: 'Crisp and sweet Fuji apple',
      imagePath: '/products/apple.svg',
    },
    {
      id: 2,
      name: 'Bread',
      price: 3.49,
      description: 'Artisan sourdough loaf',
      imagePath: '/products/bread.svg',
    },
    {
      id: 3,
      name: 'Milk',
      price: 2.99,
      description: 'Organic whole milk, 1 gallon',
      imagePath: '/products/milk.svg',
    },
    {
      id: 4,
      name: 'Cheese',
      price: 5.79,
      description: 'Aged cheddar, 200g block',
      imagePath: '/products/cheese.svg',
    },
    {
      id: 5,
      name: 'Coffee',
      price: 12.99,
      description: 'Single-origin dark roast beans',
      imagePath: '/products/coffee.svg',
    },
  ])

  const count = computed(() => products.value.length)
  const source = lib.each(() => products.value, (product) => product.id)

  return {
    template: (
      <div class="list-wrap">
        <p class="catalog-note">A fixed set of products loaded from a local catalog.</p>
        <source.empty>
          <p class="empty">No products available.</p>
        </source.empty>
        <ul>
          <source.each>{(product) => <product-item product={product} />}</source.each>
        </ul>
      </div>
    ),
    styles: css`
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .list-wrap {
        display: grid;
        gap: 1rem;
      }

      .catalog-note {
        margin: 0;
        color: #475569;
        font-size: 0.92rem;
      }

      .empty {
        margin: 0;
        color: #64748b;
        font-style: italic;
      }
    `,
  }
})