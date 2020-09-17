var help = require('./help-format'),
    version = require('./version-tools'),
    errMsg = require('./error-handler'),
    cliControl = require('./cli-control'),
    setupDevice = require('./setup-device'),
    appdata = require('./cli-appdata'),
    sdkenv = require('./sdkenv');


(function() {
    var commonTools = {};

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = commonTools;
    }

    commonTools.help = help;
    commonTools.version = version;
    commonTools.errMsg = errMsg;
    commonTools.cliControl = cliControl;
    commonTools.setupDevice = setupDevice;
    commonTools.appdata = new appdata();
    commonTools.sdkenv = new sdkenv.Env();
}());
