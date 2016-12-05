/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');


var columns = ['Product Name', 'Product Category', 'Product image name', 'Product description', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 1500;


/** compose url by yourself */
var urls = ['http://anchors.dewalt.com/anchors/', 'http://www.dewalt.com/en-us/products/power-tools', 'http://www.dewalt.com/en-us/products/accessories', 'http://www.dewalt.com/en-us/products/hand-tools'];

//product-card__product-name


/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('apc.xlsx', buffer);
    console.log('Excel Printed');
}

Promise.map(urls, singleRequest, {concurrency: 4}).then(printToExcel);


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
            $('.product-card__product-name').each(function(index, element) {
                var href = $(this).find('a').attr('href');
                fs.appendFileSync('links.txt', href + '\r\n');
            });
            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(url);
                }, timeout);
            });

        }).then(function (url) {
            console.log(url + ' was done');
        }).catch(function (err) {
            //handle errors
        });
}

