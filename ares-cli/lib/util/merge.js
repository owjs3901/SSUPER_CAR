"use strict"

function merge(srcObj, extendObj) {
    for (var key in extendObj) {
        if (extendObj.hasOwnProperty(key)) srcObj[key] = extendObj[key];
    }
    return srcObj;
}

module.exports = merge;
