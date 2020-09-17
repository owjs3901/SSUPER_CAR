var async = require('async'),
    path = require('path'),
    npmlog = require('npmlog'),
    fs = require('fs'),
    childprocess = require('child_process'),
    novacom = require('./base/novacom'),
    errMsgHndl = require('./base/error-handler'),
    sessionLib = require('./session');

(function() {

    var log = npmlog;

    log.heading = 'logger';
    log.level = 'warn';

    var shell = {
        log: log,

        remoteRun: function(options, runCommand, next) {
            log.info('shell#remoteRun()');
            async.series([
                function(next) {
                    options.nReplies = 1;
                    options.session = new novacom.Session(options, next);
                },
                function(next) {
                    if (options && options.display) {
                        sessionLib.getSessionList(options, next);
                    } else {
                        setImmediate(next);
                    }
                },
                function(next) {
                    var execOption = {};
                    if (options.sessionId) {
                        //-t :tty, sh : shell, -c : command
                        runCommand = `docker exec -t ${options.sessionId} sh -c "${runCommand}"`;
                        execOption.pty = true;
                    }

                    log.info("shell#remoteRun()", "cmd :", runCommand);
                    options.session.runWithOption(runCommand, execOption, process.stdin, process.stdout, process.stderr, next);
                }
            ], function(err, conn) {
                setImmediate(next, err);
            });
        },

        shell: function(options, next) {
            log.info('shell#shell()');
            async.series([
                function(next) {
                    options.nReplies = 1;
                    options.session = new novacom.Session(options, next);
                },
                function(next) {
                    if (options && options.display) {
                        sessionLib.getSessionList(options, next);
                    } else {
                        setImmediate(next);
                    }
                },
                function(next) {
                    _ssh(options.session, next);
                }
            ], function(err, conn) {
                setImmediate(next, err);
            });

            var _ssh = function(session, finish) {
                log.info('shell#shell()');
                async.series([
                    function(next) {
                        if (!session) {
                            session = new novacom.Session(options, next);
                        } else {
                            setImmediate(next);
                        }
                    },
                    function(next) {
                        var winOpts = {
                            //"rows": process.stdout.rows,
                            //"columns": process.stdout.columns,
                            "term": 'screen'
                        };
                        session.ssh.shell(winOpts, function(err, stream) {
                            if (err) {
                                return setImmediate(next, errMsgHndl.changeErrMsg(err));
                            }
                            open_shell();
                            function open_putty_shell() {
                                var keydir = path.resolve(process.env.HOME || process.env.USERPROFILE, '.ssh');
                                var key_path = keydir + '\\' + session.target.privateKeyName + ".ppk";
                                fs.exists(key_path, function(exist) {
                                    if (exist) {
                                        var flag = true;
                                        var puttyCmd = childprocess.exec("putty.exe" +
                                            " -ssh " + session.target.username + "@" + session.target.host +
                                            " -P " + session.target.port + " -i " + key_path);
                                        puttyCmd.on('exit', function(err) {
                                            if (flag) {
                                                finish(err, true);
                                            }
                                        });

                                        puttyCmd.stderr.on('data', function (data) {
                                            flag = false;
                                            open_shell();
                                        });
                                    }
                                    else {
                                        open_shell();
                                    }
                                });
                            }
                            function open_shell() {
                                stream.on('exit', function(code, signal) {
                                    process.stdout.write("\n>>> Terminate the shell, bye.\n\n");
                                    log.silly('Stream :: exit :: code: ' + code + ', signal: ' + signal);
                                    session.ssh.end();
                                    next();
                                });

                                stream.on('data', function(code, signal) {
                                    arrangeWindow(stream);
                                });

                                process.stdout.on('resize', function() {
                                    arrangeWindow(stream);
                                });

                                process.stdout.write(">>> Start " + session.getDevice().name + " shell.\n");
                                process.stdout.write(">>> Type `exit` to quit.\n\n");
                                process.stdin.setRawMode(true);

                                if (options.sessionId) {
                                    let cmd = `docker exec -it ${options.sessionId} sh -l`;
                                    session.runWithOption(cmd, {pty: true}, process.stdin, process.stdout, process.stderr, function(err) {
                                        process.stdout.write("\n>>> Terminate the shell, bye.\n\n");
                                        session.ssh.end();
                                        next();
                                    });
                                } else {
                                    process.stdin.pipe(stream);
                                    stream.pipe(process.stdout);
                                }

                                function arrangeWindow(stream) {
                                    if (winOpts.rows !== process.stdout.rows || winOpts.columns !== process.stdout.columns) {
                                        stream.setWindow(process.stdout.rows, process.stdout.columns);
                                        winOpts.rows = process.stdout.rows;
                                        winOpts.columns = process.stdout.columns;
                                    }
                                }
                            }
                        });
                    }
                ], function(err, result) {
                    var flag_reboot = false;
                    if (result.indexOf("id") > 0) {
                        flag_reboot = true;
                    }
                    finish(err,flag_reboot);
                });
            };
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = shell;
    }
}());
