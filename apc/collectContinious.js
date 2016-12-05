/// <reference path="../../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');

var columns = [];
var sheet = { name: 'result', data: [] };
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 3000;

/** compose url by yourself */
var urls = ['http://www.apc.com/shop/us/en/categories/'];
var lastCategory = [];
/**  Use the for loop if neccessary
 for (var i = 1; i < 100; i++) {
    (function (k) {
        urls.push(k);
    } (i));
}
 */

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('temp.xlsx', buffer);
    console.log('Everything was done successfully');
}

Promise.all(Promise.map(urls, singleRequest, { concurrency: 3 })).then();

// var toMatch = fs.readFileSync('continuedNames').toString().split('\r\n');
//
// var sheet = ew.parse(fs.readFileSync('ori.xlsx'))[0];
// var rows = sheet.data;

// var after = [];
// after.push(rows[0]);
// var sheetAfter = {name : 'Discontinued removed', data : after};
// rows.forEach(function(row, index, array) {
//     if(toMatch.indexOf(row[0]) !== -1) {
//         after.push(row);
//     }
// });
// var buffer = ew.build([sheetAfter]);
// fs.writeFileSync('discoutinuedRemoved.xlsx', buffer);


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
            if($('.col-md-4 .product-name').length == 0) {
                //not category page but list page.
                lastCategory.push(url);
                console.log('Found last category - ' + url);
                return url;
            }
            var categories = $('.col-md-4');
            categories.each(function(index, element) {
                var cateLink = 'http://www.apc.com' + $(this).find('.product-name a').attr('href');
                fs.appendFileSync('categories1.txt', cateLink + '\r\n');
                singleRequest(cateLink);
            });

            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(0);
                }, timeout);
            });

        }).then(function (url) {

            if(url === 0) {
                //not last cate, ignore
                return 0;
            }

            console.log(url + ' was gathered');

            return Promise.map(lastCategory, function(lastLink) {
                var options = {
                    method: 'GET',
                    uri: lastLink,
                    headers: {
                    },
                    gzip: true
                };
                return rp(options)
                    .then(function (body) {
                        var $ = cheerio.load(body);
                        var table = $('.apc-table').eq(0);
                        var lines = table.find('tr');
                        lines.each(function(index, element) {
                            var tagA = $(this).find('td').eq(0).find('a');
                            var link = 'http://www.apc.com' + tagA.attr('href');
                            fs.appendFileSync('continuedLinks1', link + '\r\n');
                            var name = tagA.text();
                            fs.appendFileSync('continuedNames1', name + '\r\n');
                        });
                        console.log('lastLink ' + lastLink  + ' was done');
                        return 0;
                    }).catch(function(err) {
                        console.log('Inner error - ' + err);
                    });


            }, {concurrency: 3});

        }).catch(function (err) {
            //handle errors
            console.log(err.message);
        });
}
