module.exports.fixture = name => require.resolve('../fixtures/' + name);

module.exports.unique = elements => [...new Set(elements)];

module.exports.repeatCall = (call, count) => Promise.all(new Array(count).fill().map(async () => await call()));

module.exports.wait = delay => new Promise(resolve => setTimeout(resolve, delay));