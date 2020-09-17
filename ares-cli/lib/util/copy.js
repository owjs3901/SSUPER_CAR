var
    Promise = require('bluebird'),
    path = require('path'),
    fs = Promise.promisifyAll(require('fs-extra'));

function copyToDirAsync(src, destDir) {
    return fs.lstatAsync(src).then(function(stats) {
        if (stats.isFile()) {
            return fs.copyAsync(src, path.join(destDir, path.basename(src)));
        } else {
            return fs.copyAsync(src, destDir);
        }
    });
}

function copyToDirSync(src, destDir) {
    stats = fs.lstatSync(src);
    if (stats.isFile()) {
        fs.copySync(src, path.join(destDir, path.basename(src)));
    } else {
        fs.copySync(src, destDir);
    }
}

module.exports.copyToDirAsync = copyToDirAsync;
module.exports.copyToDirSync = copyToDirSync;
