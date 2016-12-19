const inherits = require('util').inherits;

function TimeoutError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
}

function ProcessTerminatedError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
}

function MaxConcurrentCallsError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
}

inherits(TimeoutError, Error);
inherits(ProcessTerminatedError, Error);
inherits(MaxConcurrentCallsError, Error);

module.exports = {
    TimeoutError,
    ProcessTerminatedError,
    MaxConcurrentCallsError
};