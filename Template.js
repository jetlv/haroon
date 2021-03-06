/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;


var columns = ['Product Name', 'Product Category', 'Product image name', 'Product description', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 1500;
var base = '';

/** compose url by yourself */
var urls = [];



/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('output.xlsx', buffer);
    console.log('Excel Printed');
}

Promise.map(urls, singleRequest, {concurrency: 3}).then(printToExcel);


/** Single Req */
function singleRequest(url) {
    var options = {
        method: 'GET',
        uri: url,
        gzip: true
    };
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            //process html via cheerio
            var imageName = '';
            var imageLink = '';
            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return new Promise(function (res, rej) {
                    setTimeout(function () {
                        res('Already');
                    }, timeout);
                });
            } else {
                console.log('Processing ' + imageLink);
                return savePic(imageLink, 'images/' + imageName);
            }

            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(url);
                }, timeout);
            });

        }).then(function (url) {
            console.log(url + ' was done');
        }).catch(function (err) {
            console.log(err);
        });
}

