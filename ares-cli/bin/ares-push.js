var path = require("path"),
    log = require('npmlog'),
    nopt = require('nopt'),
    ssh2 = require('ssh2'),
    commonTools = require('./../lib/base/common-tools'),
    Pusher = require('./../lib/pusher');

var version = commonTools.version,
    cliControl = commonTools.cliControl,
    help = commonTools.help,
    setupDevice = commonTools.setupDevice,
    appdata = commonTools.appdata;

var processName = path.basename(process.argv[1]).replace(/.js/, '');

process.on('uncaughtException', function(err) {
    log.error('uncaughtException', err.toString());
    log.info('uncaughtException', err.stack);
    cliControl.end(-1);
});

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}

var knownOpts = {
    "device" : [ String, null ],
    "ignore" : Boolean,
    "device-list" : Boolean,
    "version" : Boolean,
    "help":     Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};

var shortHands = {
    "d" : [ "--device" ],
    "i" : [ "--ignore" ],
    "D" : [ "--device-list" ],
    "V" : [ "--version" ],
    "h": ["--help"],
    "v": ["--level", "verbose"]
};

var argv = nopt(knownOpts, shortHands, process.argv, 2 /** drop 'node' &  'ares-install.js'*/);

log.heading = processName;
log.level = argv.level || 'warn';
log.verbose("argv", argv);

/**
 * For consistent of "$command -v", argv is used.
 * By nopt, argv is parsed and set key-value in argv object.
 * If -v or --level option is input with command, it is set key-value in argv.
 * After it is deleted, If remained key is only one in argv object
 * (If any other are remained, it's mean another options is input)
 * and there is no remaining after parsing the input command by nopt
 * (If any other are remained, it's mean another parameters ares input),
 * each command of webOS CLI print help message with log message.
 */
if (argv.level) {
    delete argv.level;
    if (argv.argv.remain.length===0 && (Object.keys(argv)).length === 1) {
        argv.help=true;
    }
}

var op,
    options = {
        appId : 'com.ares.defaultName',
        device : argv.device,
        ignore : argv['ignore']
    };

if (argv['device-list']) {
    setupDevice.showDeviceListAndExit();
} else if (argv['version']) {
    version.showVersionAndExit();
} else if (argv.help) {
    showUsage();
    cliControl.end();
} else {
    op = push;
}

if (op) {
    version.checkNodeVersion(function(err) {
        op(finish);
    });
}

function showUsage() {
    help.display(processName, appdata.getConfig(true).profile);
}

function push(next) {
    var pusher,
        srcPaths = argv.argv.remain.slice(0, argv.argv.remain.length-1),
        dstPath = argv.argv.remain[argv.argv.remain.length-1];

    if (!srcPaths || !dstPath) {
        showUsage();
        cliControl.end(-1);
    }
    pusher = new Pusher();
    pusher.push(srcPaths, dstPath, options,finish);
}

function finish(err, value) {
    log.info("finish():", "err:", err);
    if (err) {
        log.error(processName + ": " + err.toString());
        cliControl.end(-1);
    } else {
        log.info('finish():', value);
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}
