#!/usr/bin/env node

var nopt = require('nopt'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    log = require('npmlog'),
    commonTools = require('./../lib/base/common-tools'),
    Table = require('easy-table');

var cliControl = commonTools.cliControl,
    version = commonTools.version,
    help = commonTools.help,
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
    "help" : Boolean,
    "list" : Boolean,
    "version":  Boolean,
    "level":    ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};

var shortHands = {
    "h" : ["--help"],
    "l" : ["--list"],
    "V": ["--version"],
    "v": ["--level", "verbose"]
};
var argv = nopt(knownOpts, shortHands, process.argv, 2);

log.heading = processName;
log.level = argv.level || 'warn';
log.verbose("argv", argv);

var op;
if (argv.list) {
    op = commandList;
} else if (argv.version) {
    version.showVersionAndExit();
} else if(argv.help) {
    showUsage();
    cliControl.end();
} else {
    op = display;
}

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

function commandList (next) {
    var commandsList;
    var table = new Table();
    var profile = appdata.getConfig(true).profile;
    try {
        commandsList = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'files', 'conf', 'ares.json')));
        Object.keys(commandsList).forEach(function(cmd){
            if(commandsList[cmd]['profile'] && commandsList[cmd]['profile'].indexOf(profile) == -1){
                return;
            } else {
                if(!fs.existsSync(path.join(__dirname, cmd + '.js'))){
                    return;
                }
            }
            table.cell('CMD', cmd);
            table.cell('Description', commandsList[cmd]['description']);
            table.newRow();
        });
        console.log(table.print());
        next();
    } catch (e){
        next(new Error("JSON parsing error!"));
    }
}

function display (next) {
    var commandsList;
    try{
        commandsList = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'files', 'conf', 'ares.json')));
        for(arg in argv){
            if(commandsList.hasOwnProperty('ares-'+arg) && fs.existsSync(path.join(__dirname, 'ares-'+arg+'.js'))){
                help.display('ares-'+arg, appdata.getConfig(true).profile);
            }
        }
        next();
    } catch(e){
        next (new Error("JSON parsing error!"));
    }
}

function showUsage () {
    help.display(processName, appdata.getConfig(true).profile);
}

function finish(err, value) {
    log.info("finish():", "err:", err);
    if (err) {
        log.error(processName + ": " + err.toString());
        cliControl.end(-1);
    } else {
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}
