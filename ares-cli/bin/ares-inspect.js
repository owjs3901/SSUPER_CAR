var fs = require('fs'),
    path = require("path"),
    async = require('async'),
    log = require('npmlog'),
    nopt = require('nopt'),
    inspectLib = require('./../lib/inspect'),
    commonTools = require('./../lib/base/common-tools');

var cliControl = commonTools.cliControl,
    version = commonTools.version,
    help = commonTools.help,
    setupDevice = commonTools.setupDevice,
    appdata = commonTools.appdata;

var processName = path.basename(process.argv[1]).replace(/.js/, '');

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}

var knownOpts = {
    "device":   [String, null],
    "app":  [String, null],
    "service":  [String, Array],
    "device-list":  Boolean,
    "open": Boolean,
    "host-port": [String, null],
    "display" : [String, null],
    "version":  Boolean,
    "help":     Boolean,
    "hidden-help":      Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};

var shortHands = {
    "d": ["--device"],
    "a": ["--app"],
    "s": ["--service"],
    "D": ["--device-list"],
    "o": ["--open"],
    "P": ["--host-port"],
    "dp" : ["--display"],
    "D": ["--device-list"],
    "V": ["--version"],
    "h": ["--help"],
    "hh": ["--hidden-help"],
    "v": ["--level", "verbose"]
};

var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-inspect.js'*/);

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
        device: argv.device,
        appId: argv.app || argv.argv.remain[0],
        serviceId: argv.service,
        open: argv.open,
        hostPort: argv["host-port"],
        display : argv.display || 0
    };

process.on('uncaughtException', function (err) {
    log.error('uncaughtException', err.stack);
    cliControl.end(-1);
});

if (argv.help || argv['hidden-help']) {
    showUsage(argv['hidden-help']);
    cliControl.end();
} else if (argv['version']) {
    version.showVersionAndExit();
} else if (argv['device-list']) {
    setupDevice.showDeviceListAndExit();
} else {
    op = inspect;
}

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

function showUsage(hiddenFlag) {
    if (hiddenFlag) {
        help.display(processName, appdata.getConfig(true).profile, hiddenFlag);
    } else {
        help.display(processName, appdata.getConfig(true).profile);
    }
}

function inspect(){
    log.info("inspect():", "AppId:", options.appId, "ServiceId:", options.serviceId);

    if (!options.appId && !options.serviceId){
        showUsage();
        cliControl.end(-1);
    }

    if(argv.display !== undefined && isNaN(Number(argv.display))) {
        return finish("Please use nonnegative integer values for a \"display\" option");
    }

    async.series([
            inspectLib.inspect.bind(inspectLib, options, null),
            function(next) {
                //TODO: hold process to keep alive
            }
    ], function(err) {
        finish(err);
    });
}

function finish(err, value) {
    if (err) {
        log.error(processName + ": " + err.toString());
        log.verbose(err.stack);
        cliControl.end(-1);
    } else {
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
