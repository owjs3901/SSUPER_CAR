var fs = require('fs'),
    async = require('async'),
    npmlog = require('npmlog'),
    util = require('util'),
    luna = require('./base/luna'),
    path = require('path'),
    streamBuffers = require("stream-buffers"),
    os = require( 'os' ),
    mkdirp = require('mkdirp'),
    fstream = require('fstream'),
    spawn = require('child_process').spawn,
    novacom = require('./base/novacom'),
    commonTools = require('./base/common-tools');

(function() {

    var log = npmlog;
    log.heading = 'pull';
    log.level = 'warn';

    var pull = {

        pull: function(options, next) {

            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            var deviceId;
            var iCount = 0;
            var totalSize = 0;
            var timeStart = new Date().getTime();
            var timeEnd = new Date().getTime();
            var sourcePath = options.sourcePath;
            var destinationPath = options.destinationPath;
            var writeIsFile = new streamBuffers.WritableStreamBuffer();
            var writeIsDir = new streamBuffers.WritableStreamBuffer();
            var writeDirList = new streamBuffers.WritableStreamBuffer();
            var writeFileList = new streamBuffers.WritableStreamBuffer();
            var stringArray = new Array();
            var session;

            function _makeSession(next) {
                session = new novacom.Session(options.device, next);
            }

            function _transferFiles(session, next) {
                log.info('pull#transferFiles():', 'sourcePath ' + sourcePath,'destinationPath '+destinationPath);
                try {
                    var orginalSourcePath = sourcePath;
                    var dirIndex=sourcePath.length;
                    sourcePath = sourcePath.replaceAll(" ","\\ ");
                    var cmd = "[ -f " + sourcePath + " ] && echo 'f' || echo 'nf'";
                    session.run(cmd, null, writeIsFile, null, function(){
                        console.log("Copying data ....");
                        timeStart = new Date().getTime();
                        if(writeIsFile.getContentsAsString() == 'f\n') {
                            var ls;
                            fs.exists(destinationPath, function(exists) {
                                if(exists) {
                                    stats = fs.lstatSync(destinationPath);
                                    if (stats.isDirectory()) {
                                        destinationPath = destinationPath + path.sep + path.basename(orginalSourcePath);
                                    }
                                }
                                session.get(sourcePath, destinationPath, function(err) {
                                    if(err) {
                                        return setImmediate(next, err);
                                    }
                                    else {
                                        if(!options.ignore) {
                                            console.log("Pull: " + sourcePath + " -> " + destinationPath);
                                        }
                                        stat = fs.lstatSync(destinationPath);
                                        iCount++;
                                        totalSize += stat.size;
                                        setImmediate(next);
                                    }
                                });
                            });
                        } else {
                            cmd = "[ -d " + sourcePath + " ] && echo 'd' || echo 'nd'";
                            session.run(cmd, null, writeIsDir, null,  function() {
                                if(writeIsDir.getContentsAsString() == 'd\n') {
                                    destinationPath = path.resolve(path.join(destinationPath, path.basename(sourcePath)));
                                    try {
                                        var stat = fs.lstatSync(destinationPath);
                                        if (!stat.isDirectory()) {
                                            return next(new Error(destinationPath + " exists but not a directory."));
                                        }
                                    } catch(e) {
                                        if (e && e.code === 'ENOENT') {
                                            mkdirp.sync(destinationPath);
                                        } else {
                                            return next(e);
                                        }
                                    }
                                    if (!options.ignore) {
                                        console.log("Pull: " + sourcePath + " -> " + destinationPath);
                                    }

                                    function _copyAllFolders(next) {
                                        cmd = "find " + sourcePath + " -type d -follow -print";
                                        session.run(cmd, null, writeDirList, null, function() {
                                            var stringArray = writeDirList.getContentsAsString().split('\n');
                                            async.eachSeries(stringArray, function(item, callback){
                                                var filepath=path.join(destinationPath, item.substring(dirIndex));
                                                mkdirp(filepath, function(err) {
                                                    if (!options.ignore && path.resolve(filepath) !== destinationPath) {
                                                        console.log("Pull: " + item + " -> " + filepath);
                                                    }
                                                    setImmediate(callback, err);
                                                });
                                            }, function(err) {
                                                   setImmediate(next, err);
                                            });
                                        });
                                    }

                                    function _copyAllFiles(next) {
                                        cmd = "find " + sourcePath + " -type f -follow -print";
                                        session.run(cmd, null, writeFileList, null, function() {
                                            if(writeFileList.size()==0) {
                                                return setImmediate(next);
                                            }
                                            stringArray = writeFileList.getContentsAsString().split('\n');
                                            stringArray.pop();
                                            async.eachSeries(stringArray, function(item, callback){

                                            var filepath=path.join(destinationPath, item.substring(dirIndex));
                                            session.get(item.replaceAll(" ","\\ "), filepath, function(err) {
                                                if(err) {
                                                    return setImmediate(next, err);
                                                } else {
                                                    if (!options.ignore) {
                                                        console.log("Pull: " + item + " -> " + filepath);
                                                    }
                                                    iCount++;
                                                    stat = fs.lstatSync(filepath);
                                                    totalSize += stat.size;
                                                    setImmediate(callback);
                                                }
                                            });
                                            }, function(err) {
                                                   setImmediate(next, err);
                                            });
                                        });
                                    }

                                    async.waterfall([
                                            _copyAllFolders,
                                            _copyAllFiles
                                    ], function(err, result) {
                                           setImmediate(next,err, result);
                                    });
                            } else {
                                var err = new Error("Source does not exist.");
                                return setImmediate(next,err);
                            }
                            });
                        }
                    });
                }
                catch (err) {
                    if(err.code == 1) {
                        err = new Error("Wrong path: " + err);
                    }
                    finish(err);
                }
            }

            String.prototype.replaceAll = function(token, newToken, ignoreCase) {
                var _token;
                var str = this + "";
                var i = -1;
                if( typeof token === "string" ) {
                    if( ignoreCase ) {
                        _token = token.toLowerCase();
                        while( (i = str.toLowerCase().indexOf( token, i >= 0 ? i + newToken.length : 0 ) ) !== -1) {
                            str = str.substring( 0, i ) + newToken + str.substring( i + token.length );
                        }
                    } else {
                        return this.split( token ).join( newToken );
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

            function getDeviceID(obj) {
                for(var dev in obj) {
                    if(obj[dev].name!=options.device) {
                        continue;
                    }
                    deviceId=obj[dev].id;
                    break;
                }
            }

            function finish(err,result) {
                log.verbose("Pull", "err: ", err, "result:", result);
                if(!err) {
                    timeEnd = new Date().getTime();
                    var timeDur=(timeEnd-timeStart)/(1000);
                    console.log(iCount+" file(s) pulled");
                    console.log(Math.round((totalSize)/(1024*timeDur))+" KB/s ("+totalSize+" bytes in "+timeDur+"s)");
                }
                return setImmediate(next,err,result);
            }

            async.waterfall([
                _getdeviceInfo,
                _makeSession,
                _transferFiles
            ], function(err, result) {
                finish(err,result);
            });
        }
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = pull;
    }

}());
