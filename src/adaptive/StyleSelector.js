class StyleSelector {
    constructor(strategies) {
        this.strategies = strategies; // Array of StyleStrategy instances
    }

    selectNext(profile, signal) {
        if (signal === "understood") {
            // Keep current style if they understood it, or default
            let current = this.strategies.find(s => s.name === profile.preferredStyle);
            return current || this.strategies[0];
        }

        if (signal === "confused") {
            // Pick a style not in failedStyles
            for (const strategy of this.strategies) {
                if (!profile.failedStyles.includes(strategy.name) && strategy.name !== profile.preferredStyle) {
                    return strategy;
                }
            }
            // If all failed, reset failedStyles or just return a default one
            // We'll cycle back to the first one available
            return this.strategies[0];
        }

        // Neutral: stick with preferred style
        let current = this.strategies.find(s => s.name === profile.preferredStyle);
        return current || this.strategies[0];
    }
}

module.exports = StyleSelector;
