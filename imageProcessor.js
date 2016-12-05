/**
 * Created by Administrator on 2016/11/14.
 */
var rp = require('request-promise');
var Promise = require('bluebird');
var fs = require('fs');


var savePic = function (link, name) {
    var options = {
        url: link,
        method: 'GET',
        encoding: null
    }

    return rp(options).then(function (body) {
        /** here body is picture stream */

        fs.writeFileSync(name, body);

        return new Promise(function (res, rej) {
            setTimeout(function () {
                res('Image fetching');
            }, 1);
        });
    });
}

var savePdf = function (link, name) {
    var options = {
        url: link,
        method: 'GET',
        encoding: null
    }

    return rp(options).then(function (body) {
        /** here body is picture stream */

        fs.writeFileSync(name, body);

        return new Promise(function (res, rej) {
            setTimeout(function () {
                res(0);
            }, 1);
        });
    });
}

module.exports = {
    savePic: savePic,
    savePdf: savePdf
}