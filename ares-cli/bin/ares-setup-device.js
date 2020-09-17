var async = require('async'),
    fs = require('fs'),
    inquirer = require("inquirer"),
    log = require('npmlog'),
    nopt = require('nopt'),
    path = require("path"),
    Ssdp = require('ssdp-js'),
    Table = require('easy-table');

var novacom = require('./../lib/base/novacom'),
    commonTools = require('./../lib/base/common-tools');

var version = commonTools.version,
    cliControl = commonTools.cliControl,
    help = commonTools.help,
    appdata = commonTools.appdata,
    setupDevice = commonTools.setupDevice,
    isValidDeviceName = setupDevice.isValidDeviceName,
    isValidIpv4 = setupDevice.isValidIpv4,
    isValidPort = setupDevice.isValidPort;

var processName = path.basename(process.argv[1]).replace(/.js/, '');

process.on('uncaughtException', function(err) {
    log.info('uncaughtException', err.toString());
    log.error('uncaughtException', err.stack);
    cliControl.end(-1);
});

var knownOpts = {
    //generic options
    "help": Boolean,
    "level": ['silly', 'verbose', 'info', 'http', 'warn', 'error'],
    "version": Boolean,
    // command-specific options
    "list": Boolean,
    "listfull": Boolean,
    "add": [String, null],
    "remove": [String, null],
    "modify": [String, null],
    "default": [String, null],
    "search": Boolean,
    "timeout": [String, null],
    "info": [String, Array],
    "reset": Boolean
};

var shortHands = {
    // generic aliases
    "h": ["--help"],
    "v": ["--level", "verbose"],
    "V": ["--version"],
    // command-specific aliases
    "l": ["--list"],
    "F": ["--listfull"],
    "i": ["--info"],
    "a": ["--add"],
    "r": ["--remove"],
    "m": ["--modify"],
    "f": ["--default"],
    "s": ["--search"],
    "t": ["--timeout"],
    "R": ["--reset"]
};

var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-*.js'*/);

log.heading = processName;
log.level = argv.level || 'warn';
log.verbose("argv", argv);

var op,
    options = {
        name: argv.device
    },
    defaultDeviceInfo = {
        profile: appdata.getConfig(true).profile,
        host: "127.0.0.1",
        port: 22,
        username: "root",
        description: "new device description",
        files: "stream",
        default: false
    };

var questions = [];
var inqChoices = ["add", "modify"];
var dfChoices = ["set default"];
var rmChoices = ["remove"];
var totChoices = inqChoices.concat(rmChoices, dfChoices);

if (argv.list) {
    setupDevice.showDeviceListAndExit();
} else if (argv.listfull) {
    setupDevice.showDeviceListAndExit('full');
} else if (argv.reset) {
    op = reset;
} else if (argv.search || argv.timeout) {
    op = search;
} else if (argv.add || argv.modify || argv.info) {
    op = modifyDeviceInfo;
} else if (argv.default) {
    op = setDefaultDeviceInfo;
} else if (argv.remove) {
    op = removeDeviceInfo;
} else if (argv.version) {
    version.showVersionAndExit();
} else if (argv.help) {
    help.display(processName, appdata.getConfig(true).profile);
    cliControl.end();
} else {
    op = interactiveInput;
}

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

var _needInq = function(choice) {
    return function(choices) {
        return (choices.indexOf(choice) !== -1);
    };
}

function reset(next) {
    var deviceFilePath = path.join(appdata.getPath(), 'novacom-devices.json');
    async.series([
        function(next) {
            appdata.resetDeviceList(next);
        },
        setupDevice.showDeviceList.bind(this)
    ], function(err) {
        next(err);
    });
}

function replaceDefaultDeviceInfo(inDevice) {
    if (inDevice) {
        inDevice.profile = inDevice.profile || defaultDeviceInfo.profile;
        inDevice.type = inDevice.type || defaultDeviceInfo.type;
        inDevice.host = inDevice.host || defaultDeviceInfo.host;
        inDevice.port = inDevice.port || defaultDeviceInfo.port;
        inDevice.username = inDevice.username || defaultDeviceInfo.username;
        inDevice.files = inDevice.files || defaultDeviceInfo.files;
        inDevice.description = inDevice.description || defaultDeviceInfo.description;
        inDevice.default = inDevice.default || defaultDeviceInfo.default;
    }
}

function _queryAddRemove(ssdpDevices, next) {
    var selDevice = {};
    var resolver = this.resolver || (this.resolver = new novacom.Resolver());
    if (typeof ssdpDevices === 'function') {
        next = ssdpDevices;
        ssdpDevices = null;
    }
    async.waterfall([
        resolver.load.bind(resolver),
        resolver.list.bind(resolver),
        function(devices, next) {
            if (!ssdpDevices) return next(null, devices, null);
            var ssdpDevMap = {};
            ssdpDevices.forEach(function(sd) {
                var key = sd.name + ' # '+sd.address;
                for (let idx in devices) {
                    if (devices[idx].name === sd.name)
                    {
                        ssdpDevMap[key] = devices[idx];
                        ssdpDevMap[key]['op'] = 'modify';
                        ssdpDevMap[key]['host'] = sd.address;
                        break;
                    }
                }
                if (!ssdpDevMap[key]) {
                    ssdpDevMap[key] = {
                        name: sd.name,
                        host: sd.address,
                        op: 'add'
                    };
                }
            });

            questions = [{
                type: "list",
                name: "discovered",
                message: "Select",
                choices: Object.keys(ssdpDevMap)
            }];
            inquirer.prompt(questions).then(function(answers) {
                next(null, devices, ssdpDevMap[answers.discovered]);
            });
        },
        function(devices, ssdpDevice, next) {
            var deviceNames = devices.filter(function(device) {
                return (device.conn.indexOf('novacom') === -1);
            }).map(function(device) {
                return (device.name);
            });
            var transMethod = {
                stream: "stream(slow)",
                sftp: "sftp(fast)"
            };
            questions = [{
                type: "list",
                name: "op",
                message: "Select",
                choices: function() {
                    if (ssdpDevice) {
                        if (ssdpDevice.op === 'modify') return inqChoices;
                        else return ['add'];
                    } else {
                        return totChoices;
                    }
                },
                filter: function(val) {
                    return val.toLowerCase();
                },
                default: function() {
                    if (ssdpDevice && ssdpDevice.op) return ssdpDevice.op;
                    else return null;
                }
            }, {
                type: "input",
                name: "device_name",
                message: "Enter Device Name:",
                when: function(answers) {
                    return (answers.op == "add");
                },
                default: function() {
                    if (ssdpDevice && ssdpDevice.name) return ssdpDevice.name;
                    else return null;
                },
                validate: function(input) {
                    if (input.length < 1) {
                        return "Please enter device name.";
                    }
                    if (deviceNames.indexOf(input) !== -1) {
                        return "Device name is duplicated. Please use another name.";
                    }
                    if (!isValidDeviceName(input)) {
                        return "Invalid name. Please do not use letters starting with '%' or '$'.";
                    }
                    return true;
                }
            }, {
                type: "list",
                name: "device_name",
                message: "Select a device",
                choices: deviceNames,
                when: function(answers) {
                    return (["modify", "remove", "set default"].indexOf(answers.op) !== -1 && !ssdpDevice);
                }
            }];
            inquirer.prompt(questions)
            .then(function(answers) {
                devices.forEach(function(device) {
                    if (answers.device_name === device.name) {
                        selDevice = device;
                    }
                });
                selDevice.name = answers.device_name || ((ssdpDevice)? ssdpDevice.name : null);
                selDevice.mode = answers.op || ((ssdpDevice)? ssdpDevice.op : null);
                selDevice.host = (ssdpDevice)? ssdpDevice.host : (selDevice.host || null);
                next();
            });
        }
    ], function(err) {
        next(err, selDevice);
    });
}

function _queryDeviceInfo(selDevice, next) {
    var mode = selDevice.mode,
        deviceName = selDevice.name,
        resolver = this.resolver || (this.resolver = new novacom.Resolver());

    questions = [{
        type: "input",
        name: "ip",
        message: "Enter Device IP address:",
        default: function() {
            return selDevice.host || "127.0.0.1"
        },
        validate: function(answers) {
            if (!isValidIpv4(answers)) {
                return "Incorrect ip address!";
            }
            return true;
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices);
        }
    }, {
        type: "input",
        name: "port",
        message: "Enter Device Port:",
        default: function() {
            return selDevice.port || "22"
        },
        validate: function(answers) {
            if (!isValidPort(answers)) {
                return "Incorrect port number!";
            }
            return true;
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices);
        }
    }, {
        type: "input",
        name: "user",
        message: "Enter ssh user:",
        default: function() {
            return selDevice.username || "root"
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices);
        }
    }, {
        type: "input",
        name: "description",
        message: "Enter description:",
        default: function() {
            return selDevice.description || "new device"
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices);
        }
    }, {
        type: "list",
        name: "auth_type",
        message: "Select authentication",
        choices: ["password", "ssh key"],
        default: function() {
            var idx = 0;
            if (selDevice.privateKeyName) {
                idx = 1;
            }
            return idx;
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices);
        }
    }, {
        type: "password",
        name: "password",
        message: "Enter password:",
        when: function(answers) {
            return _needInq(mode)(inqChoices) && (answers.auth_type == "password");
        }
    }, {
        type: "input",
        name: "ssh_key",
        message: "Enter ssh private key file name:",
        default: function() {
            return selDevice.privateKeyName || "webos_emul"
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices) && (answers.auth_type == "ssh key");
        }
    }, {
        type: "input",
        name: "ssh_passphrase",
        message: "Enter key's passphrase:",
        default: function() {
            return selDevice.passphrase || undefined
        },
        when: function(answers) {
            return _needInq(mode)(inqChoices) && (answers.auth_type == "ssh key");

        }
    }, {
        type: "confirm",
        name: "default",
        message: "Set default ?",
        default: false,
        when: function(answers) {
            return (mode == "add");
        }
    }, {
        type: "confirm",
        name: "confirm",
        message: "Save ?",
        default: true
    }];

    inquirer.prompt(questions).then(function(answers) {
        if (answers.confirm) {
            log.info("setup-device#interactiveInput()", "Saved!");
        } else {
            log.info("setup-device#interactiveInput()", "Canceled!");
            return next(null, {
                "msg": "Canceled"
            });
        }
        var inDevice = {
          profile: appdata.getConfig(true).profile,
          name: deviceName,
          host: answers.ip,
          port: answers.port,
          description: answers.description,
          username: answers.user,
          default : answers.default
        };

        if (mode === 'add' || mode === 'modify') {
            if (answers['auth_type'] && answers['auth_type'] === "password") {
                inDevice["password"] = answers['password']
                inDevice["privateKey"] = "@DELETE@";
                inDevice["passphrase"] = "@DELETE@";
                inDevice["privateKeyName"] = "@DELETE@";
            } else if (answers['auth_type'] && answers['auth_type'] === "ssh key") {
                inDevice["password"] = "@DELETE@";
                inDevice["privateKey"] = {
                    "openSsh": answers['ssh_key']
                };
                inDevice["passphrase"] = answers['ssh_passphrase'] || "@DELETE@";
                inDevice["privateKeyName"] = "@DELETE@";
            } else {
                return next(new Error("Not supported auth type (" + answers['auth_type'] + ")"));
            }
        }

        if (mode === 'set default') {
            inDevice.default = true;
            mode = 'default';
        }

        replaceDefaultDeviceInfo(inDevice);
        if (inDevice.port) {
            inDevice.port = Number(inDevice.port);
        }
        async.series([
            resolver.load.bind(resolver),
            resolver.modifyDeviceFile.bind(resolver, mode, inDevice),
            setupDevice.showDeviceList.bind()
        ], function(err) {
            if (err) {
                return next(err);
            }
            next(null, {
                "msg": "Success to " + mode + " a device!!"
            });
        });
    })
}

function interactiveInput(next) {
    async.waterfall([
        setupDevice.showDeviceList.bind(this),
        function(next) {
            console.log("** You can modify the device info in the above list, or add new device.");
            next();
        },
        _queryAddRemove,
        _queryDeviceInfo
    ], function(err, result) {
        next(err, result);
    });
}

function search(next) {
    var TIMEOUT = 5000;
    var ssdp = new Ssdp(),
        timeout = Number(argv.timeout) * 1000 || TIMEOUT,
        discovered = [],
        end = false,
        outterNext = next,
        self = this;
    console.log("Searching...");
    log.verbose("search()#timeout:", timeout);
    ssdp.start();
    ssdp.onDevice(function(device) {
        if (!device.headers || !device.headers.SERVER
            || device.headers.SERVER.indexOf('WebOS') < 0
            || end) return;
        log.verbose("search()# %s:%s (%s)", '[Discovered]', device.name, device.address);
    });
    async.waterfall([
        function(next) {
            setTimeout(function() {
                discovered = ssdp.getList().map(function(device) {
                    end = true;
                    return {
                        "uuid": device.headers.USN.split(':')[1],
                        "name": device.name.replace(/\s/g, '_'),
                        "address": device.address,
                        "registered": false
                    }
                });
                // ssdp.destroy();
                if (discovered.length === 0) {
                    console.log("No devices is discovered.");
                    return outterNext();
                }
                log.verbose("search()#discovered:", discovered.length);
                next(null, discovered);
            }, timeout);
        },
        _queryAddRemove.bind(self),
        _queryDeviceInfo.bind(self)
    ], function(err) {
        next(err);
    });
}

function _getParams(option) {
    var inputParams = [];
    var params = {};
    if (argv[option]) {
        inputParams = [].concat(argv[option]);
    }

    if (inputParams.length === 1 && inputParams[0].indexOf('{') !== -1 && inputParams[0].indexOf('}') !== -1 &&
        ( (inputParams[0].split("'").length - 1) % 2) === 0) {
        inputParams[0] = inputParams[0].replace(/\'/g,'"');
    }
    inputParams.forEach(function(strParam) {
        try {
            var data = JSON.parse(strParam);
            for (var k in data) {
                params[k] = data[k];
            }
        } catch (err) {
            var tokens = strParam.split('=');
            if (tokens.length === 2) {
                params[tokens[0]] = tokens[1];
                log.info("Inserting params ", tokens[0] + " = " + tokens[1]);
            } else {
                log.verbose('Ignoring invalid arguments:', strParam);
            }
        }
    });

    //FIXME : -i default=true is set as "true" string
    if (params.default !== undefined && typeof params.default == "string") {
        params.default = (params.default === "true");
    }

    log.info("getParams():", "params:", JSON.stringify(params));
    return params;
}

function modifyDeviceInfo(next) {
    try {
        var mode = (argv.add)? "add" : (argv.modify)? "modify" : null;
        if (!mode) {
            return next(new Error("Please specify an option among '--add' and '--modify'"));
        }
        if (argv[mode].match(/^-/)) {
            return next(new Error("Please specify device name !!"));
        }
        var argName = (argv.info)? "info" : mode;
        var inDevice = _getParams(argName);
        if (!inDevice.name) {
            if (argv[mode] === "true") {
                return next(new Error("Please specify device name !!"));
            }
            inDevice.name = argv[mode];
        }

        if (inDevice.default !== undefined && mode === "modify") {
            log.verbose('Ignoring invalid arguments : default');
            inDevice.default = undefined;
        }

        if (inDevice.privateKey) {
            inDevice.privatekey = inDevice.privateKey;
        }
        if (typeof inDevice.privatekey === "string") {
            inDevice.privateKey = inDevice.privatekey;
            inDevice.privateKey = { "openSsh": inDevice.privateKey };
            delete inDevice.privatekey;
            inDevice.password = "@DELETE@";
        }
        if (typeof inDevice.password !== "undefined" && inDevice.password !== "@DELETE@") {
            inDevice.privateKey = "@DELETE@";
            inDevice.passphrase = "@DELETE@";
        }

        if (mode === "add") {
            replaceDefaultDeviceInfo(inDevice);
            if (!inDevice.privateKey && !inDevice.password) {
                inDevice.password = "";
            }
        }
        //check validation
        if (!isValidDeviceName(inDevice.name)) {
            return next(new Error("Invalid name!. Do not use letters starting with '%' or '$'."));
        }
        if (inDevice.host && !isValidIpv4(inDevice.host)) {
            return next(new Error("Incorrect ip address!"));
        }
        if (inDevice.port && !isValidPort(inDevice.port)) {
            return next(new Error("Incorrect port number!"));
        }
        if (inDevice.port) {
            inDevice.port = Number(inDevice.port);
        }
        if (!inDevice.profile) {
            inDevice.profile = defaultDeviceInfo.profile;
        }
        var resolver = this.resolver || (this.resolver = new novacom.Resolver());
        async.series([
            resolver.load.bind(resolver),
            resolver.modifyDeviceFile.bind(resolver, mode, inDevice),
            setupDevice.showDeviceList.bind(this)
        ], function(err) {
            if (err) {
                return next(err);
            }
            next(null, {"msg": "Success to " + mode + " a device named " + inDevice.name + "!!"});
        });
    } catch (err) {
        next(err);
    }
}

function setDefaultDeviceInfo(next) {
    try {
        var resolver = this.resolver || (this.resolver = new novacom.Resolver()),
            inDevice = {name: argv.default, default: true};
        async.series([
            resolver.load.bind(resolver),
            resolver.modifyDeviceFile.bind(resolver, 'default', inDevice),
            setupDevice.showDeviceList.bind(this)
        ], function(err) {
            if (err) {
                return next(err);
            }
            next(null, {"msg": "Success to set device named " + argv.default + " to default!!"});
        });
    } catch (err) {
        next(err);
    }
}

function removeDeviceInfo(next) {
    try {
        var resolver = this.resolver || (this.resolver = new novacom.Resolver()),
            inDevice = {name: argv.remove, profile: defaultDeviceInfo.profile};
        async.series([
            resolver.load.bind(resolver),
            resolver.modifyDeviceFile.bind(resolver, 'remove', inDevice),
            setupDevice.showDeviceList.bind(this)
        ], function(err) {
            if (err) {
                return next(err);
            }
            next(null, {"msg": "Success to remove a device named " + argv.remove + "!!"});
        });
    } catch (err) {
        next(err);
    }
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

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});
