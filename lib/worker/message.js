const errorMap = {
    TypeError: TypeError,
    RangeError:  RangeError,
    EvalError: EvalError,
    ReferenceError: ReferenceError,
    SyntaxError: SyntaxError,
    URIError: URIError
};

class Request {
    constructor({ callId, workerId, method, args }) {
        this.callId = callId;
        this.workerId = workerId;
        this.method = method;
        this.args = args;
    }
}

class Response {
    constructor({ callId, workerId, result, error }) {
        this.callId = callId;
        this.workerId = workerId;
        this.result = result;

        if (error) {
            const errorClass = errorMap[error.type] || Error;
            this.error = new (Function.prototype.bind.call(errorClass, error.message));
            Object.assign(this.error, error);
        }
    }

    setResult(data) {
        this.result = data;
    }

    /**
     * @param {Request} request
     */
    static from(request) {
        return new Response({
            callId: request.callId,
            workerId: request.workerId
        });
    }
}

module.exports = {
    Request,
    Response
};