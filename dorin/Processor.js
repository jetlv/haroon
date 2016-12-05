/**
 * Created by Administrator on 2016/11/29.
 */
var fs = require('fs');
var ew = require('node-xlsx');

var links = fs.readFileSync('final.txt').toString().split('\r\n');
var cateEntities = [];

links.forEach(function(link, index, array) {
    var excludePrefix = link.match('http://www.dorin.com/en/catalogo/(.*)')[1];
    var cateArray = excludePrefix.split('/');
    cateArray = cateArray.slice(0, cateArray.length - 1);
    var categoryString = cateArray.join(' > ');
    var entity = {};
    entity.categoryString = categoryString;
    entity.name = cateArray[cateArray.length - 1];
    cateEntities.push(entity);
});
var columns = ['Product Name','Product Category','Product image name', 'Product specifications'];
var rows = ew.parse(fs.readFileSync('dorin.xlsx'))[0].data;
var newRows = [];
newRows.push(columns);
rows.forEach(function(row, index, array) {
    if(index == 0) {
        return;
    }
    cateEntities.forEach(function(entity, index, array) {
        if(entity.name == row[0]) {
            newRows.push([row[0], entity.categoryString].concat(row.slice(1, row.length - 1)));
        }
    });
});

var buffer = ew.build([{name : 'products', data : newRows}]);
fs.writeFileSync('dorin_categoryAppended.xlsx', buffer);