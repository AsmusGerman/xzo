import { lib, computed, css, xIf, xElse } from 'xzo';
import type { AnySignal } from 'xzo';

lib.define('checkout-button', (ctx) => {
  const { total } = ctx.inject((reg) => reg.components.app) as {
    total: AnySignal<number>;
  };

  const checkoutDisabled = computed(() => total.value === 0);
  ctx.onMount(() => {
    console.log('[checkout-button] mounted');
  });

  return {
    template: (
      <div>
        <xIf when={() => !checkoutDisabled.value}>
          <button
            class='checkout-btn'
            onclick={() => ctx.emit('cart-checkout')}
          >
            Complete checkout
          </button>
        </xIf>
        <xElse>
          <div>Add items to be able to checkout</div>
        </xElse>
      </div>
    ),
    styles: css`
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
    `,
  };
});
