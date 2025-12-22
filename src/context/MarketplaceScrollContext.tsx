import React, { createContext, useContext, useRef, useCallback } from 'react';

interface MarketplaceScrollContextType {
    registerHandlers: (handlers: { scrollToTop: () => void; scrollToMarketplace: () => void }) => void;
    triggerScrollToTop: () => void;
    triggerScrollToMarketplace: () => void;
}

const MarketplaceScrollContext = createContext<MarketplaceScrollContextType | null>(null);

export function MarketplaceScrollProvider({ children }: { children: React.ReactNode }) {
    // Store refs to the functions, so we don't trigger re-renders just by registering
    const handlersRef = useRef<{ scrollToTop: () => void; scrollToMarketplace: () => void } | null>(null);

    const registerHandlers = useCallback((handlers: { scrollToTop: () => void; scrollToMarketplace: () => void }) => {
        handlersRef.current = handlers;
    }, []);

    const triggerScrollToTop = useCallback(() => {
        if (handlersRef.current?.scrollToTop) {
            handlersRef.current.scrollToTop();
        }
    }, []);

    const triggerScrollToMarketplace = useCallback(() => {
        if (handlersRef.current?.scrollToMarketplace) {
            handlersRef.current.scrollToMarketplace();
        }
    }, []);

    return (
        <MarketplaceScrollContext.Provider value={{ registerHandlers, triggerScrollToTop, triggerScrollToMarketplace }}>
            {children}
        </MarketplaceScrollContext.Provider>
    );
}

export function useMarketplaceScroll() {
    const context = useContext(MarketplaceScrollContext);
    if (!context) {
        throw new Error('useMarketplaceScroll must be used within a MarketplaceScrollProvider');
    }
    return context;
}
