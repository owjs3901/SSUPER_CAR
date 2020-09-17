var
    Promise = require('bluebird');

function promiseMaker(childProc) {
    return new Promise( function(resolve, reject) {
        childProc.addListener('error', function(code) {
            reject({exitCode: code});
        });
        childProc.addListener('exit', function(code) {
            if (code === 0) resolve();
            else reject({exitCode: code});
        });
    });
}

module.exports = promiseMaker;
