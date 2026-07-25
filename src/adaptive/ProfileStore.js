class IProfileStore {
    getProfile(sessionId) {
        throw new Error("Not implemented");
    }

    saveProfile(sessionId, profile) {
        throw new Error("Not implemented");
    }
}

class InMemoryProfileStore extends IProfileStore {
    constructor() {
        super();
        this.store = new Map();
    }

    getProfile(sessionId) {
        if (!this.store.has(sessionId)) {
            // Default profile shape
            this.store.set(sessionId, {
                preferredStyle: "step-by-step",
                confidenceInStyle: 0.3,
                failedStyles: [],
                lastStyleUsed: null,
                topics: {}
            });
        }
        return this.store.get(sessionId);
    }

    saveProfile(sessionId, profile) {
        this.store.set(sessionId, profile);
    }
}

module.exports = {
    IProfileStore,
    InMemoryProfileStore
};
