import { computed, lib, signal } from 'xzo'
import type { AnySignal } from 'xzo'
import type { Product } from '../components/types'

declare module 'xzo' {
  interface ServiceRegistry {
    cart: {
      cart: AnySignal<Product[]>
      total: AnySignal<number>
      totalPrice: AnySignal<string>
      checkoutMessage: AnySignal<string>
      lastCheckout: AnySignal<{ items: Product[]; total: string } | null>
      addToCart: (item: Product) => boolean
      removeFromCart: (id: number) => Product | undefined
      checkout: () => { items: Product[]; total: string } | null
    }
  }
}

lib.service('cart', () => {
  const cart = signal<Product[]>([])
  const checkoutMessage = signal('')
  const lastCheckout = signal<{ items: Product[]; total: string } | null>(null)
  const total = computed(() => cart.value.length)
  const totalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price, 0).toFixed(2),
  )

  function addToCart(item: Product): boolean {
    if (cart.value.find((entry) => entry.id === item.id)) return false
    cart.value = [...cart.value, item]
    checkoutMessage.value = ''
    return true
  }

  function removeFromCart(id: number): Product | undefined {
    const item = cart.value.find((entry) => entry.id === id)
    if (item) cart.value = cart.value.filter((entry) => entry.id !== id)
    return item
  }

  function checkout(): { items: Product[]; total: string } | null {
    if (cart.value.length === 0) {
      checkoutMessage.value = 'Add at least one item before checkout.'
      return null
    }
    const items = [...cart.value]
    const amount = totalPrice.value
    lastCheckout.value = { items, total: amount }
    cart.value = []
    return { items, total: amount }
  }

  return { cart, total, totalPrice, checkoutMessage, lastCheckout, addToCart, removeFromCart, checkout }
})
