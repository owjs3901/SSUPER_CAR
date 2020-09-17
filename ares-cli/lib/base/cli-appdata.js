/*jshint node: true, strict: false, globalstrict: false */

var
    async = require('async'),
    fs = require('fs'),
    log = require('npmlog'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    shelljs = require('shelljs'),
    Validator = require('jsonschema').Validator;

var
    clone = require('./../util/objclone').deepCopy;

var Cli = (function() {
    var instance;

    function finish(err, returnValue, next) {
        if (next && typeof next === 'function') {
            if (!returnValue) {
                return setImmediate(next, err);
            }
            return setImmediate(next, err, returnValue);
        }
        return err || returnValue;
    }

    function init() {
        var
            workDir,
            builtinDeviceListFile,
            userDeviceListFile,
            workParentDir = path.resolve(process.env.APPDATA || process.env.HOME || process.env.USERPROFILE),
            builtinFiles = {
                "config" : {
                    "dir" : path.join(__dirname, "../../files", "conf"),
                    "file" : "config.json"
                },
                "commands" : {
                    "dir" : path.join(__dirname, "../../files", "conf"),
                    "file" : "command-service.json"
                },
                "deviceList" : {
                    "dir" : path.join(__dirname, "../../files", "conf"),
                    "file" : "novacom-devices.json"
                },
                "deviceListSchema" : {
                    "dir" : path.join(__dirname, "../../files", "schema"),
                    "file" : "NovacomDevices.schema"
                },
                "template" : {
                    "dir" : path.join(__dirname, "../../files", "conf"),
                    "file" : "template.json"
                }
            };
        var queryPath = path.join(__dirname, "../../files/conf/query");
        for (key in builtinFiles) {
            var filePath = path.join( builtinFiles[key].dir, builtinFiles[key].file );
            (function(store, key, file) {
                store[key] = JSON.parse(fs.readFileSync(file));
                store[key + 'File'] = filePath;
            })(this, key, filePath);
        }

        workDir = (this.config.dataDir)? path.join(workParentDir, this.config.dataDir) : path.join(workParentDir, '.webos');
        builtinDeviceListFile = path.join(builtinFiles["deviceList"].dir, builtinFiles["deviceList"].file);
        userDeviceListFile = path.join(workDir, builtinFiles["deviceList"].file);
        this['builtinDeviceListFile'] = builtinDeviceListFile;

        if (!fs.existsSync(workDir)) {
            mkdirp.sync(workDir);
        }
        try {
            var userDeviceList = JSON.parse(fs.readFileSync(userDeviceListFile));
            var result = validateDevice(this.deviceListSchema, userDeviceList);
            if (result && result.resultValue) {
                this['deviceList'] = userDeviceList;
            } else {
                log.verbose("cliAppData() schema check failure:", userDeviceListFile);
                log.verbose("cliAppData() result:", result);
                log.verbose("cliAppData() copy " + builtinDeviceListFile + " to " + userDeviceListFile);
                shelljs.cp('-f', builtinDeviceListFile, userDeviceListFile);
            }
        } catch (err) {
            log.verbose("cliAppData()#err:", err);
            log.verbose("cliAppData() copy " + builtinDeviceListFile + " to " + userDeviceListFile);
            shelljs.cp('-f', builtinDeviceListFile, userDeviceListFile);
        }

        this['deviceListFile'] = userDeviceListFile;
        this['workDir'] = workDir;
        this['queryPath'] = queryPath;
        return true;
    }

    function validateDevice(schema, data) {
        var result = {
            resultValue: false,
            err: null
        };
        var schemaArray = {
            "id": "test",
            "type": "array",
            "items": {
                "$ref": "/deviceSchema"
            }
        };
        var v = new Validator();
        try {
            v.addSchema(schema, "/deviceSchema");
            var result =  v.validate(data, schemaArray);
            if (result && result.errors.length > 0) {
                var errMsg = "Invalid device info."
                for (idx in result.errors) {
                    errMsg = errMsg.concat("\n");
                    var errMsgLine = result.errors[idx].property + " "
                        + result.errors[idx].message;
                    var regex = /instance\[*.*\]*\./g;
                    if ((result = regex.exec(errMsgLine)) != null) {
                        errMsgLine = errMsgLine.substring(result[0].length);
                    }
                    errMsg = errMsg.concat(errMsgLine);
                }
                result.err = new Error(errMsg);
            } else {
                result.resultValue = true;
            }
        } catch (err) {
            //ignore exception
            result.err = err;
        }
        return result;
    }

    function CliAppData() {
        if (instance) {
            return instance;
        }
        instance = this;
        if (!this.inialized) {
            this.inialized = init.call(this);
        }
    }

    CliAppData.prototype = {
        getPath: function(next) {
            return finish(null, this.workDir, next);
        },

        getAppDir: function(next) {
            return finish(null, path.join(__dirname, '..'), next);
        },

        getConfig: function(next) {
            return finish(null, clone(this.config), next);
        },

        compareProfile: function(query, next) {
            next(null, query.toLowerCase() === this.config.profile.toLowerCase());
        },

        compareProfileSync: function(query){
            return query.toLowerCase() === this.config.profile.toLowerCase();
        },

        getDeviceList: function(renewal, next) {
            return finish(null, clone(this.deviceList), next);
        },

        getCommandService: function (next) {
            return finish(null, clone(this.commands), next);
        },

        setDeviceList: function(deviceListData, next) {
            try{
                var result = validateDevice(this.deviceListSchema, deviceListData);
                if (result && !result.resultValue) {
                    var err = result.err || "invalid data";
                    return finish(err, this.deviceList, next);
                }
                this.deviceList = deviceListData;
                fs.writeFileSync(this.deviceListFile, JSON.stringify(this.deviceList, null, Number(4)));
            } catch (err) {
                return finish(err, this.deviceList, next);
            }
            return finish(null, this.deviceList, next);
        },

        setConfig: function (configData, next) {
            try{
                this.config = configData;
                fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, Number(4)));
            } catch (err) {
                return finish(err, this.config, next);
            }
            return finish(null, this.config, next);
        },

        setTemplate: function (templateData, next) {
            try{
                this.template = templateData;
                fs.writeFileSync(this.templateFile, JSON.stringify(this.template, null, Number(4)));
            } catch (err) {
                return finish(err, this.template, next);
            }
        },
        setKey: function (keyPath, next) {
            try{
                var dstPubkey = path.join(__dirname, "../../files/conf", "pubkey.pem");
                if (fs.existsSync(dstPubkey)) {
                    shelljs.rm(dstPubkey);
                }
                if (keyPath) {
                    shelljs.cp(keyPath, dstPubkey);
                }
            } catch (err) {
                return finish(err, keyPath, next);
            }
            return finish(null, keyPath, next);
        },
        setQuery: function (queryBasePath, next) {
            try{
                if (fs.existsSync(this.queryPath)) {
                    shelljs.ls(this.queryPath).forEach(function(file){
                        shelljs.rm(path.join(__dirname, "../../files/conf/query",file));
                    })
                } else {
                    fs.mkdirSync(this.queryPath);
                }

                shelljs.ls(queryBasePath+'/*.json').forEach(function(file){
                        shelljs.cp(file, path.join(__dirname, "../../files/conf", "query"));
                })
            } catch (err) {
                return finish(err, this.queryPath, next);
            }
            return finish(null, this.queryPath, next);
        },
        resetDeviceList: function(next) {
            log.verbose("cliAppData resetDeviceList()");
            try {
                if (fs.existsSync(this.deviceListFile)) {
                    shelljs.rm(this.deviceListFile);
                }

                shelljs.cp(this.builtinDeviceListFile, this.deviceListFile );
                this.deviceList = JSON.parse(fs.readFileSync(this.deviceListFile));
            } catch (err) {
                log.verbose("cliAppData() resetDeviceList #err:", err);
                return finish(err, clone(this.deviceList), next);
            }
            return finish(null, clone(this.deviceList), next);
        }
    };
    return CliAppData;
}());

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cli;
}
