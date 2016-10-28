module.exports = {
    wait: delay => new Promise(resolve => setTimeout(resolve, delay)),
    fixture: name => require.resolve('../fixtures/' + name),
    unique: require('lodash.uniq'),
    isRunning: require('is-running')
};