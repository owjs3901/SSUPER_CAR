/*jshint node: true, strict: false, globalstrict: false */

var fs = require("graceful-fs"),
    request = require('request'),
    path = require("path"),
    log = require('npmlog'),
    async = require("async"),
    mkdirp = require("mkdirp"),
    shelljs = require('shelljs'),
    extract = require("extract-zip"),
    appdata = require('./cli-appdata');

(function () {

    var TMPL_FILE = path.join(__dirname, 'json/templates_all.json');
    var clidata = new appdata();
    var TEMPLATES_SERVER = clidata.getConfig(true).templatesServer || "";

    function Generator(){
        this.templates = [];
        this.libraries = [];
    }

    Generator.prototype = {
        setTemplatesList : function(next){
            var self = this;
            
            async.waterfall([
                setTemplatesFromLocal.bind(self),
                setTemplates.bind(self),
                setTemplatesFromServer.bind(self),
                setTemplates.bind(self)
            ], next);

            function setTemplates(templates, next){
                var cliConfig = clidata.getConfig(true);
                for(index in templates){
                    var template = templates[index];
                    if(template.hasOwnProperty('profile') && template['profile'].indexOf(cliConfig.profile) !== -1 && template['openLevel'] <= cliConfig.openLevel){
                        var tmpls = self.templates.filter(function(tmpl){
                            return tmpl.id === template.id;
                        });
                        if(tmpls.length == 0){
                            self.templates.push(template);
                        }
                        else {
                            for(prop in template){
                                tmpls[0][prop] = template[prop];
                            }
                        }
                    }
                }
                setImmediate(next);
            }
    
            function setTemplatesFromLocal(next){
                log.verbose("generate#setTemplatesFromLocal()");
                var data = fs.readFileSync(TMPL_FILE, 'utf8');
                try {
                    var templates = JSON.parse(data).templates;
                    setImmediate(next, null, templates);
                } catch (err){
                    return next(new Error("JSON Parse Error:", err));
                }
            }

            function setTemplatesFromServer(next){
                log.verbose("generate#setTemplatesFromServer()");
                request(TEMPLATES_SERVER, function(err, res, data){
                    if(!err && res.statusCode == 200){  
                        try{
                            var templates = JSON.parse(data).templates;
                            self.templates = self.templates.concat(templates);
                        } catch (err) {
                            setImmediate(next, null, {});
                        }
                        setImmediate(next, null, templates);
                    } else {
                        setImmediate(next, null, {});
                    }
                }); 
            }
        }, 
        
        getTemplatesList : function(next){
            if(next && typeof(next) === 'function'){
                return next(null, this.templates);
            }
            return this.templates;
        },
        
        getTemplatesBy : function(prop, value, next){
            var templates = this.templates.filter(function(template){
                return template[prop].toLowerCase() === value.toLowerCase(); 
            });
            if(next && typeof(next) === 'function'){
                return next(null, templates);
            }
            return templates;
        },
        
        generate: function(options, substitutions, next){
            log.verbose("generate()", "options:", options);
            var self = this;
            var tmpls = options.tmplNames;
            var dstPath = options.dstPath;
            var session = {
                substitutions : substitutions,
                destination : dstPath
            }
            async.series([
                async.forEachSeries.bind(self, tmpls, _processTemplate)
            ], next);

            function _getTemplateById(id){
                return self.templates.filter(function(template){
                    return template['id'] === id;
                });
            }

            function _processTemplate(tmpl, next){
                log.verbose("generate#_processTemplate()", "processing Template:", tmpl);
                var self = this;
                options.version = options.version || "0.0.0";
                var template = _getTemplateById(tmpl)[0];
                if(!template){
                    return next();
                }
                if(template['files']){
                    try{
                        var data = JSON.stringify(template['files']);
                        data = data.replace(/@PLUGINDIR@/g, clidata.getAppDir()).replace(/\\/g,'/');
                        data = data.replace(/@VERSION@/g, options.version);
                        template['files'] = JSON.parse(data);
                    } catch (err){
                        return next(err, new Error("JSON Parse Error : template data is invalid!!"));
                    }
                }
                
                template['files'] = template['files'] || [];
                template['deps'] = template['deps'] || [];

                async.series([
                    async.forEachSeries.bind(self, template['deps'], _processTemplate),
                    async.forEachSeries.bind(self, template['files'], _processSourceItem),
                ], next);
            }

            function _processSourceItem(item, next){
                log.verbose("generate#_processSourceItem()", "processing Source Item:", item);
                if(!item.url){
                    setImmediate(next);
                    return;
                }

                if(item.at || item.prefixToAdd){
                    var at = item.at || item.prefixToAdd;
                    item.at = session.destination + '/' + at;
                } else {
                    item.at = session.destination;
                }

                if(path.extname(item.url) === '.zip'){
                    _processZipFile(item, next);
                } else {
                    fs.stat(item.url, function(err, stats){
                        if(err){
                            next(err);
                        } else if (stats.isDirectory()){
                            _processFolder(item, next);
                        } else if (stats.isFile()){
                            _processFile(item, next);
                        } else {
                            next(new Error("Don't know how to handle '" + item.url + "'"));
                        }
                    });
                }
            }

            function _processZipFile(item, next){
                log.verbose("generate#_porcessZipFile()", "processing:", item.url);
                
                async.series([
                    _rpclItemUrl.bind(self),
                    _fetchFile.bind(self),
                    _extractZip.bind(self)
                ], next);

                function _rpclItemUrl(next){
                    if(item.url.substr(0,4) === 'http'){
                        var builtIn = path.join(clidata.getAppDir(), 'templates/built-in', path.basename(item.url));
                        var download = path.join(clidata.getPath(), 'download', path.basename(item.url));
                        if(fs.existsSync(builtIn)){
                            item.url = builtIn;
                            setImmediate(next);
                        } else if(fs.existsSync(download)){
                            var downStat = fs.statSync(download);
                            request.head(item.url, function(err, res){
                                if(!err && res.statusCode == 200 && downStat.size == res.headers['content-length']){
                                    item.url = download;
                                } 
                                setImmediate(next);
                            });
                        } else {
                            setImmediate(next);
                        }
                    } else {
                        setImmediate(next);
                    }
                }
                function _fetchFile(next){
                    try{
                        log.verbose("generate#_fetchFile()", "download path :", item.url);
                        var url = item.url;
                        var download = path.join(clidata.getPath(), 'download');
                        if(fs.existsSync(url)){
                            setImmediate(next);
                            return;
                        }
                        if(url.substr(0,4) !== 'http'){
                            setImmediate(next, new Error("Source '" + url + "' does not exists"));
                            return;
                        }
                        if(!fs.existsSync(download)){
                            mkdirp(download);
                        }
                        item.url = path.join(download, path.basename(item.url));
                        request(url).pipe(fs.createWriteStream(item.url).on('close', next));
                    } catch (err) {
                        log.error("Generate#_fetchFile()", err);
                        setImmediate(next, err);
                    }
                }
                function _extractZip(next){
                    log.verbose("generate#_extractZip()", "destination:", item.at);
                    if(!item.at){
                        setImmediate(next);
                    } else {
                        if(!fs.existsSync(item.url)){
                            setImmediate(next, new Error("Cannot find the archive file : " + item.url));
                        } else {
                            extract(item.url, {dir : item.at}, next);
                        }
                    }
                }
            }
            function _processFolder(item, next){
                log.verbose("generate#_processFolder()", "Processing:", item.url);
                async.series([
                    mkdirp.bind(null, item.at),
                    async.forEachSeries.bind(self, shelljs.ls('-R', item.url), function(file, next){
                        if(fs.lstatSync(item.url+'/'+file).isFile()){
                            mkdirp.sync(path.dirname(item.at+'/'+file));
                            shelljs.cp('-f', item.url+'/'+file, item.at+'/'+file); 
                            var substits = session.substitutions || [];
                            async.forEachSeries(substits, function(substit, next){
                                var regexp = new RegExp(substit.fileRegexp);
                                if(!regexp.test(file)){
                                    return setImmediate(next);
                                } else {
                                    _substitute(item.at+'/'+file, substit, next);
                                }
                            }, next);
                        } else { 
                            setImmediate(next);
                        }
                    })
                ], function(err){
                    setImmediate(next, err);
                });
            }
            function _processFile(item, next){
                log.verbose("generate#_processFile()", "Processing:", item.url);
                mkdirp.sync(item.at);
                shelljs.cp('-f', item.url, item.at);
                var substits = session.substitutions || [];
                async.forEachSeries(substits, function(substit, next){
                    var regexp = new RegExp(substit.fileRegexp);
                    if(!regexp.test(file)){
                        return setImmediate(next);
                    } else {
                        _substitute(item.at+'/'+file, substit, next);
                    }
                }, next);
            }
            function _substitute(file, substit, next){
                log.verbose("_substitue()", "file:", file);
                async.series([
                    function(next){
                        if(substit.json){
                            _applyJsonSubstitutions(file, substit.json, substit.add, next);
                        } else {
                            setImmediate(next);
                        }
                    }, 
                    function(next){
                        if(substit.vars){
                            _applyVarsSubstitutions(file, substit.vars, next);
                        } else {
                            setImmediate(next);
                        }
                    }, 
                    function(next){
                        if(substit.regexp){
                            _applyRegexpSubstitutions(file, substit.regexp, next);
                        } else {
                            setImmediate(next);
                        }
                    }
                ], next);
                
                function _applyJsonSubstitutions(file, json, add, next){
                    log.verbose("_applyJsonSubstitutions()", "json:", json, "in", file);
                    async.waterfall([
                        fs.readFile.bind(null, file, {encoding: 'utf8'}),
                        function(content, next){
                            content = JSON.parse(content);
                            var modified, keys = Object.keys(json);
                            keys.forEach(function(key){
                                if(content.hasOwnProperty(key) || (add && add[key])){
                                    content[key] = json[key];
                                    modified = true;
                                }
                            });

                            if(modified){
                                fs.writeFile(file, JSON.stringify(content, null, 2), {encoding:'utf8'}, next);
                            } else {
                                setImmediate(next);
                            }
                        }
                    ], next);
                }
                function _applyVarsSubstitutions(file, changes, next){
                    log.verbose("_applyVarsSubstitutions()", "variables in", file);
                    async.waterfall([
                        fs.readFile.bind(null, file, {encoding:'utf8'}),
                        function(content, next){
                            Object.keys(changes).forEach(function(key){
                                var value = changes[key];
                                content = content.replace("${" + key + "}", value);
                            });
                            fs.writeFile(file, content, {encoding: 'uft8'}, next);
                        }
                    ], next);
                }
                function _applyRegexpSubstitutions(file, changes, next){
                    log.verbose("_applyRegexpSubstitutions()", "word in", file);
                    async.waterfall([
                        fs.readFile.bind(null, file, {encoding:'utf8'}),
                        function(content, next){
                            Object.keys(changes).forEach(function(key){
                                var value = changes[key];
                                var regExp = new RegExp(key, "g");
                                content = content.replace(regExp, value);
                            });
                            fs.writeFile(file, content, {encoding:'utf8'}, next);
                        }
                    ], next);
                }
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = new Generator();
    }

}());
