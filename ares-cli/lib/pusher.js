var fs = require('fs'),
    async = require('async'),
    log = require('npmlog'),
    util = require('util'),
    path = require('path'),
    streamBuffers = require("stream-buffers"),
    novacom = require('./base/novacom');

(function () {
    log.heading = 'push';
    log.level = 'warn';

    var TYPE = {
        "FILE": 'f',
        "DIR": 'd',
        "NEW": 'n'
    };

    function Pusher() {
        this.sources = [];
        this.destination = null;
    }

    module.exports = Pusher;
    var proto = Pusher.prototype;

    proto.push = function(srcPaths, dstPath, options, next) {
        /***
            1 file : dest  => dest is a file or an existing directory.
            N files : dest => dest should be an new or existing directory. (If directory is a file, error occurs.)
            dir : dest => dest should be an new or existing directory. (If directory is a file, error occurs.)
        */
        log.verbose("Puser#push()", "srcPaths:", srcPaths, ", dstPath:", dstPath);
        var self = this,
            curDstType, copyDstType;
        self.startTime = new Date().getTime();
        self.copyfilesCount = 0;
        self.totalSize = 0;
        async.waterfall([
            function(next) {
                if (options.session) { return next(null, options.session); }
                else { new novacom.Session(options.device, next); }
            },
            function(session, next) {
                options.session = session;
                getDestType(session, dstPath, function(err, type) {
                    curDstType = type;
                    if (!err && type === TYPE.FILE && srcPaths.length > 1) {
                        err = new Error("The desination exists as a file.");
                    }
                    next(err);
                });
            },
            function(next) {
                var dst,
                    session = options.session;
                async.eachSeries(srcPaths, function(src, next) {
                    async.waterfall([
                        fs.lstat.bind(fs, src),
                        function(srcStats, next) {
                            dst = dstPath;
                            if (srcStats.isFile() && srcPaths.length === 1) {
                                if (curDstType === TYPE.DIR) {
                                    dst = path.join(dstPath, path.basename(src));
                                }
                                copyDstType = TYPE.FILE;
                            } else {
                                copyDstType = curDstType;
                            }
                            next();
                        },
                        function(next) {
                            copyFilesToDst.call(self, session, src, dst, copyDstType, options, next);
                        }
                    ], function(err) {
                        next(err);
                    });
                }, next);
            }
        ], function(err) {
            var result = {};
            if (!err) {
                var durSecs = (new Date().getTime() - self.startTime) / 1000;
                console.log(self.copyfilesCount + " file(s) pushed");
                console.log(Math.round((self.totalSize)/(1024*durSecs))+" KB/s ("+self.totalSize+" bytes in "+durSecs+"s)");
                result["msg"] = "Success";
            }
            next(err, result);
        });
    }

    function copyFilesToDst(session, src, dst, dstType, options, next) {
        log.verbose("copyFilesToNewDir()","src:", src, ", dst:", dst);
        var self = this;

        var successMsg = function(src, dst, size, ignore) {
            if (!ignore) {
                console.log("Push:", src, "->", dst);
            }
            self.copyfilesCount++;
            self.totalSize += size;
        }

        async.waterfall([
            fs.lstat.bind(fs, src),
            function(stats, next) {
                if (stats.isDirectory()) {
                    log.verbose("copyFilesToNewDir()", "src is a directory");
                    if (dstType === TYPE.FILE) {
                        next(new Error("The desination exists as a file."));
                    }
                    dst = path.join(dst, path.basename(src));
                    var files = fs.readdirSync(src);
                    if (process.platform.indexOf('win') === 0) {
                        dst = dst.replace(/\\/g, '/');
                    }
                    if (src.length !== 1 && !options.ignore) {
                        console.log("Push:", src, "->", dst);
                    }
                    mkDir(session, dst, function(err) {
                      async.forEach(files, function(file, next) {
                          var nSrc = path.join(src, file);
                          copyFilesToDst.call(self, session, nSrc, dst, TYPE.NEW, options, function(err) {
                              next(err);
                          });
                      }, function(err) {
                          next(err);
                      });
                    });
                } else {
                    var dstFile;
                    if (dstType === TYPE.FILE) {
                        dstFile = dst;
                        dst = path.join(dst, '..');
                    } else {
                        dstFile = path.join(dst, path.basename(src));
                    }
                    if (process.platform.indexOf('win') === 0) {
                        dst = dst.replace(/\\/g, '/');
                        dstFile = dstFile.replace(/\\/g, '/');
                    }
                    mkDir(session, dst, function(err) {
                        log.verbose("copyFilesToNewDir()", "mkDir#dst:", dst, ",err:", err);
                        session.put(src, dstFile, function(err) {
                            if (!err) {
                                successMsg(src, dstFile, stats.size, options.ignore);
                            }
                            next(err);
                        });
                    });
                }
            }
        ], function(err) {
            next(err);
        })
    }

    function mkDir(session, dstPath, next) {
        async.series([
            session.run.bind(session, "/bin/mkdir -p " + dstPath, null, null, null)
        ], function(err) {
            if (err && err.code == 1) {
                err = new Error("Failed creation of directory due to permission error in the destination path");
            }
            next(err);
        });
    }

    function getDestType(session, dstPath, next) {
        var wStream = new streamBuffers.WritableStreamBuffer();
        var cmdDstType = "[ -d %s ] && echo 'd' || ([ -f %s ] && echo 'f' || echo 'n')";
        if (process.platform.indexOf('win') === 0) {
            dstPath = dstPath.replace(/\\/g, '/');
        }
        cmdDstType = util.format(cmdDstType, dstPath, dstPath);
        session.run(cmdDstType, null, wStream, null, function(err) {
            var dstType = wStream.getContentsAsString().trim();
            log.verbose("Puser#push()","destionation type:", dstType);
            next(err, dstType)
        });
    }
}());
