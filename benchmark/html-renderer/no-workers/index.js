const data = require('fs').readFileSync(__dirname + '/../../fixtures/output.dat', 'utf8');

function renderHTML(pageDescription) {
    return {
        html: JSON.stringify(pageDescription) + data,
        stats: {
            rss: 0,
            cpu: { user: 0, system: 0 }
        }
    };
}

module.exports = {
    test(pageDescription) {
        return renderHTML({ data: pageDescription });
    }
};