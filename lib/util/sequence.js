/**
 * produces the infinite sequence of natural numbers (capped by a given limit)
 *
 * @param {Number} [start]
 * @param {Number} [max]
 */
function* idMaker(start = 0, max = Number.MAX_SAFE_INTEGER) {
    let serial = Math.floor(start) || 0;
    while (true) {
        serial = (serial % max) + 1;
        yield serial++;
    }
}

class Sequence {
    /**
     *
     * @param {Number} [startValue]
     * @param {Number} [max]
     */
    constructor(startValue = 0, max) {
        this.sequence = idMaker(startValue, max);
    }

    nextValue() {
        return this.sequence.next().value;
    }
}

module.exports = Sequence;