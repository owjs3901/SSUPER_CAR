var util = require('util'),
    async = require('async'),
    path = require('path'),
    npmlog = require('npmlog'),
    request = require('request'),
    luna = require('./base/luna'),
    streamBuffers = require("stream-buffers"),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    novacom = require('./base/novacom'),
    server = require('./base/server'),
    sdkenv  = require('./base/sdkenv'),
    installer = require('./install'),
    launcher = require('./launch');

var platformOpen = {
    win32: [ "cmd" , '/c', 'start' ],
    darwin:[ "open" ],
    linux: [ "xdg-open" ]
};

var defaultAppInsptPort = "9998";
var defaultNodeInsptPort = "8080";
var defaultServiceDebugPort = "5885";
var platformNodeVersion = "0";

//The node service debugging ways has changed based on node version 8.
const nodeBaseVersion = "8";

(function() {

    var log = npmlog;
    var serverFlag = false;

    log.heading = 'inspector';
    log.level = 'warn';

    var inspector = {

        /**
         * @property {Object} log an npm log instance
         */
        log: log,

        inspect: function(options, params, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            options.svcDbgInfo = {}; /* { id : { port : String , path : String } } */
            if (options && options.hasOwnProperty('serviceId')) {
                if (options.serviceId instanceof Array) {
                    options.serviceId.forEach(function(id) {
                        options.svcDbgInfo[id] = {};
                    })
                } else {
                    options.svcDbgInfo[options.serviceId] = {};
                }
            }
            async.series([
                _findSdkEnv,
                _getPkgList,
                _makeSession,
                _runApp,
                _runAppPortForwardServer,
                _runAppInspector,
                _runServicePortForwardServer,
                function(next) {
                    log.verbose("inspector#inspect()", "running...");
                    setImmediate(next);
                }
            ], function(err, results) {
                log.verbose("inspector#inspect()", "err: ", err, "results:", results);
                setImmediate(next, err);
            });

            function _findSdkEnv(next) {
                var env = new sdkenv.Env();
                env.getEnvValue("BROWSER", function(err, browserPath) {
                    options.bundledBrowserPath = browserPath;
                    next();
                });
            }

            function _getPkgList(next) {
                if (!options.serviceId) {
                    return next();
                }
                installer.list(options, function(err, pkgs) {
                    if (pkgs instanceof Array) {
                        options.instPkgs = pkgs;
                    }
                    next(err);
                });
            }

            function _makeSession(next) {
                options.nReplies = 1; // -n 1
                options.session = new novacom.Session(options.device, next);
            }

            function _runApp(next) {
                log.verbose("inspector#inspect()#_runApp");
                if (!options.appId || options.running) return next();
                launcher.listRunningApp(options, function(err, runningApps) {
                    var strRunApps = "";
                    var cnt = 0;
                    runningApps = [].concat(runningApps);
                    var runAppIds = runningApps.map(function(app) {
                        return app.id;
                    });
                    log.verbose("inspector#inspect()#_runApp#runAppIds", runAppIds.join(','));
                    if (runAppIds.indexOf(options.appId) === -1) {
                        log.verbose("inspector#inspect()#_runApp#launch", options.appId);
                        launcher.launch(options, options.appId, {}, next);
                    } else {
                        next();
                    }
                });
            }

            function _runAppPortForwardServer(next){
                if (options.appId) {
                    var insptPort = options.sessionInsptPort || defaultAppInsptPort;
                    log.verbose("inspector#inspect()#_runAppPortForwardServer()", "insptPort : " + insptPort);
                    options.session.forward(insptPort , options.hostPort || 0 /* random port */, options.appId, next);
                } else {
                    next();
                }
            }

            function _findNewDebugPort(dbgPort, next) {
                var format = "netstat -ltn 2>/dev/null | grep :%s | wc -l";
                var cmdPortInUsed = util.format(format, dbgPort);

                async.series([
                    options.session.run.bind(options.session, cmdPortInUsed, process.stdin, _onData, process.stderr),
                ], function(err, results) {
                    if (err) {
                        next(err);
                    }
                });

                function _onData(data) {
                    var str;
                    if (Buffer.isBuffer(data)) {
                        str = data.toString().trim();
                    } else {
                        str = data.trim();
                    }
                    if (str === "0") {
                        log.verbose("inspector#inspect()#_findNewDebugPort()", "final dbgPort : " + dbgPort);
                        next(null, dbgPort);
                    } else if (str === "1") {
                        dbgPort = Number(dbgPort) +1;
                        _findNewDebugPort(dbgPort, next);
                    } else {
                        return next(new Error("Failed to get Debug Port"));
                    }
                }
            }

            function _getNodeVersion(next){
                var format = "node -v";
                var count = 0;
                async.series([
                    options.session.run.bind(options.session, format, process.stdin, _onData, process.stderr),
                ], function(err, results) {
                    if (err) {
                        next(err);
                    }
                });

                function _onData(data) {
                    if (++count > 1)
                        return;

                    if (Buffer.isBuffer(data)) {
                        platformNodeVersion = data.toString().trim();
                    } else {
                        platformNodeVersion = data.trim();
                    }

                    platformNodeVersion = platformNodeVersion[1];
                    next();
                }
            }

            function _runServicePortForwardServer(next) {
                var svcIds = Object.keys(options.svcDbgInfo).filter(function(id) {
                    return id !== 'undefined';
                });
                async.forEachSeries(svcIds, __eachServicePortForward,
                    function(err) {
                        next(err);
                    }
                );

                function __eachServicePortForward(serviceId, next) {
                    if (!serviceId) {
                        return next();
                    }
                    var dbgPort = defaultServiceDebugPort;

                    //Only for Auto, add display+1 in prefix port
                    var sessionPort = Number(options.display) +1;
                    if(options.sessionId && options.display !== undefined) {
                        dbgPort = sessionPort + dbgPort;
                    }
                    log.verbose("inspector#inspect()#_eachServicePortForward()", "sessionId : " + options.sessionId + ", default dbgPort : " + dbgPort);
                    var format = "sh /usr/bin/run-js-service -d -p %s %s";

                    var __printInspectGuide = function (svcId, next){
                        if (options.open) {
                            console.log("Can not support \"--open option\" on platform node version 8");
                        }

                        guideText = "To debug your service, set " + "\"localhost:" + options.session.getLocalPortByName(svcId)
                                    + "\" on Node's Inspector Client(Chrome DevTools, Visual Studio Code, etc.).";
                        console.log(guideText);
                        next();
                    };

                    var __launchServiceInspector = function (svcId, next) {
                        if (!options.svcDbgInfo[svcId]['port']) {
                            return next();
                        }
                        var info = platformOpen[process.platform];
                        // open browser with the following url.
                        // http://localhost:(host random port)/debug?port=(node debug port)
                        var nodeInsptUrl;
                        var ip = 'localhost';
                        var nodeInsptPort = options.session.getLocalPortByName(svcId);
                        var nodeDebugPort = options.svcDbgInfo[svcId]['port'];
                        var format = "http://%s:%s/debug?port=%s";
                        var killTimer;
                        nodeInsptUrl = util.format(format, ip, nodeInsptPort, nodeDebugPort);
                        request.get(nodeInsptUrl, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                                function _reqHandler(code, res) {
                                    if (code === "@@ARES_CLOSE@@") {
                                        res.status(200).send();
                                        killTimer = setTimeout(function() {
                                            process.exit(0);
                                        }, 2 * 1000);
                                    } else if (code === "@@GET_URL@@") {
                                        clearTimeout(killTimer);
                                        res.status(200).send(nodeInsptUrl);
                                    }
                                }

                                function _postAction(err, serverInfo) {
                                    if (err) {
                                        process.exit(1);
                                    } else {
                                        if (serverInfo && serverInfo.msg && options.open) {
                                            var serverUrl = 'http://localhost:' + serverInfo.port + '/ares_cli/ares.html';
                                            server.openBrowser(serverUrl, options.bundledBrowserPath);
                                        }
                                    }
                                }

                                console.log("nodeInsptUrl:", nodeInsptUrl);
                                server.runServer(__dirname, 0, _reqHandler, _postAction);
                                next();
                            }
                        });
                    };

                    async.waterfall([
                        function findSvcFilePath(next) {
                            if (options.instPkgs) {
                                options.instPkgs.every(function(pkg) {
                                    if (serviceId.indexOf(pkg.id) !== -1) {
                                        options.svcDbgInfo[serviceId]['path'] = path.join(path.dirname(pkg.folderPath), '..', 'services', serviceId).replace(/\\/g, '/');
                                        return false;
                                    }
                                    return true;
                                });
                            }
                            if (!options.svcDbgInfo[serviceId]['path']) {
                                return next(new Error("Failed to get service installation path '" + serviceId + "'"));
                            }
                            next();
                        },
                        function parserMeta(next) {
                            var metaFilePath = path.join(options.svcDbgInfo[serviceId]['path'], "services.json").replace(/\\/g, '/');
                            var cmdCatServiceInfo = "cat " + metaFilePath;
                            var metaData;

                            async.series([
                                    options.session.run.bind(options.session,cmdCatServiceInfo, process.stdin, _onData, process.stderr)
                            ], function(err, results) {
                                if (err) {
                                    return next(new Error("Failed to find an installed service '" + serviceId + "'"));
                                }
                            });

                            function _onData(data) {
                                if (Buffer.isBuffer(data)) {
                                    metaData = data.toString().trim();
                                } else {
                                    metaData = data.trim();
                                }
                                next(null, metaData);
                            }
                        },
                        function checkServiceType(metaData, next) {
                            try {
                                var metaInfo = JSON.parse(metaData);
                                if (metaInfo["engine"] === "native") {
                                    return next(new Error(serviceId + " is a native service, please use GDB to debug it."));
                                }
                                next();
                            } catch (err) {
                                next(err);
                            }
                        },
                        function quitPrevService(next) {
                            options.nReplies = 1;
                            var addr = {
                                "service": serviceId,
                                "method": "quit"
                            };
                            var param = {};
                            luna.send(options, addr, param, function(lineObj, innerNext) {
                                next();
                            }, next);
                        },
                        function mkDirForDbgFile(next) {
                            var cmdMkDir = "mkdir -p " + options.svcDbgInfo[serviceId]['path'] + "/_ares";
                            options.session.runNoHangup(cmdMkDir, next);
                        },
                        _findNewDebugPort.bind(this, dbgPort),
                        function makeDbgFile(port, next) {
                            dbgPort = port;
                            var cmdWriteDbgPort = "echo " + dbgPort + " > " + options.svcDbgInfo[serviceId]['path'] + "/_ares/debugger-port";
                            options.session.runNoHangup(cmdWriteDbgPort, next);
                        },
                        function(next) {
                            setTimeout(function(){
                                next();
                            },1000);
                        },
                        function runService(next) {
                            options.svcDbgInfo[serviceId]['port'] = dbgPort;
                            //if (options.session.getDevice().username == 'root') {
                            if (0) {
                                //FIXME: this cause unexpected behavior on DRD.
                                var cmdRunSvcDbg = util.format(format, dbgPort, options.svcDbgInfo[serviceId]['path']);
                                cmdRunSvcDbg = cmdRunSvcDbg.replace(/\\/g, "/");
                                options.session.runNoHangup(cmdRunSvcDbg, next);
                            } else {
                                options.nReplies = 1;
                                var addr = {
                                    "service": serviceId,
                                    "method": "info"
                                };
                                var param = {};
                                luna.send(options, addr, param, function(lineObj, innerNext) {
                                    next();
                                }, next);
                            }
                        },
                        function(next) {
                            setTimeout(function(){
                                next();
                            },1000);
                        },
                        _getNodeVersion.bind(this),
                        function doPortForward(next){
                            if (platformNodeVersion < nodeBaseVersion) {
                                options.session.forward(defaultNodeInsptPort, options.hostPort || 0 /* random port */, serviceId, next);
                            }
                            else if (platformNodeVersion >= nodeBaseVersion) {
                                options.session.forward(dbgPort, options.hostPort || 0 /* random port */, serviceId, next);
                            }
                        },
                        function clearDbgFile(next) {
                            var cmdRmDbgFile = "rm -rf " + options.svcDbgInfo[serviceId]['path'] + "/_ares";
                            options.session.runNoHangup(cmdRmDbgFile, next);
                        },
                        //FIXME: this code is need to improve.
                        function printGuide(next){
                            if (platformNodeVersion < nodeBaseVersion) {
                                __launchServiceInspector(serviceId, next);
                            }
                            else if(platformNodeVersion >= nodeBaseVersion){
                                __printInspectGuide(serviceId, next);
                            }
                        }
                    ], function(err, results) {
                        log.verbose("inspector#inspect()", "err: ", err, "results:", results);
                        next(err, results);
                    });
                }
            }

            function _runAppInspector(next) {
                if (options.appId) {
                    var url = "http://localhost:" + options.session.getLocalPortByName(options.appId);
                    var info = platformOpen[process.platform];
                    var killTimer;
                    if (options.session.target.noPortForwarding) {
                        log.verbose("inspector#inspect()","noPortForwarding");
                        var insptPort = options.sessionInsptPort || defaultAppInsptPort;
                        url = "http://" + options.session.target.host + ":" + insptPort;
                    }

                    var listFiles = [
                        { reqPath: "/pagelist.json", propName: "inspectorUrl" }, /* AFRO, BHV */
                        { reqPath: "/json/list", propName: "devtoolsFrontendUrl" } /* DRD */
                    ];

                    function _getDisplayUrl(next) {
                        listFile = listFiles.pop();
                        if (!listFile) return next();
                        request.get(url + listFile.reqPath, function (error, response, body) {
                            if (error || response.statusCode !== 200) {
                                return next();
                            }
                            var pagelist = JSON.parse(body);
                            for(var index in pagelist) {
                                if(pagelist[index].url.indexOf(options.appId) != -1 ||
                                    pagelist[index].url.indexOf(options.localIP) != -1) {
                                    if (!pagelist[index][listFile.propName]) {
                                        return next(new Error("Web inpector is already connected with the another browser. Please close the previous connection."));
                                    }
                                    url += pagelist[index][listFile.propName];
                                    listFiles = [];
                                    break;
                                }
                            }
                            next();
                        });
                    }

                    function _reqHandler(code, res) {
                        if (code === "@@ARES_CLOSE@@") {
                            res.status(200).send();
                            killTimer = setTimeout(function() {
                                process.exit(0);
                            }, 2 * 1000);
                        } else if (code === "@@GET_URL@@") {
                            clearTimeout(killTimer);
                            res.status(200).send(url);
                        }
                    }
                    function _postAction(err, serverInfo) {
                        if (err) {
                            process.exit(1);
                        } else {
                            if (serverInfo && serverInfo.msg && options.open) {
                                var serverUrl = 'http://localhost:' + serverInfo.port + '/ares_cli/ares.html';
                                server.openBrowser(serverUrl, options.bundledBrowserPath);
                            }
                        }
                    }

                    async.whilst(
                                function() { return listFiles.length > 0; },
                                _getDisplayUrl.bind(this),
                                function (err) {
                                    if (err) return next(err);
                                    console.log("Application Debugging - " + url);
                                    server.runServer(__dirname, 0, _reqHandler, _postAction);
                                }
                    );
                }
                next();
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = inspector;
    }
}())
