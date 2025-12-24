import { create } from 'zustand';

type MarketplaceAction = 'IDLE' | 'SCROLL_TOP' | 'SCROLL_DOWN';

interface MarketStore {
    currentAction: MarketplaceAction;
    currentMode: 'SCAN' | 'MARKET';
    triggerAction: (action: MarketplaceAction) => void;
    setMode: (mode: 'SCAN' | 'MARKET') => void;
    resetAction: () => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
    currentAction: 'IDLE',
    currentMode: 'SCAN', // Default to SCAN (middle button)
    triggerAction: (action) => {
        set({ currentAction: action });
        if (action === 'SCROLL_TOP') set({ currentMode: 'SCAN' });
        if (action === 'SCROLL_DOWN') set({ currentMode: 'MARKET' });
    },
    setMode: (mode) => set({ currentMode: mode }),
    resetAction: () => set({ currentAction: 'IDLE' }),
}));
