module.exports = function echoDirect (msg = '') {
    return msg;
};

Object.assign(module.exports, {
    
    echoSync(msg = '') {
        return msg;
    },

    echoAsync(msg = '', timeout = 10) {
        return new Promise(resolve => setTimeout(resolve, timeout)).then(() => msg);
    },

    echoMethod(msg = '') {
        return this.echoSync(msg);
    }

});