/**
 * Created by Administrator on 2016/11/29.
 */

var ew = require('node-xlsx');
var fs = require('fs');

var originalRows = ew.parse(fs.readFileSync('dorin_issueFixed.xlsx'))[0].data;
var found = [];
var toRemove = [];

originalRows.forEach(function(row, index, array) {
    if(index == 0) {
        return;
    }
    var name = row[0];
    var existingIndex = -1;
    found.forEach(function(entity, innerIndex, array) {
        if(entity.row[0] == name) {
            existingIndex = entity.index;
        }
    });
    if(existingIndex !== -1) {
        if(row[1].indexOf('ALLMODELS') !== -1) {
            toRemove.push(index);
        } else {
            toRemove.push(existingIndex);
        }
    } else {
        found.push({
            index : index,
            row: row
        });
    }
});

console.log('There are ' + toRemove.length +  ' items to be removed');

var newRows = [];

originalRows.forEach(function(row, index, array) {
    if(toRemove.indexOf(index) == -1) {
        newRows.push(row);
    } else {
        if(fs.existsSync('images/' + row[2])) {
            fs.unlinkSync('images/' + row[2]);
        }
    }
});

var buffer = ew.build([{name : 'products', data : newRows}]);
fs.writeFileSync('dorin_removedDup.xlsx', buffer);