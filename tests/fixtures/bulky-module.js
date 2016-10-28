const fs = require('fs');
const zlib = require('zlib');

const data = fs.readFileSync(__dirname + '/bulky-module.data');
const resp = zlib.inflateSync(data).toString();

module.exports = {
    render: () => ({ result: resp }),
    renderString: () => resp
};