class ApiError extends Error {
    // Custom error class for API responses
    constructor(message = "something went wrong", statusCode, errors = [], stack = "") {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.message = message;
        this.success = false;
        this.stack = stack;
        // Set stack trace if provided
        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor);

        }
    }
}

export {ApiError} 