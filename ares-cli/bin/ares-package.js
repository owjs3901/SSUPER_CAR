var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    log = require('npmlog'),
    mkdirp = require('mkdirp'),
    packageLib = require('../lib/package'),
    commonTools = require('./../lib/base/common-tools');

var cliControl = commonTools.cliControl,
    version = commonTools.version,
    help = commonTools.help,
    appdata = commonTools.appdata;

var processName = path.basename(process.argv[1]).replace(/.js/, '');

process.on('uncaughtException', function(err) {
    log.error("*** " + processName + ": " + err.toString());
    log.info('uncaughtException', err.stack);
    cliControl.end(-1);
});

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}

function PalmPackage() {
    this.destination = '.';
    this.options = {};
    this.appCnt = 0;

    var knownOpts = {
        "help": Boolean,
        "hidden-help": Boolean,
        "version": Boolean,
        "level": ['silly', 'verbose', 'info', 'http', 'warn', 'error'],
        "outdir": path,
        "check": Boolean,
        "no-minify": Boolean,
        "app-exclude": [String, Array],
        "rom": Boolean,
        "encrypt": Boolean,
        "sign" : String,
        "certificate" : String,
        "force": Boolean,
        "pkgid": String,
        "pkgversion": String,
        "pkginfofile":String
    };

    var shortHands = {
        "h":        "--help",
        "hh":       "--hidden-help",
        "V":        "--version",
        "o":        "--outdir",
        "c":        "--check",
        "n":        "--no-minify",
        "e":        "--app-exclude",
        "r":        "--rom",
        "enc":      "--encrypt",
        "s":        "--sign",
        "crt":      "--certificate",
        "f":        "--force",
        "pi":       "--pkgid",
        "pv":       "--pkgversion",
        "pf":       "--pkginfofile",
        "v":        ["--level", "verbose"]
    };

    this.argv = require('nopt')(knownOpts, shortHands, process.argv, 2 /*drop 'node' & basename*/);

    this.hiddenhelpString = [
        "",
        "EXTRA-OPTION",
        help.format("-f, --force", "Make .ipk package forcibly with same file structure in APP_DIR"),
        help.format("","If file/directories in APP_DIR consists of the following structure"),
        help.format("\t (ex) APP_DIR/"),
        help.format("\t           +-- usr/"),
        help.format("\t           +-- usr/bin"),
        help.format("\t           +-- usr/bin/foo"),
        help.format("\t           +-- etc/"),
        help.format("\t           +-- etc/boo.conf"),
        help.format("","'-f, --force' option will keep this structure in .ipk"),
        "",
        help.format("-pn, --pkgname <NAME>", "Set package name"),
        help.format("-pv, --pkgversion <VERSION>", "Set package version"),
        "EXAMPLES",
        "",
        "# Create a package although directory has no appinfo.json and no services.json",
        "  make a ipk file which of package name is 'foopkg' and package version is '1.0.1'",
        "  the following command should generate a foopkg_1.0.1.ipk",
        processName+" APP_DIR -f -pn foopkg -pv 1.0.1",
        ""
    ];

    log.heading = processName;
    log.level = this.argv.level || 'warn';
    log.verbose("argv", this.argv);

    /**
     * For consistent of "$command -v", argv is used.
     * By nopt, argv is parsed and set key-value in argv object.
     * If -v or --level option is input with command, it is set key-value in argv.
     * After it is deleted, If remained key is only one in argv object
     * (If any other are remained, it's mean another options is input)
     * and there is no remaining after parsing the input command by nopt
     * (If any other are remained, it's mean another parameters ares input),
     * each command of webOS CLI print help message with log message.
     */
    if (this.argv.level) {
        delete this.argv.level;
        if (this.argv.argv.remain.length === 0 && (Object.keys(this.argv)).length === 1) {
            this.argv.help=true;
        }
    }
}

PalmPackage.prototype = {
    unsupportedOptions: {
        "noclean": 1,           // Do not cleanup temporary directories - For debug only
        "force": 1
    },

    showUsage: function(hiddenFlag, exitCode) {
        if (exitCode === undefined) {
            exitCode = 0;
        }
        if (hiddenFlag) {
            help.display(processName, appdata.getConfig(true).profile, hiddenFlag);
        } else {
            help.display(processName, appdata.getConfig(true).profile);
        }
        cliControl.end(exitCode);
    },

    checkAndShowHelp: function() {
        if (this.argv.help) {
            this.showUsage(false, 0);
        } else if (this.argv["hidden-help"]) {
            this.showUsage(true, 0);
        }
    },

    handleOptions: function() {
        this.options.level = log.level;

        // Pass unsupported options verbatim thru the options Object -- TODO: TBR
        for(var key in this.argv) {
            if (this.unsupportedOptions[key]) {
                this.options[key] = this.argv[key];
            }
        }

        if (this.argv.hasOwnProperty('minify')) {
            this.options.minify = this.argv.minify;
        } else {
            this.options.minify = true;
        }

        if (this.argv.hasOwnProperty('app-exclude')) {
            for(var excl_file in this.argv) {
                if (this.argv[excl_file] == "appinfo.json") {
                    this.exitOnError("You cannot exclude appinfo.json file");
                }
            }
            this.options.excludefiles = this.argv['app-exclude'];
        }

        if (this.argv.hasOwnProperty('rom')) {
            this.options.rom = this.argv.rom;
        } else {
            this.options.rom = false;
        }

        if (this.argv.hasOwnProperty('encrypt')) {
            this.options.encrypt = this.argv.encrypt;
        } else {
            this.options.encrypt = false;
        }

        if (this.argv.hasOwnProperty('sign')) {
            if (!fs.existsSync(path.resolve(this.argv.sign))) {
                this.exitOnError(this.argv.sign + " does not exist");
            }
            this.options.sign = this.argv.sign;
        }

        if (this.argv.hasOwnProperty('certificate')) {
            if (!fs.existsSync(path.resolve(this.argv.certificate))) {
                this.exitOnError(this.argv.certificate + " does not exist");
            }
            this.options.certificate = this.argv.certificate;
        }

        //check sign option must be used with certificate option
        if ((this.options.sign && !this.options.certificate) ||
                (this.options.certificate && !this.options.sign)) {
            this.exitOnError("sign, certificate option should always be used together");
        }

        if (this.argv.hasOwnProperty('pkgid')) {
            this.options.pkgid = this.argv.pkgid;
        }

        if (this.argv.hasOwnProperty('pkgversion')) {
            this.options.pkgversion = this.argv.pkgversion;
        }

        if (this.argv.hasOwnProperty('pkginfofile')) {
            this.options.pkginfofile = this.argv.pkginfofile;
        }
    },

    exitOnError: function(msg) {
        log.error("*** " + processName + ": "+ msg);
        cliControl.end(-1);
    },

    packageReady: function(err, results) {
        log.info("projectReady");
        if (err) {
            log.error("*** " + processName + ": "+ err.toString());
            log.verbose(err.stack);
            cliControl.end(-1);
        } else {
            if (results && results[results.length-1] && results[results.length-1].msg) {
                console.log(results[results.length-1].msg);
            }
            cliControl.end();
        }
    },

    appOk: function(err, results) {
        log.info("appOk");
        if (err) {
            log.error("*** " + processName + ": "+ err.toString());
            cliControl.end(-1);
        } else {
            console.log("no problems detected");
            cliControl.end();
        }
    },

    setOutputDir: function(next) {
        log.info("setOutputDir");

        if (this.argv.outdir) {
            this.destination = this.argv.outdir;
        }

        if (this.destination === '.') {
            this.destination = process.cwd();
        }

        // Check that the directorie exist
        if (fs.existsSync(this.destination)) {
            var stats = fs.statSync(this.destination);
            if ( ! stats.isDirectory()) {
                this.exitOnError("'" + this.destination + "' is not a directory");
            }
        } else {
            log.verbose("creating directory '" + this.destination + "' ...");
            mkdirp.sync(this.destination);
        }
        this.destination = fs.realpathSync(this.destination);
        next();
    },

    checkInputDir: function(next) {
        log.info("checkInputDir");
        var packager = new packageLib.Packager(this.options);
        this.appCnt = packager.checkInputDirectories(this.argv.argv.remain, this.options, next);
    },

    packageApp: function(next) {
        log.info("packageApp");
        var packager = new packageLib.Packager(this.options);
        if(this.appCnt === 0) { //only service packaging
            if (this.options.hasOwnProperty('pkginfofile') && this.options.hasOwnProperty('pkgid')) {
                log.error("*** pkgid option and pkginfofile option can not be entered together");
                cliControl.end(-1);
            }
            else if (this.options.hasOwnProperty('pkgid')) {
                packager.servicePackging(this.argv.argv.remain, this.destination, this.options, next);
            }
            else if (this.options.hasOwnProperty('pkginfofile')) {
                packager.servicePackging(this.argv.argv.remain, this.destination, this.options, next);
            }
            else {
                log.error("*** Only service packaging must input package ID by pkgid option OR packageinfo.json by pkginfofile option");
                cliControl.end(-1);
            }
        }
        else { //app+service packaging
            if (this.options.hasOwnProperty('pkgid') || this.options.hasOwnProperty('pkgversion') || this.options.hasOwnProperty('pkginfofile')) {
                log.error("*** When packaging app, pkgid, pkgversion and pkginfofile options can not be used");
                cliControl.end(-1);
            }
            packager.generatePackage(this.argv.argv.remain, this.destination, this.options, next);
        }
    },

    packageProject: function() {
        async.series([
                version.checkNodeVersion,
                this.setOutputDir.bind(this),
                this.checkInputDir.bind(this),
                this.packageApp.bind(this)
            ],
            this.packageReady.bind(this));
    },

    checkApplication: function() {
        async.series([
                version.checkNodeVersion,
                this.checkInputDir.bind(this)
            ],
            this.appOk.bind(this));
    },

    exec: function() {
        this.handleOptions();
        this.checkAndShowHelp();

        if (this.argv.check) {
            this.checkApplication();
        } else if (this.argv.version) {
            version.showVersionAndExit();
        } else {
            this.packageProject();
        }
    }
};

//Main
var cmd = new PalmPackage();
cmd.exec();