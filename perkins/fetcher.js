/**
 * Created by Administrator on 2016/11/30.
 */

var rp = require('request-promise');
var Promise = require('bluebird');
var cheerio = require('cheerio');
var ew = require('node-xlsx');
var fs = require('fs');
var savePic = require('../imageProcessor').savePic;

var timeout = 1000;

var columns = ['Product Name','Product Family', 'Product image name', 'Product description', 'Product specifications'];
var sheet = {name: 'result', data: []};
sheet.data.push(columns);
var rows = sheet.data;

var entities = [];
var sources = ['electric.json', 'industrial.json', 'marine.json'];
sources.forEach(function(source, index, array) {
    var sourceJson = JSON.parse(fs.readFileSync(source).toString());
    sourceJson.models.forEach(function(item, index, array) {
        var name = item.model_name;
        var category = item.family;
        var imageLink = item.image_url;
        var imageName = item.idmodel + '.png';
        var detail_url = 'https://www.perkins.com' + item.detail_url;
        var family = item.family;
        var entity = {
            name : name,
            category : category,
            imageLink : imageLink,
            imageName: imageName,
            detail_url : detail_url,
            family : family
        };
        entities.push(entity);
        // var description = item.longDesc;
        // var specs = [];
        // item.specs.forEach(function(spec, index, array) {
        //     specs.push(spec.spec_name + ' = ' +  spec.spec_value[0]);
        // });

    });
});

var printToExcel = function () {
    var buffer = ew.build([sheet]);
    fs.writeFileSync('Perkins' + Date.now() + '.xlsx', buffer);
    console.log('Excel Printed');
}
// Promise.map(entities, singleRequest, {concurrency: 4}).then(printToExcel);
var newRows = [];
var originalRows = ew.parse(fs.readFileSync('Perkins1480672556131.xlsx'))[0].data;
originalRows.forEach(function(row, index, array) {
    var desc = row[3];
    desc= desc.replace(/^\s+\r\n/g, '');
    desc = desc.replace("Desc under Overview", 'OVERVIEW' +  '\r\n');
    desc = desc.replace("Desc under Benifits", '\r\n\r\n' + 'BENIFITS&FEATHCERS' +  '\r\n');
    desc = desc.replace("Desc uner Equip", '\r\n\r\n' + 'EQUIPMENT' +  '\r\n');
    desc = desc.replace(/[&#13;|&#10;]/g, '');
    row[3] = desc;
    newRows.push(row);
});
var buffer = ew.build([{name : 'result', data : newRows}]);
fs.writeFileSync('Perkins_update.xlsx', buffer);
console.log('Excel Printed');

/** Single Req */
function singleRequest(entity) {
    var name = entity.name;
    var url = entity.detail_url;
    var imageLink = entity.imageLink;
    var imageName = entity.imageName;
    var family = entity.family;
    var options = {
        method: 'GET',
        uri: url,
        gzip: true
    };
    var collected = [];
    return rp(options)
        .then(function (body) {
            var $ = cheerio.load(body);
            var description = 'Desc under Overview \r\n\r\n';
            description += $('.productDetailSpecifications').find('div').eq(0).text().trim().replace(/^\s+\r\n/g, '') + '\r\n';
            description += 'Desc under Benifits \r\n\r\n';
            description += $('.productDetailBenefits').text().trim().replace(/^\s+\r\n/g, '') + '\r\n';
            description += 'Desc uner Equip \r\n\r\n'
            description += $('.productDetailEquip').text().trim().replace(/^\s+\r\n/g, '') + '\r\n';
            var specs = [];
            $('.flextable tr').each(function(index, element) {
                var key = $(this).find('td').eq(0).text().trim();
                var value = $(this).find('td').eq(1).find('span').eq(0).text().trim();
                specs.push(key + ' = ' + value);
            });
            rows.push([name, family, imageName, description].concat(specs));

            if (fs.existsSync('images/' + imageName)) {
                console.log('Image already fetched, pass');
                return new Promise(function (res, rej) {
                    setTimeout(function () {
                        res('Already');
                    }, timeout);
                });
            } else {
                console.log('Processing ' + imageLink);
                return savePic(imageLink, 'images/' + imageName);
            }

        }).then(function (r) {
            console.log(r);
        }).catch(function (err) {
            //handle errors
            console.log(err);
            fs.appendFileSync('errorUrl.txt', url + '\r\n');
        });
}





