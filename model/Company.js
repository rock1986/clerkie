'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var CompanySchema = new Schema({
    name: String
});

module.exports = mongoose.model('Company', CompanySchema);