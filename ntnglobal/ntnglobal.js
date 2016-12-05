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

var domain = 'http://www.ntnglobal.com/en';
var timeout = 1500;
// var proxy = 'http://test2.qypac.net:30243';
var proxy = '';
var gathered = [];

/** compose url by yourself */
var urls = fs.readFileSync('links.txt').toString().split('\r\n');

// urls = ['http://www.ntnglobal.com/en/products/rollingbearing/linear_motion.html'];
// $('a').each(function (index, element) {
//     fs.appendFileSync('links.txt', $(this).attr('href') + '\r\n');
// });

// urls = urls.slice(0, 1);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('ntnglobal.xlsx', buffer);
    console.log('Excel Printed');
}

Promise.map(urls, singleRequest, {concurrency: 3}).then(printToExcel);


/** Single Req */
function singleRequest(url) {
    console.log('Start working on ' + url);
    var options = {
        method: 'GET',
        uri: url,
        timeout: 30000,
        proxy: proxy,
        gzip: true
    };
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            var gatheredProducts = [];
            var category = $('#topicpath').text().trim();
            var items = $('#contents .head1');
            // fs.writeFileSync('body.html', body);
            items.each(function (index, element) {
                var productName = $(this).find('.bg2').text();
                console.log(productName + ' fetched');
                if ((!productName) || (gathered.indexOf(productName) !== -1)) {
                    return;
                }
                var description = $('#contents .section').eq(index).find('.box2c').text().trim();
                var fetchedImageSrc = $('#contents .section').eq(index).find('.box1c img').attr('src');
                var imageLink = url.replace(url.split('/')[url.split('/').length - 1], fetchedImageSrc);
                // var imageName = fetchedImageSrc.split('/')[fetchedImageSrc.split('/').length - 1];
                var imageName = productName + '.jpg';
                var entity = {
                    productName: productName,
                    category: category,
                    imageName: imageName,
                    imageLink: imageLink,
                    description: description,
                }
                gatheredProducts.push(entity);
                rows.push([productName, category, imageName, imageLink, description]);
                gathered.push(productName);
            });
            return gatheredProducts;
        }).then(function (gatheredProducts) {
            return Promise.map(gatheredProducts, function singleProduct(entity) {
                console.log('Start working on ' + entity.imageLink);
                return savePic(entity.imageLink, 'images/' + entity.imageName).catch(function(err) {
                    fs.appendFileSync('Error.txt', entity.imageLink + ' - ' + err.message + '\r\n');
                });
            }, {concurrency: 3});
        }).catch(function (err) {
            console.log(err.message);
            fs.appendFileSync('Error.txt', url + ' - ' + err.message + '\r\n');
        });
}

