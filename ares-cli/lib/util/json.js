"use strict"

var
    Promise = require('bluebird'),
    log = require('npmlog');

var
    fs = Promise.promisifyAll(require('fs'));

function readJsonSync(file) {
    var result, contents;
    try {
        contents = fs.readFileSync(file, 'utf8');
        result = JSON.parse(contents.toString().replace(/^\ufeff/g, '')); //Removing BOM
    } catch (err) {
        log.warn('readJsonSync()#error:', err)
        throw err;
    }
    return result;
}

function readJsonAsync(file) {
    return fs.readFileAsync(file, 'utf8')
        .then( function(contents) {
            return JSON.parse(contents.toString().replace(/^\ufeff/g, '')); //Removing BOM
        })
        .catch( function(err) {
            log.warn('readJsonAsync()#error:', err)
            throw err;
        });
}

module.exports.readJsonSync = readJsonSync;
module.exports.readJsonAsync = readJsonAsync;
