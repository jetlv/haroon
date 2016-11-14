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

var domain = 'http://www.apc.com';
var timeout = 1500;
var base = 'http://www.apc.com/shop/pk/en/search?Nrpp=50&Dy=1&No=';
var proxy = 'http://test2.qypac.net:30243';

/** compose url by yourself */
var urls = [];

for (var i = 0; i < 5950; i += 50) {
    (function (k) {
        if (k == 0) {
            urls.push(base);
        } else {
            urls.push(base + k);
        }
    }(i));
}

// urls = urls.slice(0, 1);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('apc.xlsx', buffer);
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
            //process html via cheerio
            // fs.writeFileSync('body.html', body);
            var products = $('.list-view');
            var productsJson = [];
            products.each(function loopsItems(index, element) {
                var productDetailPage = domain + $(this).find('.details-holder a').attr('href');
                fs.appendFileSync('collected.txt', productDetailPage + '\r\n');
                var productName = $(this).find('.details-holder a').text();
                var description = $(this).find('.details-holder p').text().trim();
                var itemJson = {
                    link: productDetailPage,
                    name: productName,
                    description: description
                }
                productsJson.push(itemJson);
            });

            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(productsJson);
                }, timeout);
            });

        }).then(function (productsJson) {
            // productsJson = productsJson.slice(0, 10);
            console.log(productsJson.length + ' items were gathered');

            return Promise.map(productsJson, function fetchCateAndImage(item) {
                var link = item.link;
                console.log('Start processing details page ' + item.link);
                var options = {
                    method: 'GET',
                    uri: link,
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
                    }
                };

                return rp(options).then(function (body) {
                    var $ = cheerio.load(body);
                    // fs.writeFileSync('body.html', body);
                    var categoryString = '';
                    $('.breadcrumb li').each(function (index, element) {
                        if (index > 0) {
                            var cate = $(this).find('a').text();
                            categoryString += cate + ' > ';
                        }
                    });
                    item['category'] = categoryString;
                    var imageUrl = 'http:' + $('.contentLeft .product img').attr('src');
                    var imageName = imageUrl.split('/')[imageUrl.split('/').length - 1];
                    item['image'] = imageName;
                    item['imageLink'] = imageUrl;
                    rows.push([item.name, item.category, item.image, item.imageLink, item.description]);
                    console.log(item.name + ' was done');
                    return savePic(imageUrl, 'images/' + imageName);
                }).catch(function (err) {
                    fs.appendFileSync('Error.txt', item.link + ' - Inner error ' + err.message + '\r\n');
                });

            }, {concurrency: 10});

        }).catch(function (err) {
            //handle errors
            console.log(err.message);
            fs.appendFileSync('Error.txt', url + ' - ' + err.message + '\r\n');
        });
}

