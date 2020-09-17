var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    npmlog = require('npmlog'),
    async = require('async'),
    streamBuffers = require("stream-buffers"),
    crypto = require('crypto'),
    luna = require('./base/luna'),
    novacom = require('./base/novacom'),
    sessionLib = require('./session'),
    appdata = require('./base/cli-appdata');

(function() {

    var log = npmlog;
    log.heading = 'installer';
    log.level = 'warn';
    var cliData = new appdata();

    var installer = {

        /**
         * @property {Object} log an npm log instance
         */
        log: log,

        /**
         * Install the given package on the given target device
         * @param {Object} options installation options
         * @options options {Object} device the device to install the package onto, or null to select the default device
         * @param {String} hostPkgPath absolute path on the host of the package to be installed
         * @param {Function} next common-js callback
         */
        install: function(options, hostPkgPath, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            var hostPkgName = path.basename(hostPkgPath);
            var config = {
                'tempDirForIpk': '/media/developer/temp',
                'changeTempDir' : true,
                'removeIpkAfterInst' : true
            };
            var configData = cliData.getConfig(true);

            if (configData.install) {
                var conf = configData.install;
                for (prop in conf) {
                    if (config.hasOwnProperty(prop)) {
                        config[prop] = conf[prop];
                    }
                }
            }

            if (!hostPkgName) {
                next(new Error("Invalid package: '" + hostPkgPath + "'"));
                return;
            }

            var devicePkgPath = path.join(config.tempDirForIpk, hostPkgName).replace(/\\/g,'/'),
                os = new streamBuffers.WritableStreamBuffer();
            var appId = options.appId;
            var srcMd5, dstMd5;
            var md5DataSize = 200;
            log.info('installer#install():', 'installing ' + hostPkgPath);
            options = options || {};

            async.waterfall([

                function(next) {
                    options.nReplies = 0; // -i
                    new novacom.Session(options.device, next);
                },
                function(session, next) {
                    options.session = session;
                    setImmediate(next);
                },
                function(next) {
                    if (options.opkg) {
                        //FIXME: Need more consideration whether this condition is necessary or not.
                        if (options.session.getDevice().username != 'root') {
                            return setImmediate(next, new Error("opkg-install is only available for the device allowing root-connection"));
                        }
                    }
                    var cmd = '/bin/rm -rf ' + config.tempDirForIpk + ' && /bin/mkdir -p ' + config.tempDirForIpk;
                    if (options.session.getDevice().username === 'root') {
                        cmd += ' && /bin/chmod 777 ' + config.tempDirForIpk;
                    }
                    options.op = (options.session.target.files || 'stream') + 'Put';
                    options.session.run(cmd, null, null, null, next);
                },
                function(next) {
                    console.log("Installing package " + hostPkgPath);
                    options.session.put(hostPkgPath, devicePkgPath, next);
                },
                function(next) {
                    options.session.run("/bin/ls -l \"" + devicePkgPath + "\"", null, os, null, next);
                },
                function(next) {
                    log.verbose("installer#install():", "ls -l:", os.getContents().toString());
                    next();
                },
                function(next) {
                    var md5 = crypto.createHash('md5');
                    var buffer=new Buffer(md5DataSize);
                    var pos = 0;
                    async.waterfall([
                        fs.lstat.bind(fs, hostPkgPath),
                        function(stat, next) {
                            if (stat.size > md5DataSize) {
                                pos = stat.size-md5DataSize;
                            } else {
                                pos = 0;
                                md5DataSize = stat.size;
                            }
                            next();
                        },
                        fs.open.bind(fs, hostPkgPath, 'r'),
                        function(fd, next) {
                            fs.read(fd, buffer, 0, md5DataSize, pos, function(err, fd) {
                                md5.update(buffer);
                                next();
                            });
                        },
                        function() {
                            srcMd5 = md5.digest('hex');
                            if (!srcMd5) {
                                log.warn("installer#install():", "Failed to get md5sum from the ipk file");
                            }
                            log.verbose("installer#install():", "srcMd5:", srcMd5);
                            next();
                        }
                    ], function(err) {
                        next(err);
                    })
                },
                function(next) {
                    var cmd = "/usr/bin/tail -c " + md5DataSize + " \"" + devicePkgPath + "\" | /usr/bin/md5sum";
                    async.series([
                        function(next) {
                            options.session.run(cmd, null, _onData, null, next);
                        }
                    ], function(err) {
                        if (err) {
                            return next(err);
                        }
                    });

                    function _onData(data) {
                        var str;
                        if (Buffer.isBuffer(data)) {
                            str = data.toString().trim();
                        } else {
                            str = data.trim();
                        }
                        if (str) {
                            dstMd5 = str.split('-')[0].trim();
                            log.verbose("installer#install():", "dstMd5:", dstMd5);
                        }
                        if (!dstMd5) {
                            log.warn("installer#install():", "Failed to get md5sum from the transmitted file");
                        }
                        next();
                    }
                },
                function(next)	{
                    if (!srcMd5 || !dstMd5) {
                        log.warn("installer#install():", "Cannot verify transmitted file");
                    } else {
                        log.verbose("installer#install():", "srcMd5:", srcMd5, ", dstMd5:", dstMd5);
                        if (srcMd5 !== dstMd5) {
                            return next(new Error("File transmission error, please try again."));
                        }
                    }
                    next();
                },
                function(next) {
                    op = (options.opkg) ? _opkg : _appinstalld;
                    op(next);

                    function _opkg(next) {
                        var cmd = '/usr/bin/opkg install "' + devicePkgPath + '"';
                        cmd =  cmd.concat((options['opkg_param'])? ' ' + options['opkg_param'] : '');
                        async.series([
                            options.session.run.bind(options.session, cmd,
                                null, __data, __data),
                            options.session.run.bind(options.session, '/usr/sbin/ls-control scan-services ',
                                null, null, __data)
                        ], function(err) {
                            if (err) {
                                return next(err);
                            }
                            next(null, null);
                        });

                        function __data(data) {
                            var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                            console.log(str);
                        }
                    }

                    function _appinstalld(next) {
                        var target = options.session.getDevice();
                        var addr = target.lunaAddr.install;
                        var returnValue = addr.returnValue.split('.');
                        var param = {
                            // luna param
                            id: appId,
                            ipkUrl: devicePkgPath,
                            subscribe: true
                        };
                        options.sessionCall = false;

                        luna.send(options, addr, param, function(lineObj, next) {
                            log.verbose("installer#install():", "lineObj: %j", lineObj);
                            var resultValue = lineObj;
                            for(index = 1; index < returnValue.length; index++){
                                resultValue = resultValue[returnValue[index]];
                            }
                            if (resultValue.match(/FAILED/i)) {
                                // failure: stop
                                log.verbose("installer#install():", "failure");
                                next(new Error('luna-send command failed' +
                                        ((lineObj.details && lineObj.details.reason) ? ' (' + lineObj.details.reason + ')' :
                                        (resultValue ? ' (' + resultValue + ')' : '')
                                    )));
                            } else if (resultValue.match(/installed|^SUCCESS/i)) {
                                log.verbose("installer#install():", "success");
                                // success: stop
                                next(null, resultValue);
                            } else {
                                // no err & no status : continue
                                log.verbose("installer#install():", "waiting");
                                next(null, null);
                            }
                        }, next);
                    }
                },
                function(status, next) {
                    if (typeof status === 'function') {
                        next = status;
                    }
                    if (config.removeIpkAfterInst) {
                        options.session.run('/bin/rm -f "' + devicePkgPath + '"', null, null, null, next);
                    } else {
                        next();
                    }
                },
                function(next) {
                    options.session.end();
                    options.session = null;
                    next(null, {
                        msg: "Success"
                    });
                }
            ], function(err, result) {
                log.verbose("installer#waterfall callback err:", err);
                next(err, result);
            });
        },

        remove: function(options, packageName, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            options = options || {};
            async.waterfall([

            function(next) {
                options.nReplies = undefined; // -i
                options.session = new novacom.Session(options.device, next);
            },
            function(session, next) {
                options.session = session;
                if (options.opkg) {
                    //FIXME: Need more consideration whether this condition is necessary or not.
                    if (options.session.getDevice().username != 'root') {
                        return setImmediate(next, new Error("opkg-remove is only available for the device allowing root-connection"));
                    }
                }
                setImmediate(next);
            },
            function(next) {
                op = (options.opkg) ? _opkg : _appinstalld;
                op(next);

                function _opkg(next) {
                    var cmd = '/usr/bin/opkg remove ' + packageName;
                    cmd =  cmd.concat((options['opkg_param'])? ' ' + options['opkg_param'] : '');
                    async.series([
                        options.session.run.bind(options.session, cmd,
                            null, __data, __error),
                        options.session.run.bind(options.session, '/usr/sbin/ls-control scan-services ',
                            null, null, __error)
                    ], function(err) {
                        if (err) {
                            return next(err);
                        }
                        next(null, {});
                    });

                    function __data(data) {
                        var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                        console.log(str);
                        if (str.match(/No packages removed/g)) {
                            return next(new Error('[package Name: ' + packageName +'] ' + str));
                        }
                    }

                    function __error(data) {
                        var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                        return next(new Error(str));
                    }
                }

                function _appinstalld(next) {
                    var target = options.session.getDevice();
                    var addr = target.lunaAddr.remove;
                    var returnValue = addr.returnValue.split('.');
                    var param = {
                        // luna param
                        id: packageName,
                        subscribe: true
                    };
                    var exit = 0;
                    options.sessionCall = false;

                    luna.send(options, addr, param, function(lineObj, next) {
                        log.verbose("installer#remove():", "lineObj: %j", lineObj);
                        var resultValue = lineObj;
                        for(index = 1; index < returnValue.length; index++){
                            resultValue = resultValue[returnValue[index]];
                        }
                        if (resultValue.match(/FAILED/i)) {
                            // failure: stop
                            log.verbose("installer#remove():", "failure");
                            if (!exit++) {
                                next(new Error('luna-send command failed' +
                                        ((lineObj.details && lineObj.details.reason) ? ' (' + lineObj.details.reason + ')' :
                                        (resultValue ? ' (' + resultValue + ')' : '')
                                    )));
                            }
                        } else if (resultValue.match(/removed|^SUCCESS/i)) {
                            log.verbose("installer#remove():", "success");
                            // success: stop
                            next(null, {
                                status: resultValue
                            });
                        } else {
                            // no err & no status : continue
                            log.verbose("installer#remove():", "waiting");
                            next();
                        }
                    }, next);
                }
            }
        ], function(err, result) {
                log.verbose("installer#remove():", "err:", err, "result:", result);
                if (!err) {
                    result.msg = 'Removed package ' + packageName;
                }
                next(err, result);
            });
        },

        list: function(options, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            options = options || {};
            async.series([
                function(next) {
                    options.nReplies = 1; // -n 1
                    options.session = new novacom.Session(options.device, next);
                },
                function(next) {
                    if (options.opkg) {
                        //FIXME: Need more consideration whether this condition is necessary or not.
                        if (options.session.getDevice().username != 'root') {
                            return setImmediate(next, new Error("opkg-list is only available for the device allowing root-connection"));
                        }
                    }
                    setImmediate(next);
                },
                function(next) {
                    sessionLib.getSessionList(options, next);
                },
                function(next) {
                    op = (options.opkg) ? _opkg : _appinstalld;
                    op(next);

                    function _opkg(next) {
                        var cmd = '/usr/bin/opkg list';
                        cmd =  cmd.concat((options['opkg_param'])? ' ' + options['opkg_param'] : '');
                        async.series([
                            options.session.run.bind(options.session, cmd,
                                null, __data, __data)
                        ], function(err) {
                            if (err) {
                                return next(err);
                            }
                            next(null, {});
                        });

                        function __data(data) {
                            var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                            console.log(str);
                        }
                    }
                    function _appinstalld(next) {
                        var addr = options.session.getDevice().lunaAddr.list;
                        var returnValue = addr.returnValue.split('.');
                        var param = {
                            // luna param
                            subscribe: false
                        };

                        luna.send(options, addr, param, function(lineObj, next) {
                            var resultValue = lineObj;
                            for(index = 1; index < returnValue.length;index++){
                                resultValue = resultValue[returnValue[index]];
                            }
                            if (Array.isArray(resultValue)) {
                                // success: stop
                                for (var index = 0; index < resultValue.length; index++) {
                                    if (!resultValue[index].visible) {
                                        resultValue.splice(index, 1);
                                        index--;
                                    }
                                }
                                log.verbose("installer#list():", "success");
                                next(null, resultValue);
                            } else {
                                // failure: stop
                                log.verbose("installer#list():", "failure");
                                next(new Error("object format error"));
                            }

                        }, next);
                    }
                }
            ], function(err, results) {
                log.verbose("installer#list():", "err:", err, "results:", results[3]);
                next(err, results[3]);
            });
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = installer;
    }

}());
