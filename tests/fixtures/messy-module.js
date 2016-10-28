module.exports = {

    getPid: () => process.pid,

    typeError: () => module.exports(),

    referenceError: () => some.invalid.object.method(),

    customError(customFields = {}) {
        throw customFields;
    },

    promiseRejection: reason => Promise.reject(reason),

};