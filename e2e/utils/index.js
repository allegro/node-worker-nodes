module.exports.fixture = name => require.resolve('../fixtures/' + name);

module.exports.unique = elements => [...new Set(elements)];

module.exports.repeatCall = (call, count) => Promise.all(new Array(count).fill().map(async () => await call()));

module.exports.wait = delay => new Promise(resolve => setTimeout(resolve, delay));

function getPromiseDescriptor() {
    let promiseResolve, promiseReject 
    const promise = new Promise((resolve, reject) => {
        promiseResolve = resolve;
        promiseReject = reject
    });

    return {
        promise,
        resolve: promiseResolve,
        reject: promiseReject,
    };
}

module.exports.eventually = async (predicate, timeout = 5000) => {
    const promiseDescriptor = getPromiseDescriptor();
    const startTime = Date.now();
    
    do {
        try {
            const result = await predicate();
            if (result) {
                promiseDescriptor.resolve(result);
            }
        } catch (ex) {
            console.warn(`eventually(): provided predicate throwed: ${ex.message}`);
        }
        await this.wait(100);
    } while (Date.now() < startTime + timeout);

    promiseDescriptor.reject(new Error(`Timed out waiting ${timeout}ms for predicate`));

    return promiseDescriptor.promise;
}