var
    fs = require('fs'),
    log = require('npmlog'),
    spawn = require('child_process').spawn;

var
    promiseMaker = require('./promisemaker');

var platformOpen = {
    win32: [ "cmd" , '/c', 'start' ],
    darwin:[ "open" ],
    linux: [ "xdg-open" ]
};

function openUrl(url, browserPath) {
    var
        browserProc,
        info = platformOpen[process.platform];

    log.verbose('openUrl()#url:',url, ", browserPath:", browserPath);

    if (browserPath && existsSync(browserPath)) {
        if (process.platform === 'linux') {
            info.splice(0, 1); //delete 'xdg-open' command
        }
        info = info.concat([browserPath, '--new', '--args']);
    }
    browserProc = spawn(info[0], info.slice(1).concat([url]));
    browserProc.stdout.on('data', log.verbose.bind(log, 'openUrl()'));
    browserProc.stderr.on('data', log.verbose.bind(log, 'openUrl()'));
    return promiseMaker(browserProc);
}

function existsSync(file) {
    try {
        fs.accessSync(file);
        return true;
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}

module.exports = openUrl;
