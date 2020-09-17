/*jshint node: true, strict: false, globalstrict: false */

var sprintf = require('sprintf-js').sprintf,
    fs = require('fs'),
    path = require('path');

(function () {

	var helpFormat = {};
	
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = helpFormat;
	}

    helpFormat.display = function(processName, profile, hiddenFlag){
        var helpString = [];
        this.profile = profile;
        helpFile = path.join(__dirname, '../../files/help', processName + '.help');
        try{           
            var data = JSON.parse(fs.readFileSync(helpFile, 'utf8'));
            data['display'].forEach(function(prop){
                helpString.push("");
                if(!data['notitle'] || data['notitle'].indexOf(prop) == -1){
                    helpString.push(prop.toUpperCase());
                }
                if(data['notab'] && data['notab'].indexOf(prop) != -1){
                    helpString = helpString.concat(helpFormat.stringFormat(data[prop], false, hiddenFlag));
                } else {
                    helpString = helpString.concat(helpFormat.stringFormat(data[prop], true, hiddenFlag));
                }
            });
            helpFormat.print(helpString);
        } catch (err){
            console.log(err);
            throw err;
        }
    }
    
    helpFormat.string = function(data, tab){
        var helpString = "";
        if(data === undefined) return [];
        
        data = data.split("@TAB@");
        for(index in data){
            if(index != 0 || tab){
                helpString += sprintf("\t%-32s", data[index]);
            } else {
                helpString += sprintf(data[index]);
            }
        }
        return [helpString];
    } 
    
    helpFormat.stringArray = function(data, tab){
        var helpString = [];
        for(index in data){
            helpString = helpString.concat(helpFormat.stringFormat(data[index], tab));
        }
        return helpString;
    }

    helpFormat.optionObject = function(data, tab){
        var helpString = [];
        var optionList = [].concat(data['default']||[]).concat(data['default-process']||[]);
        optionList = optionList.concat(data[this.profile]||[]).concat(data[process.platform]||[]);
        for(index in optionList){
            helpString = helpString.concat(helpFormat.stringFormat(data[optionList[index]], tab));
        }
        return helpString;
    }
    
    helpFormat.stringObject = function(data, tab){
        var helpString = [];
        var defaultData = [].concat(data['default']||[]).concat(data['default-process']||[]);
        var currentData = [].concat(data[this.profile]||[]).concat(data[process.platform]||[]);
        helpString = helpString.concat(helpFormat.stringFormat(defaultData.concat(currentData), tab));
        return helpString;
    }

    helpFormat.hiddenObject = function(data, tab, hiddenFlag){
        return (hiddenFlag)? helpFormat.stringObject(data, tab) : [];
    }

    helpFormat.stringFormat = function(data, tab, hiddenFlag){
        var helpString = [];
        if(Array.isArray(data)){
            helpString = helpString.concat(helpFormat.stringArray(data, tab));
        } else if (typeof data === 'object'){
            if(data['cmdOpt'] && data['cmdOpt'] === 'option'){
                helpString = helpString.concat(helpFormat.optionObject(data, tab));
            }
            else if(data['cmdOpt'] && data['cmdOpt'] === 'hidden'){
                helpString = helpString.concat(helpFormat.hiddenObject(data, tab, hiddenFlag));
            } else {
                helpString = helpString.concat(helpFormat.stringObject(data, tab));
            }
        } else {
            helpString = helpString.concat(helpFormat.string(data, tab));
        }
        return helpString;
    }

	helpFormat.format =  function(msg) {
		var helpString = "";
		msg = [].concat(msg);
		var dependOnPlatform = false,
			accept = false;
		msg.forEach(function(platform) {
			if (["win32", "linux", "darwin"].indexOf(platform) != -1)
			{
				dependOnPlatform = true;
				if (platform == process.platform) {
					accept = true;
				}
			}
		});
		var idx = 0;
		if (dependOnPlatform === true) {
			if (accept === true) {
				idx = 1;
			} else {
				return null;
			}
		}
		for(idx; idx < arguments.length; idx++) {
			helpString = helpString.concat(sprintf('\t%-30s', arguments[idx]));
		}
		return helpString;
	};

	helpFormat.print = function(arrayStrHelp) {
		arrayStrHelp = [].concat(arrayStrHelp);
		arrayStrHelp.forEach(function(line) {
			if (typeof line === 'string') {
				console.log(line);
			}
		});
	}
}());
