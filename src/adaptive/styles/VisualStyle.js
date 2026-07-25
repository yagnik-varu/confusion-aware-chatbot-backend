const StyleStrategy = require('./StyleStrategy');

class VisualStyle extends StyleStrategy {
    constructor() {
        super('visual');
    }

    getInstruction(confidence) {
        let instruction = "Explain this visually by describing structural layouts, diagrams, or formatting text with ASCII shapes, bullet points, and clear separation.";
        if (confidence > 0.7) {
            instruction += " IMPORTANT: Rely heavily on spatial organization, formatting, and descriptive visual metaphors.";
        }
        return instruction;
    }
}

module.exports = VisualStyle;
