function deepCopy(obj) {
    if (obj === null || typeof(obj) !== 'object')
        return obj;
    var copy = new obj.constructor();
    copy.__proto__ = obj.__proto__;
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = deepCopy(obj[attr]);
      }
    }
    return copy;
}

function shallowCopy(obj) {
    if (obj === null || typeof(obj) !== 'object')
        return obj;
    var copy = new obj.constructor();
    copy.__proto__ = obj.__proto__; 
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj(obj[attr]);
      }
    }
    return copy;
}

module.exports.shallowCopy = shallowCopy;
module.exports.deepCopy = deepCopy;
