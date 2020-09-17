var npmlog = require('npmlog'),
    luna = require('./base/luna');

(function() {
    var log = npmlog;
    log.heading = 'session';
    log.level = 'warn';

    var session ={
        log: log,
        getSessionList: function(options, next) {
            log.info("session.js#session#getSessionList()", "options.display:", options.display);
            var target = options.session.getDevice();
            var addr = target.lunaAddr.getSessionList;
            var param = {
                // luna param
                subscribe: false
            };
            var matchedSessionId = false;

            luna.sendWithoutErrorHandle(options, addr, param, function(lineObj, next) {
                var resultValue = lineObj;

                //case of exist sessionManager(auto)
                if (resultValue.returnValue) {
                    if (!options.display) {
                        options.display = 0;
                    }

                    for (i = 0; i < resultValue.sessionList.length; i++) {
                        if (resultValue.sessionList[i].deviceSetInfo.displayId === undefined) {
                            next(new Error("Not exist displayId from getSessionList"));
                        }
                        //compare returned displayId with input display
                        if (resultValue.sessionList[i].deviceSetInfo.displayId === Number(options.display)) {
                            //case the same, is going to call session call
                            options.sessionId = resultValue.sessionList[i].sessionId;
                            options.sessionInsptPort = resultValue.sessionList[i].deviceSetInfo.port.inspectorWam;
                            options.sessionCall = true;
                            matchedSessionId = true;
                            log.info("session.js#getSessionList()", "options.sessionId:", options.sessionId, "options.sessionCall:", options.sessionCall);
                        }
                    }

                    if (!matchedSessionId) {
                        next(new Error("Please use valid value for a \"display\" option"));
                    }
                }
                else {
                    log.info("sendWithoutErrorHandle error : " + resultValue.errorText);
                }
                next(null, {});
            }, next);
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = session;
    }
}());
