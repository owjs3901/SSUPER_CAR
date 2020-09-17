var fs = require('fs'),
    path = require("path"),
    async = require('async'),
    log = require('npmlog'),
    nopt = require('nopt'),
    Table = require('easy-table'),
    sprintf = require('sprintf-js').sprintf,
    installLib = require('./../lib/install'),
    commonTools = require('./../lib/base/common-tools');

var processName = path.basename(process.argv[1]).replace(/.js/, '');

var version = commonTools.version,
    cliControl = commonTools.cliControl,
    help = commonTools.help,
    setupDevice = commonTools.setupDevice,
    appdata = commonTools.appdata;

process.on('uncaughtException', function (err) {
    log.error('uncaughtException', err.toString());
    log.info('uncaughtException', err.stack);
    cliControl.end(-1);
});

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}

var knownOpts = {
    "device":   [String, null],
    "device-list":  Boolean,
    "list":     Boolean,
    "listfull": Boolean,
    "type":     [String, null],
    "install":  path,
    "remove":   String,
    "opkg": Boolean,
    "opkg-param":   [String, null],
    "version":  Boolean,
    "help":     Boolean,
    "hidden-help":      Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};

var shortHands = {
    "d": ["--device"],
    "i": ["--install"],
    "r": ["--remove"],
    "o": ["--opkg"],
    "op": ["--opkg-param"],
    "l": ["--list"],
    "F": ["--listfull"],
    "t": ["--type"],
    "D": ["--device-list"],
    "V": ["--version"],
    "h": ["--help"],
    "hh": ["--hidden-help"],
    "v": ["--level", "verbose"]
};
var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-install.js'*/);

log.heading = processName;
log.level = argv.level || 'warn';
installLib.log.level = log.level;
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
        appId: 'com.ares.defaultName',
        device: argv.device,
        opkg: argv['opkg'] || false,
        opkg_param:  argv['opkg-param'],
    };

if (argv.help || argv['hidden-help']) {
    showUsage(argv['hidden-help']);
    cliControl.end();
} else if (argv.list) {
    op = list;
} else if (argv.listfull) {
    op = listFull;
} else if (argv.install) {
    op = install;
} else if (argv.remove) {
    op = remove;
} else if (argv['device-list']) {
    setupDevice.showDeviceListAndExit();
} else if (argv['version']) {
    version.showVersionAndExit();
} else {
    op = install;
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

function install() {
    var pkgPath = argv.install || argv.argv.remain[0];
    var deviceName = argv.device || "" ;
    log.info("install():", "pkgPath:", pkgPath);
    if (!pkgPath) {
        showUsage();
        cliControl.end(-1);
    } else {
        if (!fs.existsSync(path.normalize(pkgPath))) {
            return finish(new Error(pkgPath + " does not exist."));
        }
    }
    installLib.install(options, pkgPath, finish);

}

function list(){
    installLib.list(options, function(err, pkgs) {
        var strPkgs = "";
        var cnt = 0;
        if (pkgs instanceof Array) pkgs.forEach(function (pkg) {
            if (argv.type) {
                if (argv.type !== pkg.type) {
                    return;
                }
            }
            if (cnt++ !== 0) strPkgs = strPkgs.concat('\n');
            strPkgs = strPkgs.concat(pkg.id);
        });
        console.log(strPkgs);
        finish(err);
    });
}

function listFull() {
    installLib.list(options, function(err, pkgs) {
        var strPkgs = "";
        if (pkgs instanceof Array) pkgs.forEach(function (pkg) {
            if (argv.type) {
                if (argv.type !== pkg.type) {
                    return;
                }
            }
            strPkgs = strPkgs.concat('----------------\n');
            strPkgs = strPkgs.concat("id:"+ pkg.id+", ");
            for (key in pkg) {
                if (key == "id") continue;
                strPkgs = strPkgs.concat(key+":").concat(pkg[key]).concat(", ");
            }
            strPkgs = strPkgs.concat('\n');
        });
        process.stdout.write(strPkgs);
        finish(err);
    });
}

function remove() {
    var pkgId = (argv.remove === 'true')? argv.argv.remain[0] : argv.remove;
    log.info("remove():", "pkgId:", pkgId);
    if (!pkgId) {
        return finish(new Error("APP_ID must be specified"));
    }
    installLib.remove(options, pkgId,finish);

}

function finish(err, value) {
    log.info("finish():", "err:", err);
    if (err) {
        log.error(processName + ": "+ err.toString());
        log.verbose(err.stack);
        cliControl.end(-1);
    } else {
        log.info('finish():', value);
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}
