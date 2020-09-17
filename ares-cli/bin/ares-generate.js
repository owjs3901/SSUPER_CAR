#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    nopt = require('nopt'),
    async = require('async'),
    inquirer = require('inquirer'),
    log = require('npmlog');

var readJsonSync = require('./../lib/util/json').readJsonSync,
    Generator = require('./../lib/generator'),
    commonTools = require('./../lib/base/common-tools');

var cliControl = commonTools.cliControl,
    version = commonTools.version,
    help = commonTools.help,
    errMsg = commonTools.errMsg,
    appdata = commonTools.appdata;

var processName = path.basename(process.argv[1]).replace(/.js/, '');

process.on('uncaughtException', function (err) {
    log.error("*** " + processName + ": "+ err.toString());
    log.info('uncaughtException', err.stack);
    cliControl.end(-1);
});

if (process.argv.length === 2) {
    process.argv.splice(2, 0, '--help');
}

var idx;
if ((idx = process.argv.indexOf('--list')) !== -1 || (idx = process.argv.indexOf('-l')) !== -1) {
    if (process.argv[idx+1] && process.argv[idx+1].toString().match(/^-/)) {
        process.argv.splice(idx+1, 0, 'true');
    }
}

var knownOpts = {
    "help": Boolean,
    "version": Boolean,
    "list": String,
    "overwrite": Boolean,
    "servicename": String,
    "template": String,
    "property": [String, Array],
    "no-query": Boolean,
    "level": ['silly', 'verbose', 'info', 'http', 'warn', 'error']
};

var shortHands = {
    "h":        "--help",
    "V":        "--version",
    "l":        "--list",
    "f":        "--overwrite",
    "t":        "--template",
    "p":        "--property",
    "s":        "--servicename",
    "nq":       "--no-query",
    "v":        ["--level", "verbose"]
};

var argv = nopt(knownOpts, shortHands, process.argv, 2 /*drop 'node' & 'ares-install.js'*/);

log.heading = processName;
log.level = argv.level || 'warn';
log.verbose("argv", argv);

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
if (argv.level) {
    delete argv.level;
    if (argv.argv.remain.length===0 && (Object.keys(argv)).length === 1) {
        argv.help=true;
    }
}

var op,
    generator,
    config = appdata.getConfig(true),
    options = {
        tmplFile: path.join(__dirname, '/../files/conf/', 'template.json'),
        overwrite: argv.overwrite,
        tmplName: argv.template,
        listType: argv.list,
        props: argv.property || [],
        appinfo: {},
        pkginfo: {},
        svcinfo: {},
        svcName: argv.servicename,
        query: ((argv.hasOwnProperty('query')) ? argv.query : true),
        out: argv.argv.remain[0]
    };

if (argv.help) {
    showUsage();
    cliControl.end();
} else if (argv.close) {
    op = close;
} else if (argv['version']) {
    version.showVersionAndExit();
} else if (argv.list) {
    op = list;
} else {
        op = generate;
}

if (op) {
    version.checkNodeVersion(function(err) {
        async.series([
            op.bind(this)
        ],finish);
    });
}

function showUsage(hiddenFlag) {
    if (hiddenFlag) {
        help.display(processName, appdata.getConfig(true).profile, hiddenFlag);
    } else {
        help.display(processName, appdata.getConfig(true).profile);
    }
}

function getGenerator() {
    if (!generator) {
        generator = new Generator(options.tmplFile)
    }
    return generator;
}

function list(next) {
    var gen = getGenerator();
    gen.showTemplates(options.tmplFile, options.listType);
    next();
}

function parsePropArgs(targetInfo) {
    var props = options.props;
    var info = targetInfo;
    if (props.length === 1 && props[0].indexOf('{') !== -1 && props[0].indexOf('}') !== -1 &&
        ( (props[0].split("'").length - 1) % 2) === 0)
    {
        props[0] = props[0].replace(/\'/g,'"');
    }
    props.forEach(function(prop) {
        try {
            var data = JSON.parse(prop);
            for (k in data) {
                info[k] = data[k];
            }
        } catch (err) {
            var tokens = prop.split('=');
            if (tokens.length === 2) {
                info[tokens[0]] = tokens[1];
            } else {
                log.warn('Ignoring invalid arguments:', prop);
            }
        }
    });
}

function getQueryFile(profile, type) {
    var fileName = "query-"+ type + ".json";
    var queryFile = path.join(__dirname, "../files/conf/query", fileName);
    return queryFile;
}

function queryInfo(queryFile) {
    var queries = readJsonSync(queryFile);
    var questions = [];
    for (q in queries) {
        var question = {};
        question.type = "input";
        question.name = q;
        question.message = queries[q].query;
        question.default = queries[q].default;
        questions.push(question);
    }
    return inquirer.prompt(questions, function(answers) {
        return answers;
    });
}

function generate(next) {
    var gen = getGenerator();
    var templates = gen.getTemplates();
    if (!options.tmplName) {
        for (var name in templates) {
            if (templates[name].default) {
                options.tmplName = name;
                break;
            }
        }
    }
    if (!options.tmplName) {
        return next(new Error('please set template name.'));
    }
    if (!options.out) {
        return next(new Error('please set output directory.'));
    }
    Promise.resolve()
        .then(function() {
            var overwrite = !!options.overwrite,
                useInquirer = !!options.query,
                dest = path.resolve(options.out),
                existDir = gen.existOutDir(dest);

            var questions = [{
                type: "confirm",
                name: "overwrite",
                message: "The directory already exists. The template files in the directory will be replaced. Continue?",
                default: false,
                when: function(answers) {
                    return !overwrite && useInquirer && existDir;
                }
            }];
            return inquirer.prompt(questions).then(function(answers) {
                options.overwrite = answers.overwrite || options.overwrite;
                if (existDir && !options.overwrite) {
                    throw new Error(dest + " is not empty. Please check the directory.");
                }
            });
        })
        .then(function() {
            var template = templates[options.tmplName];
            if (!template) throw "Invalid template name";
            if (!template.type) {
                return;
            }
            if(!options.props.length) { //query mode
                if (options.query && options.tmplName.match(/(^hosted)/)) {
                    var queryFile = getQueryFile(config.profile, 'hosted');
                    return queryInfo(queryFile).then(function(info) {
                        for (i in info) {
                            options.appinfo[i] = info[i];
                        }
                        return;
                    });
                } else if (options.query && template.type.match(/(app$|appinfo$)/)) {
                    var queryFile = getQueryFile(config.profile, 'app');
                    return queryInfo(queryFile).then(function(info) {
                        for (i in info) {
                            options.appinfo[i] = info[i];
                        }
                        return;
                    });
                } else if (options.query && !options.svcName &&
                    template.type.match(/(service$|serviceinfo$)/)) {
                    var queryFile = getQueryFile(config.profile, 'service');
                    return queryInfo(queryFile).then(function(info) {
                        //FIXME: hard-coded considering info.id is servicename
                        if (info.id) options.svcName = info.id;
                        return;
                    });
                } else if (options.query && template.type.match(/(package$|packageinfo$)/)) {
                    var queryFile = getQueryFile(config.profile, 'package');
                    return queryInfo(queryFile).then(function(info) {
                        for (i in info) {
                            options.pkginfo[i] = info[i];
                        }
                        return;
                    });
                } else {
                    return;
                }
            } else { //property mode
                if (template.type.match(/(app$|appinfo$)/)) {
                    parsePropArgs(options.appinfo);
                } else if (template.type.match(/(service$|serviceinfo$)/)) {
                    parsePropArgs(options.svcinfo);
                } else if (template.type.match(/(package$|packageinfo$)/)) {
                    parsePropArgs(options.pkginfo);
                }
            }
        })
        .then(function() {
            return gen.generate(options)
                .then(function() {
                    finish(null, {
                        "msg": "Success"
                    });
                })
        })
        .catch(function(err) {
            finish(err);
        });
}

function finish(err, value) {
    log.info("finish():", "err:", err);
    if (err) {
        log.error(processName + ": "+ err.toString());
        log.verbose(err.stack);
        cliControl.end(-1);
    } else {
        if (value && value.msg) {
            console.log(value.msg);
        }
        cliControl.end();
    }
}
