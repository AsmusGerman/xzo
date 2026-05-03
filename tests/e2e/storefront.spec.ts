import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for a custom element to be fully mounted (its children are replaced). */
async function waitForMount(page: import('@playwright/test').Page, selector: string) {
  await page.waitForSelector(selector, { state: 'attached', timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// Page load
// ---------------------------------------------------------------------------

test.describe('Storefront — page load', () => {
  test('renders the app shell and heading', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.app-shell')
    await expect(page.locator('h1')).toContainText('Storefront Demo')
  })

  test('renders the product list with 5 product cards', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')
    const cards = page.locator('.product-card')
    await expect(cards).toHaveCount(5)
  })

  test('cart starts empty', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.app-shell')
    await expect(page.locator('.empty').first()).toContainText('Your cart is empty.')
  })

  test('activity log starts empty', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.app-shell')
    await expect(page.locator('.panel--log .empty')).toContainText('No activity yet.')
  })

  test('page title is "Storefront Demo" with an empty cart', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.app-shell')
    await expect(page).toHaveTitle('Storefront Demo')
  })
})

// ---------------------------------------------------------------------------
// Async image loading
// ---------------------------------------------------------------------------

test.describe('Storefront — async product images', () => {
  test('shows a loading spinner initially for each product', async ({ page }) => {
    await page.goto('/')
    // The spinner is rendered immediately before the async fetch resolves
    const spinners = page.locator('.spinner')
    // At least one spinner should be visible right after load
    await expect(spinners.first()).toBeVisible()
  })

  test('images eventually load for all products', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')
    // Wait for all product images to load
    const images = page.locator('.product-image')
    await expect(images).toHaveCount(5, { timeout: 15_000 })
  })
})

// ---------------------------------------------------------------------------
// Add to cart
// ---------------------------------------------------------------------------

test.describe('Storefront — add to cart', () => {
  test('clicking "Add to cart" increments the cart badge counter', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await expect(page.locator('.badge')).toContainText('0 in cart')
    await page.locator('.product-card').first().locator('button').click()
    await expect(page.locator('.badge')).toContainText('1 in cart')
  })

  test('added item appears in the cart summary', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const firstName = await page.locator('.product-name').first().textContent()
    await page.locator('.product-card').first().locator('button').click()
    await expect(page.locator('.cart-item-name').first()).toContainText(firstName!)
  })

  test('button changes to "Added ✓" after being clicked', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const btn = page.locator('.product-card').first().locator('button')
    await btn.click()
    await expect(btn).toContainText('Added')
  })

  test('clicking the button again does not duplicate the cart item', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const btn = page.locator('.product-card').first().locator('button')
    await btn.click()
    await btn.click()
    await expect(page.locator('.cart-item')).toHaveCount(1)
  })

  test('page title updates to include cart count', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await expect(page).toHaveTitle(/Storefront Demo \(1 item\)/)
  })

  test('activity log records the add action', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const firstName = await page.locator('.product-name').first().textContent()
    await page.locator('.product-card').first().locator('button').click()
    await expect(page.locator('.panel--log')).toContainText(`Added "${firstName}"`)
  })
})

// ---------------------------------------------------------------------------
// Remove from cart
// ---------------------------------------------------------------------------

test.describe('Storefront — remove from cart', () => {
  test('removing an item decrements the cart badge', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await expect(page.locator('.badge')).toContainText('1 in cart')

    await page.locator('.remove-btn').first().click()
    await expect(page.locator('.badge')).toContainText('0 in cart')
  })

  test('cart shows empty state after last item is removed', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.remove-btn').first().click()
    await expect(page.locator('.empty').first()).toContainText('Your cart is empty.')
  })

  test('add button resets after item is removed', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const btn = page.locator('.product-card').first().locator('button')
    await btn.click()
    await expect(btn).toContainText('Added')
    await page.locator('.remove-btn').first().click()
    await expect(btn).toContainText('Add to cart')
  })

  test('activity log records the remove action', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    const firstName = await page.locator('.product-name').first().textContent()
    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.remove-btn').first().click()
    await expect(page.locator('.panel--log')).toContainText(`Removed "${firstName}"`)
  })
})

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

test.describe('Storefront — checkout', () => {
  test('checkout button is disabled with an empty cart', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.app-shell')
    await expect(page.locator('.checkout-btn')).toBeDisabled()
  })

  test('checkout empties the cart and shows a confirmation message', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.checkout-btn').click()

    await expect(page.locator('.cart-item')).toHaveCount(0)
    await expect(page.locator('.empty').first()).toContainText('Your cart is empty.')
  })

  test('checkout message appears after successful checkout', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.checkout-btn').click()

    await expect(page.locator('.checkout-message')).toContainText('Checkout complete')
  })

  test('activity log records the checkout action', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.checkout-btn').click()

    await expect(page.locator('.panel--log')).toContainText('Checkout completed')
  })

  test('page title resets to "Storefront Demo" after checkout', async ({ page }) => {
    await page.goto('/')
    await waitForMount(page, '.product-card')

    await page.locator('.product-card').first().locator('button').click()
    await page.locator('.checkout-btn').click()

    await expect(page).toHaveTitle('Storefront Demo')
  })
})
