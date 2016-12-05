/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;

var columns = ['Product Name','Product Category', 'Product image name', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 1500;

rp = rp.defaults({proxy : 'http://test2.qypac.net:25001', timeout: 30000});

/** compose url by yourself */
var urls = fs.readFileSync('final.txt').toString().split('\r\n');

// urls = urls.slice(0, 10);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('dorin_issueFixed.xlsx', buffer);
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
            var row = [];
            var name = $('h1').text();
            //Category stuff
            var excludePrefix = url.match('http://www.dorin.com/en/catalogo/(.*)')[1];
            var cateArray = excludePrefix.split('/');
            cateArray = cateArray.slice(0, cateArray.length - 1);
            var categoryString = cateArray.join(' > ');
            //Category stuff END
            var imageUrl = $('#longdesc img').attr('src');
            var imageName = cateArray.join('-')  + '.png';
            row.push(name);
            row.push(categoryString);
            row.push(imageName);
            var specLines = $('#stec tr');
            specLines.each(function(index, element) {
                var key = $(this).find('td').eq(0).text();
                var value = $(this).find('td').eq(1).text() + $(this).find('td').eq(2).text();
                row.push(key + ' = ' + value);
            });
            rows.push(row);
            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return new Promise(function (res, rej) {
                    setTimeout(function () {
                        res(url);
                    }, timeout);
                });
            } else {
                console.log('Processing ' + url);
                return savePic(imageUrl, 'images/' + imageName);
            }


        }).then(function (url) {
            console.log(url + ' was done');
        }).catch(function (err) {
            //handle errors
            console.log(err);
        });
}

