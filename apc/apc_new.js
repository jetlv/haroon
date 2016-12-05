/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;


var columns = ['Product Name', 'Product Category', 'Product image name', 'Product image link', 'Product description', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var done = fs.readFileSync('done.txt').toString().split('\r\n');
var domain = 'http://www.apc.com';
var timeout = 1500;
var base = 'http://www.apc.com/shop/pk/en/search?Nrpp=50&Dy=1&No=';
// var proxy = 'http://test2.qypac.net:30243';
var proxy = '';

/** compose url by yourself */
var urls = fs.readFileSync('continuedLinks').toString().split('\r\n');


// console.log(Date.now());
// urls = urls.slice(0, 1);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('apc' + Date.now() + '.xlsx', buffer);
    console.log('Excel Printed');
}

// process.on('exit', function () {
//     printToExcel();
// });
//
// process.on('error', function () {
//     printToExcel();
// });

Promise.map(urls, singleRequest, {concurrency: 3}).then(printToExcel);


/** Single Req */
function singleRequest(url) {
    var item = {};
    item.description = '';
    console.log('Start working on ' + url);
    var options = {
        method: 'GET',
        uri: url,
        timeout: 30000,
        proxy: proxy,
        gzip: true,
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, sdch",
            "Accept-Language": "en-US,en;q=0.8",
            "Cache-Control": "max-age=0",
            "Host": "www.apc.com",
            "Proxy-Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36"
        },
        followRedirect: true
    };
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            var name = $('#pdp .contentRight h1').text();
            item.name = name;
            var categoryString = '';
            $('.breadcrumb li').each(function (index, element) {
                if (index > 0) {
                    var cate = $(this).text().trim();
                    categoryString += cate + ' > ';
                }
            });

            /** process decription */
            var descriptionToAppend = '';
            var descriptionPanel = $('#productoverview');
            var tables = descriptionPanel.find('.table-odd');
            tables.each(function(index, element) {
                var title = descriptionPanel.find('h5').eq(index).text().trim();
                descriptionToAppend+= title + '\r\n\r\n';
                $(this).find('li').each(function(index, element){
                    var key = $(this).find('div').eq(0).text().trim();
                    var value = $(this).find('div').eq(1).text().trim();
                    descriptionToAppend += key + '\r\n';
                    descriptionToAppend += value + '\r\n\r\n';
                });
            });
            item.description += descriptionToAppend;

            /** process specs */
                // var spec = $('#techspecs').text().trim();
            var specs = [];
            var kvPairs = $('#techspecs .col-md-12');
            kvPairs.each(function(index, element) {
                var key = $(this).find('.col-md-3').text();
                var value = $(this).text().replace(key, '').trim().replace(/\s+/g, '');
                specs.push(key + '= ' + value);
                // if(index > 0) {
                //     columns.push('Product specifications');
                // }
            });

            item.spec = specs;

            item['category'] = categoryString;
            var imageUrl = 'http:' + $('.contentLeft .product img').attr('src');
            if ($('.contentLeft .product img').length == 0) {
                imageUrl = 'http:' + $('.contentLeft #DataDisplay').attr('src');
            }
            var imageName = imageUrl.split('/')[imageUrl.split('/').length - 1];
            item['image'] = imageName;
            item['imageLink'] = imageUrl;
            rows.push([item.name, item.category, item.image, item.imageLink, item.description].concat(item.spec));
            fs.appendFileSync('done.txt', url + '\r\n');
            if (rows.length % 1000 == 0) {
                printToExcel();
            }
            console.log(item.name + ' was done');
            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return 0;
            } else {
                return savePic(imageUrl, 'images/' + imageName);
            }
        }).catch(function (err) {
            //handle errors
            console.log(err.message);
            fs.appendFileSync('Error.txt', url + ' - ' + err.message + '\r\n');
        });
}

