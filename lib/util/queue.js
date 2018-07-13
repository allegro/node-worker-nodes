class Queue {
    constructor({ sizeLimit = Infinity } = {}) {
        this.sizeLimit = sizeLimit;
        this.storage = [];
    }

    get length() {
        return this.storage.length;
    }

    enqueue(item) {
        this.storage.push(item);
    }

    dequeue() {
        return this.storage.shift();
    }

    requeue(item) {
        this.remove(item);
        this.enqueue(item);
    }

    remove(item) {
        const index = this.storage.indexOf(item);
        return this.storage.splice(index, 1);
    }

    isFull() {
        return this.storage.length >= this.sizeLimit;
    }

    isEmpty() {
        return this.storage.length === 0;
    }

    forEach(predicate) {
        return this.storage.forEach(predicate);
    }

    map(predicate) {
        return this.storage.map(predicate);
    }

    filter(predicate) {
        return this.storage.filter(predicate);
    }

    find(predicate) {
        return this.storage.find(predicate);
    }
}

module.exports = Queue;