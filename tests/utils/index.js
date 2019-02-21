module.exports = {
    wait: delay => new Promise(resolve => setTimeout(resolve, delay)),
    fixture: name => require.resolve('../fixtures/' + name),
    unique: elements => [...new Set(elements)],
    isRunning: require('is-running')
};