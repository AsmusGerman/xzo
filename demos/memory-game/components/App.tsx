import { signal, css, lib, computed } from "xzo";
import "./Card";

type Card = { id: string; value: string; key: string; flipped: boolean; matched: boolean };

lib.root('app', (ctx) => {
    const UNIQUE_CARDS = [
        { id: 'banana', value: '🍌' },
        { id: 'apple', value: '🍎' },
        { id: 'grape', value: '🍇' },
        { id: 'watermelon', value: '🍉' },
        { id: 'strawberry', value: '🍓' },
        { id: 'peach', value: '🍑' },
    ];

    const matched = signal(0);

    const cards = signal<Card[]>(
        [...UNIQUE_CARDS, ...UNIQUE_CARDS]
            .sort(() => Math.random() - 0.5)
            .map((card, index) => ({ ...card, key: `${card.id}-${index}`, flipped: false, matched: false })),
    );

    const gameCards = lib.each(cards, (item) => item.key, { lookup: true });

    ctx.listen('flip', (e: any) => {
        gameCards.update(e.detail.key, { flipped: e.detail.flipped });

        const flippedCards = cards.value.filter((card) => card.flipped && !card.matched);
        if (flippedCards.length === 2) {
            setTimeout(() => {
                const [first, second] = flippedCards;
                if (first.id !== second.id) {
                    gameCards.update(first.key, { flipped: false });
                    gameCards.update(second.key, { flipped: false });
                } else {
                    gameCards.update(first.key, { matched: true });
                    gameCards.update(second.key, { matched: true });
                    matched.value += 1;
                }
            }, 200);
        }
    });

    const allMatched = computed(() => matched.value === UNIQUE_CARDS.length);

    return {
        template: (
            <div class="memory-game">
                {() =>
                    !allMatched.value ? <gameCards.each>
                        {(card) => (
                            <card key={card.key} value={card.value} flipped={card.flipped} matched={card.matched} />
                        )}
                    </gameCards.each> : <div class="win-message">You win! 🎉</div>}
            </div>
        ),
        styles: css`
            .memory-game {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                padding: 24px;
                width: min(560px, 90vw);
                margin: auto;
                perspective: 1000px;
            }
            .win-message {
                grid-column: 1 / -1;
                text-align: center;
                font-size: 1.5rem;
                color: #00b894;
            }
        `,
    };
});
