import { css, lib, computed } from "xzo";
import type { AnySignal } from "xzo";
import type { Product } from "./types";

lib.define("cart-summary", (ctx) => {
  const { cart, total, totalPrice, checkoutMessage } = ctx.inject("app") as {
    cart: AnySignal<Product[]>;
    total: AnySignal<number>;
    totalPrice: AnySignal<string>;
    checkoutMessage: AnySignal<string>;
  };

  const totalLabel = computed(
    () => `${total.value} item${total.value === 1 ? "" : "s"}`,
  );

  const items = lib.each(
    () => cart.value,
    (item) => item.id,
    { lookup: true },
  );

  const statusDisplay = computed(() =>
    checkoutMessage.value ? "block" : "none",
  );

  const checkoutDisabled = computed(() => total.value === 0);

  ctx.onMount(() => {
    console.log("[cart-summary] mounted");
  });

  return {
    template: (
      <div class="cart">
        <h2>Cart</h2>
        <p class="summary">
          {totalLabel} &middot; ${totalPrice}
        </p>
        <p class="status" style:display={statusDisplay}>
          {checkoutMessage}
        </p>
        <items.empty>
          <p class="empty">Your cart is empty.</p>
        </items.empty>
        <ul>
          <items.each>
            {(item) => (
              <li class="cart-item">
                <div class="cart-item-info">
                  <span class="cart-item-name">{item.name}</span>
                  <span class="cart-item-price">${item.price.toFixed(2)}</span>
                </div>
                <button
                  class="remove-btn"
                  onclick={() => ctx.emit("cart-remove", { id: item.id })}
                >
                  &times;
                </button>
              </li>
            )}
          </items.each>
        </ul>
        <div class="cart-actions">
          <checkout-button />
        </div>
      </div>
    ),
    styles: css`
      .cart {
        display: grid;
        gap: 0.85rem;
      }

      h2,
      .summary,
      .empty {
        margin: 0;
      }

      .summary {
        color: #0369a1;
        font-weight: 700;
      }

      .status {
        margin: 0;
        color: #166534;
        font-size: 0.9rem;
        font-weight: 700;
      }

      ul {
        display: grid;
        gap: 0.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .cart-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        background: rgba(2, 132, 199, 0.08);
      }

      .cart-item-info {
        display: flex;
        gap: 0.75rem;
        align-items: baseline;
      }

      .cart-item-name {
        font-weight: 600;
      }

      .cart-item-price {
        color: #0369a1;
        font-size: 0.88rem;
        font-weight: 700;
      }

      .remove-btn {
        padding: 0.45rem 0.7rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s;
        line-height: 1;
      }

      .remove-btn:hover {
        background: rgba(239, 68, 68, 0.25);
      }

      .empty {
        color: #64748b;
        font-style: italic;
      }

      .cart-actions {
        display: flex;
        justify-content: flex-end;
      }

      .checkout-btn {
        padding: 0.75rem 1rem;
        border: 0;
        border-radius: 999px;
        background: #0f766e;
        color: white;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          background 0.15s,
          opacity 0.15s;
      }

      .checkout-btn:hover {
        background: #115e59;
      }

      .checkout-btn:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }
    `,
  };
});
