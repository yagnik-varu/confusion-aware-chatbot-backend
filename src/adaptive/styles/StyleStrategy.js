class StyleStrategy {
    constructor(name) {
        if (this.constructor === StyleStrategy) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.name = name;
    }

    getInstruction(confidence) {
        throw new Error("Method 'getInstruction()' must be implemented.");
    }
}

module.exports = StyleStrategy;
