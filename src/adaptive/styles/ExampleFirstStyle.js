const StyleStrategy = require('./StyleStrategy');

class ExampleFirstStyle extends StyleStrategy {
    constructor() {
        super('example-first');
    }

    getInstruction(confidence) {
        let instruction = "Start by providing a clear, concrete example or code snippet before explaining the underlying theory or concepts.";
        if (confidence > 0.7) {
            instruction += " IMPORTANT: The example must be the very first thing presented. Theory should strictly follow the example.";
        }
        return instruction;
    }
}

module.exports = ExampleFirstStyle;
