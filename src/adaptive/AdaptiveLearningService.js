class AdaptiveLearningService {
    constructor(profileStore, signalDetector, styleSelector) {
        this.profileStore = profileStore;
        this.signalDetector = signalDetector;
        this.styleSelector = styleSelector;
    }

    processTurn(sessionId, userMessage) {
        // 1. Get profile
        const profile = this.profileStore.getProfile(sessionId);

        // 2. Detect signal
        const signal = this.signalDetector.detect(userMessage);

        // 3. Update profile fields based on signal
        if (signal === "confused") {
            profile.confidenceInStyle = Math.max(0, profile.confidenceInStyle - 0.2);
            if (profile.preferredStyle && !profile.failedStyles.includes(profile.preferredStyle)) {
                profile.failedStyles.push(profile.preferredStyle);
            }
        } else if (signal === "understood") {
            profile.confidenceInStyle = Math.min(1.0, profile.confidenceInStyle + 0.2);
            // Optionally clear failed styles since they got it? User didn't specify, so leave it.
        }

        // 4. Select style
        const selectedStyleStrategy = this.styleSelector.selectNext(profile, signal);
        
        // Update preferred style based on selection
        profile.preferredStyle = selectedStyleStrategy.name;
        profile.lastStyleUsed = selectedStyleStrategy.name;

        // 5. Save updated profile
        this.profileStore.saveProfile(sessionId, profile);

        console.log(`\n[ADAPTIVE MODULE] --- TURN DEBUG ---`);
        console.log(`[ADAPTIVE MODULE] Signal detected: "${signal}"`);
        console.log(`[ADAPTIVE MODULE] Selected style: "${selectedStyleStrategy.name}"`);
        console.log(`[ADAPTIVE MODULE] Current confidence: ${profile.confidenceInStyle.toFixed(2)}`);
        console.log(`[ADAPTIVE MODULE] Failed styles: [${profile.failedStyles.join(', ')}]`);
        console.log(`[ADAPTIVE MODULE] ------------------------\n`);

        // 6. Return the style's getInstruction string
        return selectedStyleStrategy.getInstruction(profile.confidenceInStyle);
    }
}

module.exports = AdaptiveLearningService;
