/// <reference path="../../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;
var savePdf = require('../imageProcessor').savePdf;
/**
 /products/ballbearing/
 /products/rollerbearing/
 /products/bearingunit/index.html
 /products/spb/
 /products/steel/index.html
 /products/miningconstruction/
 /products/papermaking/
 /products/pumpscompressors/
 /products/spacea/index.html
 /products/automotive/
 /products/precisionmachine/
 /products/megatorque/
 /products/maintenance/
 */

rp = rp.defaults({proxy : 'http://test2.qypac.net:56139'});

var columns = ["ProductName", "Category", "Description", "Image Name",  "PDF Name"];
var sheet = { name: 'result', data: [] };
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 3000;

/** compose url by yourself */
var urls = ["http://www.nsk.com/products/ballbearing/","http://www.nsk.com/products/rollerbearing/","http://www.nsk.com/products/bearingunit/index.html","http://www.nsk.com/products/spb/","http://www.nsk.com/products/steel/index.html","http://www.nsk.com/products/miningconstruction/","http://www.nsk.com/products/papermaking/","http://www.nsk.com/products/pumpscompressors/","http://www.nsk.com/products/spacea/index.html","http://www.nsk.com/products/automotive/","http://www.nsk.com/products/precisionmachine/","http://www.nsk.com/products/megatorque/","http://www.nsk.com/products/maintenance/"];

// urls = urls.slice(0, 1);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('nsk.xlsx', buffer);
    console.log('Printed');
}

Promise.all(Promise.map(urls, singleRequest, { concurrency: 3 })).then(printToExcel);


/** Single Req */
function singleRequest(url) {
    var options = {
        method: 'GET',
        uri: url,
        headers: {
        },
        gzip: true
    };
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            var secondLevel = [];
            var items = $('.thumbListBase01 li a');
            items.each(function(index, element) {
                secondLevel.push('http://www.nsk.com' + $(this).attr('href'));
            });

            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(secondLevel);
                }, timeout);
            });

        }).then(function (secondLevel) {
            console.log(secondLevel.length  + ' gathered');

            return Promise.map(secondLevel, function(listPage) {
                var options = {
                    url : listPage,
                    method : 'GET',
                    gzip : true
                };

                return rp(options).then(function(body) {
                    var $ = cheerio.load(body);
                    var category = $('#topicPathBlock').text().trim().replace('You are here: Home >> ', '');
                    var pdfLink = $('#document .productTxtBox dl dt a').attr('href').replace('gr=dn', 'rm=pdfDown');
                    var pdfName = $('#mainContentsBlock h1').text().trim() + '.pdf';

                    $('.productListBase01>li').each(function(index, element) {
                        var productName = $(this).find('dl dt').text();
                        var description = $(this).find('dl dd').text().trim();
                        var imageLink = 'http://www.nsk.com' + $(this).find('dl dd>img').attr('src');
                        var imageName = productName.trim().replace(/[\\|/]/g, '-') + '.gif';
                        rows.push([productName, category, description, imageName, pdfName])
                        if (fs.existsSync('images/' + imageName)) {
                            console.log('Image already fetched, pass');
                            return 0;
                        } else {
                            console.log('Start fetching image ' + imageLink);
                            savePic(imageLink, 'images/' + imageName);
                        }
                    });
                    if (fs.existsSync('pdfs/' + pdfName)) {
                        console.log('PDF already fetched, pass');
                        return 0;
                    } else {
                        return savePdf(pdfLink, 'pdfs/' + pdfName);
                    }
                }).catch(function(err) {
                    console.log(err);
                    fs.appendFileSync('Error.txt', listPage + ' - ' + err.stacktrace + '\r\n');
                });

            }, {concurrency: 3});

        }).catch(function (err) {
            //handle errors
            console.log(err.message);
        });
}
