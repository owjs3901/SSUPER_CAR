/*jshint node: true, strict: false, globalstrict: false */

var fs = require('fs'),
    path = require('path'),
    log = require('npmlog'),
    appdata = require('./cli-appdata');

(function () {
    var sdkenv = {};
    var cliData = new appdata();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sdkenv;
    }

    function SdkEnv() {
        // Read SDK ENV
        var sdkPath
            , sdkBrowserPath;
        try {
            var sdkConf = require('../files/conf/sdk.json');
            sdkPath = process.env[sdkConf['SDKPATH_ENV_NAME']];
            sdkBrowserPath = sdkConf['BROWSER_PATH_IN_SDK'][process.platform];
        } catch(e) {
            //TBD. allowing exceptions...
        }
        var browserPath = process.env["ARES_BUNDLE_BROWSER"] 
            || (sdkPath && sdkBrowserPath)? path.join(sdkPath, sdkBrowserPath) : null;
        this.envList = {};
        if (sdkPath && fs.existsSync(sdkPath)) {
            this.envList["SDK"] = sdkPath;
        }
        if (browserPath && fs.existsSync(browserPath)) {
            this.envList["BROWSER"] = browserPath;
        }
    }

    sdkenv.Env = SdkEnv;

    sdkenv.create = function() {
        return new SdkEnv();
    };

    SdkEnv.prototype = {
        getEnvList: function(next) {
            var envNameList = Object.keys(this.envList);
            setImmediate(next, null, envNameList);
        },
        getEnvValue: function(name, next) {
            var envValue = this.envList[name];
            setImmediate(next, null, envValue);
        }
    };

}());
