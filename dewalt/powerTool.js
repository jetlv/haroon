/// <reference path="../../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;

var columns = ['Name', 'Model', 'Category', 'Image Name', 'Descriptions', 'Specs'];
var sheet = { name: 'result', data: [] };
sheet.data.push(columns);
var rows = sheet.data;


var timeout = 1500;

/** compose url by yourself */
var urls = [];
var $ = cheerio.load(fs.readFileSync('powerTool.html').toString());

$('a').each(function(index, element) {
    urls.push('http://www.dewalt.ae' + $(this).attr('href'));
});

console.log('First level has ' + urls.length + ' items');

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('powerTool.xlsx', buffer);
    console.log('Printed');
}

// Promise.all(Promise.map(urls, singleRequest, { concurrency: 3 })).then(printToExcel);


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
            //process html via cheerio
            var secondLevel = [];
            $('.product_row li a').each(function(index, element) {
                secondLevel.push('http://www.dewalt.ae' + $(this).attr('href'));
            });

            return new Promise(function (res, rej) {
                setTimeout(function () {
                    res(secondLevel);
                }, timeout);
            });

        }).then(function (secondLevel) {
            console.log(secondLevel.length + ' items in second level');
            secondLevel = ["http://www.dewalt.ae/powertools/productoverview/hierarchy/2200/","http://www.dewalt.ae/powertools/productoverview/hierarchy/2201/","http://www.dewalt.ae/powertools/productoverview/hierarchy/2197/","http://www.dewalt.ae/powertools/productoverview/hierarchy/2198/","http://www.dewalt.ae/powertools/productoverview/hierarchy/2199/","http://www.dewalt.ae/powertools/productoverview/hierarchy/2196/","http://www.dewalt.ae/powertools/productoverview/hierarchy/3996/","http://www.dewalt.ae/powertools/productoverview/hierarchy/4004/","http://www.dewalt.ae/powertools/productoverview/hierarchy/1321/","http://www.dewalt.ae/powertools/productoverview/hierarchy/4012/","http://www.dewalt.ae/powertools/productoverview/hierarchy/4020/","http://www.dewalt.ae/powertools/productoverview/hierarchy/4028/"];
            return Promise.map(secondLevel, function processSecondLevel(secondUrl) {
                var options = {
                    method: 'GET',
                    uri: secondUrl,
                    gzip: true
                };
                return rp(options).then(function(body) {
                    var $ = cheerio.load(body);
                    $('.product_row li a').each(function(index, element) {
                        var productUrl = 'http://www.dewalt.ae' + $(this).attr('href');
                        fs.appendFileSync("PowerToolProducts.txt", productUrl + '\r\n');
                    });
                    return 0;
                });
            }, {concurrency : 3});
        }).catch(function (err) {
            //handle errors
            console.log(err.message);
        });
}


var pLinks = fs.readFileSync('powerToolProducts.txt').toString().split('\r\n');
// pLinks = pLinks.slice(0, 5);
// pLinks = ['http://www.dewalt.ae/powertools/productdetails/catno/DWE4205/', 'http://www.dewalt.ae/powertools/productdetails/catno/DCF680G2F/'];
var done = fs.readFileSync('done.txt').toString().split('\r\n');
Promise.all(Promise.map(pLinks, productFetching, { concurrency: 3 })).then(printToExcel);
function productFetching(url) {

    if(done.indexOf(url) != -1) {
        console.log('Already fetched, pass');
        return 0;
    }
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
            //process html via cheerio
            var productName = $('.productdetail_headerimage_catno_description_staging').text();
            var model = $('.productdetail_headerimage_catno_staging h1').text();
            var categoryArray = [];
            $('.breadcrumb_innercontainer a').each(function(index, element) {
                    categoryArray.push($(this).text().trim());
            });
            categoryArray.push($('.breadcrumb_non_active').text());
            var categoryString = categoryArray.join(" > ");
            var descriptionArray = [];
            $('.productdetail_features_container ul li').each(function() {
                var singleLine = $(this).text().trim();
                descriptionArray.push(singleLine);
            });
            var description = descriptionArray.join("\r\n");
            var imageLink = 'http://www.dewalt.ae' + $('.productdetail_img_category img').attr('src');
            // fs.writeFileSync('body.html', body);
            var imageName = imageLink.split('/')[imageLink.split('/').length - 1];
            var row = [productName, model, categoryString, imageName, description];

            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return new Promise(function (res, rej) {
                    setTimeout(function () {
                        res(row);
                    }, timeout);
                });
            } else {
                console.log('Processing ' + imageLink);
                return savePic(imageLink, 'images/' + imageName).then(function() {
                    return row;
                });
            }

        }).then(function (row) {
            var options = {
                method: 'GET',
                uri: url + 'info/specifications/',
                headers: {
                },
                gzip: true
            };
            return rp(options).then(function(body) {
                var $ = cheerio.load(body);
                var specs = [];
                $('.productdetail_specifications_table tr').each(function() {
                    if($(this).find('td').length == 2) {
                        var key = $(this).find('td').eq(0).text().trim();
                        var value = $(this).find('td').eq(1).text().trim();
                        specs.push(key + ' = ' + value);
                    }
                });

                rows.push(row.concat(specs));
                return 0;
            });

        }).catch(function (err) {
            //handle errors
            console.log(err)
        });
}