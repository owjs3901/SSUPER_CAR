var fs = require('fs'),
    async = require('async'),
    npmlog = require('npmlog'),
    util = require('util'),
    path = require('path'),
    streamBuffers = require("stream-buffers"),
    ssh2 = require('ssh2'),
    novacom = require('./novacom'),
    spawn = require('child_process').spawn,
    commonTools = require('./common-tools'),
    os = require( 'os' );

(function() {

    var log = npmlog;
    log.heading = 'push';
    log.level = 'warn';

    var push = {

        push: function(options,next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            var processName = path.basename(process.argv[1]).replace(/.js/, '');
            var deviceId;
            var iCount = 0;
            var totalSize = 0;
            var timeStart = new Date().getTime();
            var timeEnd = new Date().getTime();
            var sourcePath = options.sourcePath;
            var destinationPath = options.destinationPath;
            var writeIsDir = new streamBuffers.WritableStreamBuffer();
            var session;

            function _makeSession(next) {
                session = new novacom.Session(options.device, next);
            }

            function _transferFiles(next) {
                log.info('push#transferFiles():', 'sourcePath ' + sourcePath,'destinationPath '+destinationPath);
                try {
                    stats = fs.statSync(sourcePath);
                    console.log("Copying data ....");
                    timeStart = new Date().getTime();
                    // copy directory recursively
                    if (stats.isDirectory()) {
                        var dir = path.resolve(sourcePath);
                        var dirIndex = dir.length;
                        var basedir = destinationPath;
                        basedir = change_path_platform(basedir);
                        basedir = basedir.replaceAll(" ", "\\ ");

                        //On callback copy all the content of folder
                        var subdirflag = false;
                        function _createDir(next) {
                            var cmd = "[ -d " + destinationPath + " ] && echo 'd' || echo 'nd'";
                            session.run(cmd, null, writeIsDir, null, function() {
                                //Multiple file pull (src : directory)
                                if (writeIsDir.getContentsAsString() == 'd\n') {
                                    setImmediate(next,null,dir,subdirflag);
                                } else {
                                    var ls;
                                    createDir(basedir);
                                    setImmediate(next,null,dir,subdirflag);
                                }
                            });
                        }

                        function _getFiles(dir, subdirflag, next) {
                            //Get an array of files and sub-directories
                            var arrFiles = fs.readdirSync(dir);
                            var iIndex = -1;
                            if(arrFiles.length == 0) {
                                return setImmediate(next);
                            }
                            async.eachSeries(arrFiles, function(item, callback) {
                                iIndex++;
                                var dfPath = path.join(dir, item); // directory or file
                                var userpath = path.join(sourcePath, dfPath.substring(dirIndex));
                                stat = fs.statSync(dfPath);
                                //Copy File series
                                if (!stat.isDirectory()) {
                                    var filepath = path.join(destinationPath, dfPath.substring(dirIndex));
                                    filepath = change_path_platform(filepath);
                                    filepath = filepath.replaceAll(" ", "\\ ");
                                    var ls;
                                    session.put(userpath,filepath,function(err){
                                        if(err){
                                            if(err.code == 1) {
                                                err = new Error("File creation in device failed due to permission error in destination path");
                                            }
                                            return setImmediate(next, err);
                                        } else {
                                            totalSize += stat.size;
                                            iCount++;
                                            if (!options.ignore) {
                                                console.log("Push: " + userpath + " -> " + filepath);
                                            }
                                            if (subdirflag == true) {
                                                if (iIndex >= arrFiles.length - 1) {
                                                    setImmediate(next);
                                                }    
                                                else {
                                                    setImmediate(callback);
                                                }    
                                            }
                                            else {
                                                setImmediate(callback);
                                            }
                                        }
                                    });
                                }
                                //Create sub-directories
                                else if (stat.isDirectory()) {

                                    function _createsubDir(next) {
                                        var destPath = path.join(destinationPath, dfPath.substring(dirIndex));
                                        destPath = change_path_platform(destPath);
                                        destPath = destPath.replaceAll(" ", "\\ ");
                                        var subdir;
                                        createDir(destPath);
                                        setImmediate(next,null,dfPath,true);
                                    }

                                    async.waterfall([
                                            _createsubDir,
                                            _getFiles
                                        ],
                                        function(err, result) {
                                            if (!err) {
                                                setImmediate(callback);
                                            } else {
                                                finish(err, result);
                                            }
                                        }
                                    );
                                }
                            }, function(err) {
                                    setImmediate(next, err);
                            });
                        }

                        async.waterfall([
                            _createDir,
                            _getFiles
                        ], finish);

                    } else if (stats.isFile()) {
                        var IsDir = new streamBuffers.WritableStreamBuffer();
                        var dir = sourcePath;
                        var filepath = destinationPath;
                        filepath = change_path_platform(filepath);
                        filepath = filepath.replaceAll(" ", "\\ ");

                        function transferFile(next) {
                            var cmd = "[ -d " + filepath + " ] && echo 'd' || echo 'nd'";
                            session.run(cmd, null, IsDir, null, function() {
                                var ls;
                                if (IsDir.getContentsAsString() == 'd\n') {
                                    filepath = filepath + '/' + path.basename(sourcePath);
                                    filepath = filepath.replaceAll(" ", "\\ ");
                                }

                                session.put(sourcePath,filepath,function(err){
                                    if(err){
                                        if(err.code == 1) {
                                            err = new Error("File creation in device failed due to permission error in destination path");
                                        }
                                        return setImmediate(next, err);
                                    }
                                    else
                                    {
                                        totalSize += stats.size;
                                        iCount++;
                                        filepath = filepath.replaceAll("//", "/");
                                        if (!options.ignore) {
                                            console.log("Push: " + path.basename(sourcePath) + " -> " + filepath);
                                        }    
                                        setImmediate(next);
                                    }
                                });
                            });
                        }

                        async.waterfall([
                            transferFile
                        ], function(err, result) {
                            finish(err, result);
                        });
                    }
                } // End try block
                catch (err) {
                     if(err.code == 1) {
                         err = new Error("Wrong path: " + err);
                     }
                     finish(err);
                } // End catch block
            }

            function change_path_platform(destPath) { //Platform specific absolute path in device
                for (var i = 0; i < destPath.length; i++) {
                    var osCheck = os.platform();
                    if (osCheck.indexOf("win") > -1) {
                        destPath = destPath.replace("\\", "/");
                    }
                }
                return destPath;
            }

            String.prototype.replaceAll = function(token, newToken, ignoreCase) {
                var _token;
                var str = this + "";
                var i = -1;
                if (typeof token === "string") {
                    if (ignoreCase) {
                        _token = token.toLowerCase();
                        while ((i = str.toLowerCase().indexOf(token, i >= 0 ? i + newToken.length : 0)) !== -1) {
                            str = str.substring(0, i) + newToken + str.substring(i + token.length);
                        }
                    } else {
                         return this.split(token).join(newToken);
                    }
                }
                return str;
            }

            function _getdeviceInfo(next) {
                var resolver = new novacom.Resolver();
                async.waterfall([
                    resolver.load.bind(resolver)
                ], function() {
                       getDeviceID(resolver.devices);
                       setImmediate(next);
                   });
            }

            function getDeviceID(obj){
                for(var dev in obj) {
                    if(obj[dev].name!=options.device) {
                        continue;
                    }
                    deviceId=obj[dev].id;
                    break;
                }
            }

            function createDir(destPath) {             
                session.run("/bin/mkdir -p " + destPath, null, null, null, function(err) {
                    if(err) { 
                        if(err.code == 1) {
                            err = new Error("Failed creation of directory due to permission error in the destination path");
                        }
                        finish(err);
                    }
                });
            }

            function finish(err,result) {
                log.verbose("Push", "err: ", err, "result:", result);
                if(!err) {
                    timeEnd = new Date().getTime();
                    var timeDur=(timeEnd-timeStart)/(1000);
                    console.log(iCount+" file(s) pushed");
                    console.log(Math.round((totalSize)/(1024*timeDur))+" KB/s ("+totalSize+" bytes in "+timeDur+"s)");
                }
                setImmediate(next,err,result);
            }

            async.waterfall([
                _getdeviceInfo,
                _makeSession,
                _transferFiles
            ], finish);
        }       
    };
    
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = push;
    }
    
}());
