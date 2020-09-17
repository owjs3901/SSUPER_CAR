var util = require('util'),
    async = require('async'),
    npmlog = require('npmlog'),
    luna = require('./base/luna'),
    path = require('path'),
    novacom = require('./base/novacom');

(function() {

    var log = npmlog;
    log.heading = 'deviceInfo';
    log.level = 'warn';

    var deviceInfo = {

        /**
         * @property {Object} log an npm log instance
         */
        log: log,

        /**
         * Print system information of the given device
         * @property options {String} device the device to connect to
         */
        systemInfo: function(options, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            options = options || {};
            async.series([
                _makeSession,
                _getOsInfo,
                _getDeviceInfo,
                _getChromiumVersion,
                _getQtbaseVersion,
            ],  function(err, results) {
                log.verbose("deviceInfo#systemInfo()", "err: ", err, "results:", results);
                var resultTxt = "";
                for (var i = 1; i < results.length; i++) {
                    resultTxt += results[i] + "\n";
                }
                next(err, resultTxt.trim())
            });

            function _makeSession(next) {
                options.nReplies = 1; // -n 1
                options.session = new novacom.Session(options.device, next);
            }

            function _getOsInfo(next) {
                log.info("deviceInfo#systemInfo#_getOsInfo()");
                var target = options.session.getDevice();
                var addr = target.lunaAddr.osInfo;
                var param = {
                            // luna param
                            parameters:["webos_build_id","webos_imagename","webos_name","webos_release",
                                        "webos_manufacturing_version", "core_os_kernel_version"],
                            subscribe: false
                        };

                luna.send(options, addr, param, function(lineObj, next) {
                    log.silly("deviceInfo#systemInfo#_getOsInfo():", "lineObj:", lineObj);
                    var resultValue = lineObj;

                    if (resultValue.returnValue) {
                        log.verbose("deviceInfo#systemInfo#_getOsInfo():", "success");
                        delete resultValue.returnValue; // remove unnecessary data
                        next(null, _makeReturnTxt(resultValue));
                    }
                    else {
                        log.verbose("deviceInfo#systemInfo#_getOsInfo():", "failure");
                        log.verbose('deviceInfo#systemInfo#_getOsInfo(): luna-send command failed' +
                                    (resultValue.errorText ? ' (' + resultValue.errorText + ')' :
                                    (resultValue.errorMessage ? ' (' + resultValue.errorMessage + ')' : '')));
                    }
                }, next);
            }

            function _getDeviceInfo(next) {
                log.info("deviceInfo#systemInfo#_getDeviceInfo()");
                var target = options.session.getDevice();
                var addr = target.lunaAddr.deviceInfo;
                var param = {
                            // luna param
                            subscribe: false
                        };

                luna.send(options, addr, param, function(lineObj, next) {
                    log.silly("deviceInfo#systemInfo#_getDeviceInfo():", "lineObj:", lineObj);
                    var resultValue = lineObj;
                    var returnObj ={};

                    if (resultValue.returnValue) {
                        log.verbose("deviceInfo#systemInfo#_getDeviceInfo():", "success");
                        returnObj.device_name = resultValue.device_name;
                        returnObj.device_id = resultValue.device_id;
                        next(null, _makeReturnTxt(returnObj));
                    }
                    else {
                        log.verbose("deviceInfo#systemInfo#_getDeviceInfo():", "failure");
                        log.verbose('deviceInfo#systemInfo#_getDeviceInfo(): luna-send command failed' +
                                    (resultValue.errorText ? ' (' + resultValue.errorText + ')' :
                                    (resultValue.errorMessage ? ' (' + resultValue.errorMessage + ')' : '')));
                    }
                }, next);
            }

            function _getChromiumVersion(next) {
                log.info("deviceInfo#systemInfo#_getChromiumInfo()");
                var cmd = '/usr/bin/opkg list-installed webruntime'

                options.session.run(cmd, null, __data, __error, function(err) {
                    if (err) {
                        return next(err);
                }});

                function __data(data) {
                    var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    var exp = /\d*\.\d*\.\d*\.\d*/;
                    var version = str.match(exp);

                    next(null, "chromium_version : " + version)
                }

                function __error(data) {
                    var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    return next(new Error(str));
                }
            }

            function _getQtbaseVersion(next) {
                log.info("deviceInfo#systemInfo#_getQtbaseInfo()");
                var cmd = '/usr/bin/opkg list-installed qtbase'

                options.session.run(cmd, null, __data, __error,  function(err) {
                    if (err) {
                        next(err);
                }});

                function __data(data) {
                    var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    var exp = /\d*\.\d*\.\d*/;
                    var version = str.match(exp);
                    next(null, "qt_version : " + version)
                }

                function __error(data) {
                    var str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    return next(new Error(str));
                }
            }

            function _makeReturnTxt(resultValue){
                log.info("deviceInfo#systemInfo#_makeReturnTxt()");
                var returnTxt = "";

                for (var key in resultValue) {
                    if (resultValue[key] === undefined) {
                        resultValue[key] = "(unknown)"
                    }
                    returnTxt += key + " : " + resultValue[key] + "\n";
                }
                return returnTxt.trim();
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = deviceInfo;
    }
}());
