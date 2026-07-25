const StyleStrategy = require('./StyleStrategy');

class StepByStepStyle extends StyleStrategy {
    constructor() {
        super('step-by-step');
    }

    getInstruction(confidence) {
        let instruction = "Break the explanation down into small, numbered, step-by-step instructions. Keep each step concise.";
        if (confidence > 0.7) {
            instruction += " IMPORTANT: Strictly follow a numbered format and avoid overwhelming the user with large blocks of text.";
        }
        return instruction;
    }
}

module.exports = StepByStepStyle;
