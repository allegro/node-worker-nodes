require('chai').should();

// used to make tests more readable
Object.defineProperty(Number.prototype, 'times', {
    get() {
        return {
            call: func => new Array(this.valueOf()).fill().map(func)
        };
    }
});

Object.defineProperty(Array.prototype, 'and', {
    get() {
        return this;
    }
});

Object.defineProperty(Array.prototype, 'waitForAllResults', {
    get() {
        return (...args) => Promise.all(this.map(i => i.catch(error => error)));
    }
});