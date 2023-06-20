const { threadId } = require('worker_threads');
/* eslint-disable */
module.exports = {

    getPid: () => process.pid,

    getThreadId: () => threadId,

    typeError: () => module.exports(),

    referenceError: () => some.invalid.object.method(),

    customError(customFields = {}) {
        throw customFields;
    },

    promiseRejection: reason => Promise.reject(reason),

};