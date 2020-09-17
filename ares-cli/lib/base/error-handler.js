/*jshint node: true, strict: false, globalstrict: false */

(function () {

    var errMsgHdlr = {};

    var ErrCodeMap = {};

    var ErrMsgMap = {
        "EACCES" : "No permission to write, please check the directory permission.",
        "ECONNREFUSED": "Please check the device IP address or port.",
        "ECONNRESET": "Unable to connect to device, please check the device.",
        "Authentication failure": "Ssh authentication failure, please check ssh connection info such as password, privatekey and username again.",
        "Time out": "Connection time out. please check the device IP address or port.",
        "connect Unknown system" : "Please check the device IP address or port.",
        "Unable to parse private key": "Wrong passphrase for ssh key, please check passphrase again.",
        "insufficient free space": "Installation failure, please check if there is sufficient free space in the disk.",
        "install failed": "Installation failure, please check the disk space.",
        "Unable to request a pseudo-terminal": "Unable to open terminal. (Target does not allow to open pty.)",
        "INVALID_ID": "lowercase letters(a-z), digits(0-9), plus(+) and minus(-) signs and periods(.) can be used for app/pkg id.",
        "INVALID_VERSION" : "The app/pkg version shall have three non-negative integers and be separated by \".\".\n\t\t  Each version number cannot exceed 9 digits and cannot contain leading zeroes."
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = errMsgHdlr;
    }

    errMsgHdlr.getErrMsg = function(service, code) {
        if (ErrCodeMap.hasOwnProperty(service)) {
            return ErrCodeMap[service][code];
        }
        return undefined;
    }

    errMsgHdlr.changeErrMsg = function(err) {
        if (!err) {
            return err;
        }
        var returnMsg;
        for (key in ErrMsgMap) {
            if (err.toString().match(new RegExp(key, "i"))) {
                returnMsg = new Error(ErrMsgMap[key]);
                break;
            }
        }
        if (!returnMsg) {
            returnMsg = err;
        }
        return returnMsg;
    }
}());
