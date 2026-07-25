class ISignalDetector {
    detect(message) {
        throw new Error("Not implemented");
    }
}

class KeywordSignalDetector extends ISignalDetector {
    constructor() {
        super();
        this.confusedKeywords = [
            "don't get it", "dont get it", "confused", 
            "explain differently", "still don't understand", "still dont understand"
        ];
        this.understoodKeywords = [
            "got it", "makes sense", "that helps", "understood"
        ];
    }

    detect(message) {
        const lowerMsg = message.toLowerCase();
        
        for (const kw of this.confusedKeywords) {
            if (lowerMsg.includes(kw)) {
                return "confused";
            }
        }

        for (const kw of this.understoodKeywords) {
            if (lowerMsg.includes(kw)) {
                return "understood";
            }
        }

        return "neutral";
    }
}

module.exports = {
    ISignalDetector,
    KeywordSignalDetector
};
