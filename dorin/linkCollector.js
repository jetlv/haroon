/// <reference path="../include.d.ts" />

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var webdriver = require('selenium-webdriver');
var proxy = require('selenium-webdriver/proxy');
var by = webdriver.By;


/**
 * Second links collect.
 */
function collectSecond() {
    var base = 'http://www.dorin.com';
    var rootHtml = fs.readFileSync('first.html').toString();
    var $ = cheerio.load(rootHtml);
    var rootLevels = [];

    $('#boxs1 #list_cat a').each(function (index, element) {
        rootLevels.push(base + $(this).attr('href'));
    });
    var driver = new webdriver.Builder().forBrowser('phantomjs').setProxy(proxy.manual({
        http: '43.241.225.182:20225'
    })).build();
    Promise.map(rootLevels, function collect(url) {
        return driver.get(url).then(function () {
            // driver.getPageSource().then(function(source) {
            //     fs.writeFileSync('source.html', source);
            // });
            console.log(url + ' loaded');
            var cssSelector = '#boxs2 a';
            return driver.findElements(by.css(cssSelector));
        }).then(function (elements) {
            console.log('Length ' + elements.length);
            elements.forEach(function (element, index, array) {
                element.getAttribute('href').then(function (href) {
                    fs.appendFileSync('second.txt',href + '\r\n');
                });
            });
            return 0;
        });
    }, {concurrency: 1});
}

// collectSecond();

function collectThird() {
    var base = 'http://www.dorin.com';
    var secondLevels = fs.readFileSync('second.txt').toString().split('\r\n');
    var driver = new webdriver.Builder().forBrowser('phantomjs').setProxy(proxy.manual({
        http: '43.241.225.182:20225'
    })).build();
    Promise.map(secondLevels, function collect(url) {
        return driver.get(url).then(function () {
            console.log(url + ' loaded');
            var cssSelector = '#boxs3 a';
            return driver.findElements(by.css(cssSelector));
        }).then(function (elements) {
            console.log(elements.length);
            elements.forEach(function (element, index, array) {
                element.getAttribute('href').then(function (href) {
                    fs.appendFileSync('third.txt', href + '\r\n');
                });

            });
        });
    }, {concurrency: 1});
}

// collectThird();

function collectFinal() {
    var base = 'http://www.dorin.com';
    var thirdLevels = fs.readFileSync('third.txt').toString().split('\r\n');
    var driver = new webdriver.Builder().forBrowser('phantomjs').setProxy(proxy.manual({
        http: '43.241.225.182:20225'
    })).build();
    Promise.map(thirdLevels, function collect(url) {
        return driver.get(url).then(function () {
            console.log(url + ' loaded');
            var cssSelector = '#boxs4 a';
            return driver.findElements(by.css(cssSelector));
        }).then(function (elements) {
            console.log(elements.length);
            elements.forEach(function (element, index, array) {
                element.getAttribute('href').then(function (href) {
                    fs.appendFileSync('final.txt', href + '\r\n');
                });
            });
        });
    }, {concurrency: 1});
}

collectFinal();