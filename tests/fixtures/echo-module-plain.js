module.exports = {

    echo: 'hello world!',

    echoSync(msg = '') {
        return msg;
    },

    echoAsync(msg = '', timeout = 10) {
        return new Promise(resolve => setTimeout(resolve, timeout)).then(() => msg);
    },

    echoMethod(msg = '') {
        return this.echoSync(msg);
    }

};