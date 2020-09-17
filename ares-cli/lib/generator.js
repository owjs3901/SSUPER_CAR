#!/usr/bin/env node

"use strict"

var
    path = require('path'),
    Promise = require('bluebird'),
    inq = require('inquirer'),
    log = require('npmlog'),
    Table = require('easy-table');

var
    fs = Promise.promisifyAll(require('fs-extra'));

var
    readJsonSync = require('./util/json').readJsonSync,
    readJsonAsync = require('./util/json').readJsonAsync,
    copyToDirAsync = require('./util/copy').copyToDirAsync,
    merge = require('./util/merge');

function Generator(tmplFile) {
    var templates;

    function _setTemplates(tmplFile) {
        if (tmplFile) {
            var cliPath = path.join(__dirname, '..');
            var contents = fs.readFileSync(tmplFile);
            contents = contents.toString().replace(/\$cli-root/gi, cliPath).replace(/\\/g,'/');
            templates = JSON.parse(contents);
        } else {
            templates = null;
        }
    }
    _setTemplates(tmplFile);
    this.setTmplates = _setTemplates;
    this.getTemplates = function() {
        return templates;
    };
}

Generator.prototype.showTemplates = function(tmplFile, listType) {
    var templates = this.getTemplates();
    var table = new Table();
    var _displayType = {
        "webapp": "Web App",
        "nativeapp": "Native App",
        "webappinfo": "Web App Info",
        "nativeappinfo": "Native App Info",
        "jsservice": "JS Service",
        "nativeservice": "Native Service",
        "jsserviceinfo": "JS Service Info",
        "nativeserviceinfo": "Native Service Info",
        "icon": "Icon",
        "library": "Library",
        "packageinfo": "Package Info",
        "qmlapp": "QML App",
        "qmlappinfo": "QML App Info"
    }
    for (var name in templates) {
        if (templates[name].hide === true || !templates[name].type) continue;
        var isDefault = (templates[name].default) ? "(default) " : "";
        var branch = templates[name].branch || '-';
        var type = _displayType[templates[name].type] || templates[name].type;
        if (listType && ["true", "false", true, false].indexOf(listType) === -1) {
            if (templates[name].type &&
                (templates[name].type.match(new RegExp(listType+"$","gi")) === null)) {
                continue;
            }
        }
        table.cell('ID', name);
        table.cell('Project Type', type);
        table.cell('Version', branch);
        table.cell('Description', isDefault + templates[name].description);
        table.newRow()
    }
    console.log(table.print());
    return;
}

Generator.prototype.existOutDir = function(outDir) {
    log.verbose("Generator.existOutDir()", outDir);
    try {
        var files = fs.readdirSync(outDir);
        if (files.length>0)
            return true;
    } catch (err) {
        if (err && err.code === 'ENOTDIR') {
            throw new Error(dest + " is not a directory. Please check the directory path.");
        }
        if (err && err.code === 'ENOENT') {
            log.verbose("Generator.generate()", "The directory does not exist.");
            return false;
        }
            throw err;
    }
}

Generator.prototype.generate = function(options) {
    var
        tmplFile = options.tmplFile,
        tmplName = options.tmplName,
        appinfo = options.appinfo,
        pkginfo = options.pkginfo,
        svcinfo = options.svcinfo,
        svcName = options.svcName,
        overwrite = !!options.overwrite,
        useInquirer = !!options.query,
        out = options.out;

    var
        svcinfo,
        templates = this.getTemplates(),
        dest = path.resolve(out),
        template = templates[tmplName];

    if (!template) {
        return Promise.reject(new Error('Invalid template name'));
    }

    if (template.metadata && template.metadata.data &&
        typeof template.metadata.data === 'object') {
        appinfo = merge(appinfo, template.metadata.data)
    }

    if (svcName) {
        svcinfo['id'] = svcName;
        svcinfo['services'] = [{
            "name": svcName
        }];
    } else if (!svcName && !!svcinfo.id) {
        svcinfo['services'] = [{
            "name": svcinfo.id
        }];
    }

    return Promise.resolve()
        .then(function() {
            log.verbose("Generator.generate()", "template name:" + tmplName);
            console.log("Generating " + tmplName + " in " + dest);

            if(tmplName.match(/(^hosted)/)) {
                var srcs = [].concat(template.path);
                return Promise.all(srcs.map(function(src) {
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    var metaTmpl;
                    var url;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templates[template.metadata.id];
                    }
                    if (metaTmpl) {
                        if(appinfo.url){
                            url = appinfo.url;
                            delete appinfo.url;
                            var urlTmpl = {"path":path.join(srcs[0],'index.html')};
                            _writeURLdata(urlTmpl, url);
                        }
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            }
            else if(tmplName.match(/(^qmlapp$)/)) {
                var srcs = [].concat(template.path);
                return Promise.all(srcs.map(function(src) {
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    var metaTmpl;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templates[template.metadata.id];
                    }
                    if (metaTmpl) {
                        if(appinfo.id){
                            var qmlTmpl = {"path":path.join(srcs[0],'main.qml')};
                            _writeAppIDdata(qmlTmpl, appinfo.id);
                        }
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            }
            else if (template.type.match(/info$/)) {
                return _writeMetadata(template, appinfo, svcinfo, pkginfo);
            }
            else {
                var srcs = [].concat(template.path);
                return Promise.all(srcs.map(function(src) {
                    log.verbose("Generator.generate()", "template src:" + src);
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    var metaTmpl;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templates[template.metadata.id];
                    }
                    if (metaTmpl) {
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            }
        })
        .then(function() {
            var deps = templates[tmplName].deps || [];
            return Promise.all(deps.map(function(dep) {
                if (!templates[dep]) {
                    log.warn("Generator.generate()", "Invalid template id " + dep);
                    return;
                } else if (!templates[dep].path) {
                    log.warn("Generator.generate()", "Invalid template path " + dep);
                    return;
                }
                return copyToDirAsync(templates[dep].path, dest);
            }));
        })
        .then(function() {
            log.verbose("Generator.generate() done.");
            return {
                msg: "Success"
            };
        })
        .catch(function(err) {
            log.verbose("Generator.generate()#err:", err);
            throw err;
        });

    function _writeAppIDdata(qmlTmpl, appId) {
        var filePaths = [].concat(qmlTmpl.path);
        return Promise.all(filePaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        var msg = "Invalid metadata template path:" + file;
                        log.warn("Geneator.generate()._writeAppIDdata()#warn", "Invalid metadata template path:" + file);
                        throw new Error(msg);
                    }
                    var qmlFile = fs.readFileSync(file, 'utf8');
                    var exp = /appId\s*:\s*[\'\"][\w.]*[\'\"]/g;
                    qmlFile = qmlFile.replace(exp, "appId: \"" + appId + "\"");
                    var destFile = path.join(dest, path.basename(file));
                    fs.writeFileAsync(destFile, qmlFile, {encoding: 'utf8'});
                })
        }))
        .then( function(results) {
            log.verbose("Geneator.generate()._writeMetadata() done.");
            return;
        })
        .catch( function(err) {
            log.verbose("Geneator.generate()._writeMetadata()#err:", err);
            throw err;
        })
    }

    function _writeURLdata(urlTmpl, url) {
        var filePaths = [].concat(urlTmpl.path);
        return Promise.all(filePaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        var msg = "Invalid metadata template path:" + file;
                        log.warn("Geneator.generate()._writeURLdata()#warn", "Invalid metadata template path:" + file);
                        throw new Error(msg);
                    }
                    var html = fs.readFileSync(file, 'utf8');
                    var exp = new RegExp("(?:[\'\"])([\:/.A-z?<_&\s=>0-9;-]+\')");
                    html=html.replace(exp, "\'"+url+"\'");
                    var destFile = path.join(dest, path.basename(file));
                    fs.writeFileAsync(destFile, html, {encoding: 'utf8'});
                })
        }))
        .then( function(results) {
            log.verbose("Geneator.generate()._writeMetadata() done.");
            return;
        })
        .catch( function(err) {
            log.verbose("Geneator.generate()._writeMetadata()#err:", err);
            throw err;
        })
    }

    function _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo) {
        log.verbose("Generator.generate()._writeMetadata()")
        var metaPaths = [].concat(metaTmpl.path),
            appinfo = appinfo || {},
            svcinfo = svcinfo || {},
            pkginfo = pkginfo || {};

        return Promise.all(metaPaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        var msg = "Invalid metadata template path:" + file;
                        log.warn("Geneator.generate()._writeMetadata()#warn", "Invalid metadata template path:" + file);
                        throw new Error(msg);
                    }
                    var info = readJsonSync(file);
                    var fileName = path.basename(file);
                    if (fileName === 'appinfo.json') {
                        info = merge(info, appinfo);
                    } else if (fileName === "services.json") {
                        info = merge(info, svcinfo)
                    } else if (fileName === "package.json" &&
                        (metaTmpl.type === "jsserviceinfo" || metaTmpl.type === "nativeserviceinfo")) {
                        info['name'] = svcinfo.id || info['name'];
                    } else if (fileName === "packageinfo.json") {
                        info = merge(info, pkginfo)
                    }
                    return info;
                })
                .then(function(info) {
                    var destFile = path.join(dest, path.basename(file));
                    return fs.mkdirsAsync(dest)
                        .then(function() {
                            return fs.writeFileAsync(destFile, JSON.stringify(info, null, 2), {
                                encoding: 'utf8'
                            })
                        });
                })
        }))
        .then( function(results) {
            log.verbose("Geneator.generate()._writeMetadata() done.");
            return;
        })
        .catch( function(err) {
            log.verbose("Geneator.generate()._writeMetadata()#err:", err);
            throw err;
        })
    }
}

module.exports = Generator;
