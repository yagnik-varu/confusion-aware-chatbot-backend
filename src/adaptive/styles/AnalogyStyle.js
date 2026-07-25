const StyleStrategy = require('./StyleStrategy');

class AnalogyStyle extends StyleStrategy {
    constructor() {
        super('analogy');
    }

    getInstruction(confidence) {
        let instruction = "Explain this using a relatable real-world analogy. Relate technical concepts to everyday experiences.";
        if (confidence > 0.7) {
            instruction += " IMPORTANT: Ensure the analogy is central to the entire explanation and heavily emphasized.";
        }
        return instruction;
    }
}

module.exports = AnalogyStyle;
