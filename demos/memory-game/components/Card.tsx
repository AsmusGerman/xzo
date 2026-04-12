import { computed, css, lib } from "xzo";
import type { ComponentProp, ComponentEvent } from "xzo";

type CardContract = {
    key:     ComponentProp<string>
    value:   ComponentProp<string>
    flipped: ComponentProp<boolean>
    matched: ComponentProp<boolean>
    flip:    ComponentEvent<{ key: string; flipped: boolean }>
}

lib.define<CardContract>('card', (ctx) => {
    const { key, value, flipped, matched } = ctx.props;

    const classes = computed(() => `memory-card ${flipped.value ? ' flipped' : ''} ${matched.value ? ' matched' : ''}`);

    const onClick = () => {
        if (flipped.value || matched.value) return;
        ctx.emit('flip', { key: key.value, flipped: !flipped.value });
    };

    return {
        template: (
            <div class={classes} onclick={onClick}>
                <div class="front-face">❓</div>
                <div class="back-face">{value.value}</div>
            </div>
        ),
        styles: css`
            .memory-card {
                aspect-ratio: 1;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.5s;
                cursor: pointer;
            }

            .memory-card:active {
                transform: scale(0.97);
                transition: transform 0.2s;
            }

            .memory-card.flipped {
                transform: rotateY(180deg);
            }
            
            .memory-card.matched {
                cursor: default;
                box-shadow: 0 0 10px 2px #00b894;
            }

            .front-face,
            .back-face {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                background: #30336b;
                backface-visibility: hidden;
                font-size: 2.5rem;
                box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.4);
            }

            .back-face {
                transform: rotateY(180deg);
            }
        `,
    };
});
