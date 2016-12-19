const fs = require('fs');
const tmpFile = __dirname + '/.tmp';

module.exports = {
    getPid: () => process.pid,

    exitAlways: () => process.exit(-1),
    exitRandomly: () => Math.random() < 0.5 ? process.exit(-1) : process.pid,

    infiniteLoop: () => { while (true); },

    setSomeJobFailsNumber: number => fs.writeFileSync(tmpFile, String(number)),
    someJob() {
        let failsLeft = fs.existsSync(tmpFile) ? parseInt(fs.readFileSync(tmpFile, 'utf8')) : 0;

        if (--failsLeft > 0) {
            fs.writeFileSync(tmpFile, String(failsLeft - 1));
            return this.exitAlways();
        } else {
            new Promise(resolve => fs.unlinkSync(tmpFile)).catch(error => error);
            return true;
        }
    },

};