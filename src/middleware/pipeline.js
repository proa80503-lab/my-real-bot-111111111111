'use strict';

class Pipeline {
    constructor() {
        this.middlewares = [];
    }

    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }

    async execute(message) {
        for (const middleware of this.middlewares) {
            try {
                const proceed = await middleware(message);
                if (proceed === false) {
                    // Middleware stopped the chain
                    break;
                }
            } catch (err) {
                console.error('[Pipeline Error]', err);
                break; // Stop on error to prevent cascading failures
            }
        }
    }
}

module.exports = new Pipeline();
