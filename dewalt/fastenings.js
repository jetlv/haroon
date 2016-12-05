/**
 * Created by Administrator on 2016/12/2.
 */

/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;

var columns = ['Product Name','Product image name', 'Category'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var timeout = 1500;

// rp = rp.defaults({proxy : 'http://test2.qypac.net:25001', timeout: 30000});

/** compose url by yourself */
var urls = fs.readFileSync('fastenings.txt').toString().split('\r\n');

// urls = urls.slice(0, 10);

/** function to print excel */
var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('fastenings.xlsx', buffer);
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
    var collected = [];
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            // fs.writeFileSync('fastenings.html', body);
            var categoryArray = [];
            $('.breadcrumb_innercontainer a').each(function(index, element) {
                categoryArray.push($(this).text().trim());
            });
            categoryArray.push($('.breadcrumb_non_active').text());
            var categoryString = categoryArray.join(" > ");
            $('.product_row ul li').each(function(index, element) {
                var name = $(this).find('.headline').text().trim();
                var imageLink = 'http://www.dewalt.ae/' + $(this).find('.image').attr('style').match(/images.*\.jpg/);
                console.log('Style is ' + $(this).find('.image').attr('style'));
                var imageName = imageLink.split('/')[imageLink.split('/').length - 1];
                var href = 'http://www.dewalt.ae' + $(this).find('a').attr('href');
                collected.push(href);
                rows.push([name, imageName, categoryString]);
                if (fs.existsSync('fasteningsImages/' + imageName)) {
                    console.log('Image already fetched, pass');

                } else {
                    console.log('Processing ' + imageLink);
                    savePic(imageLink, 'fasteningsImages/' + imageName);
                }
            });

            if(collected.length == 0) {
                console.log(url + ' was done');
                return 0;
            } else {
                return collected;
            }
        }).then(function (collected) {
            if(collected != 0) {
                return Promise.map(collected, singleRequest, {concurrency: 4});
            }
        }).catch(function (err) {
            //handle errors
            console.log(err);
            fs.appendFileSync('errorUrl.txt', url + '\r\n');
        });
}



