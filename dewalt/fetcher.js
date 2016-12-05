/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;

var columns = ['Product Name','Product Category', 'Product image name', 'Product descriptions', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 1500;

// rp = rp.defaults({proxy : 'http://test2.qypac.net:25001', timeout: 30000});

/** compose url by yourself */
var urls = fs.readFileSync('links.txt').toString().split('\r\n');

// urls = urls.slice(0, 10);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('dewalt.xlsx', buffer);
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
            var category = [];
            $('.breadcrumb-trail li').each(function(index, element) {
                var cate = $(this).text().trim();
                category.push(cate);
            });
            var categoryString = category.join(' > ');
            var name = $('.pdp-details__name-wrapper').text().trim();
            var description = $('.pdp-details__description').text().trim();
            var specs = [];
            $('.pdp-specs__specifications li').each(function(index, element) {
                var key = $(this).find('strong').text().trim();
                var value = $(this).find('span').text().trim();
                specs.push(key + ' = ' + value);
            });
            var imageUrl = 'http://www.dewalt.com' + $('.pdp-imagery__image--zoom').attr('src').replace('&showdefaultimage=true', '');
            // var imageName = $('.pdp-details__sku').text().trim() + '.jpg';
            var imageName = url.split('/')[url.split('/').length - 1] + '.jpg';
            row = [name, categoryString, imageName, description].concat(specs);
            rows.push(row);
            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return new Promise(function (res, rej) {
                    setTimeout(function () {
                        res(url);
                    }, timeout);
                });
            } else {
                console.log('Processing ' + imageUrl);
                return savePic(imageUrl, 'images/' + imageName);
            }


        }).then(function (url) {
            console.log(url + ' was done');
        }).catch(function (err) {
            //handle errors
            console.log(err);
        });
}

