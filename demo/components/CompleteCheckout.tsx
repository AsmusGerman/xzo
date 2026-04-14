import { lib, computed, css } from 'xzo';
import type { AnySignal } from 'xzo';

lib.define('checkout-button', (ctx) => {
  const { total } = ctx.inject('app') as {
    total: AnySignal<number>;
  };

  const checkoutDisabled = computed(() => total.value === 0);
  ctx.onMount(() => {
    console.log('[checkout-button] mounted');
  });

  const Test = () => lib.xif(
    () => !checkoutDisabled.value,
    () => <button class='checkout-btn' onclick={() => ctx.emit('cart-checkout')}>
      Complete checkout
    </button>,
  );

  return {
    template: <div><Test /></div>,
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
