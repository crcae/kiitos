import { create } from 'zustand';

type MarketplaceAction = 'IDLE' | 'SCROLL_TOP' | 'SCROLL_DOWN';

interface MarketStore {
    currentAction: MarketplaceAction;
    triggerAction: (action: MarketplaceAction) => void;
    resetAction: () => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
    currentAction: 'IDLE',
    triggerAction: (action) => set({ currentAction: action }),
    resetAction: () => set({ currentAction: 'IDLE' }),
}));
