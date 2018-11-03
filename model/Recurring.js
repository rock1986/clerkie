'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var RecurringSchema = new Schema({
  name: String,
//  company: String,
  user_id: String,
  amount: Number,
  interval: Number,
  last_date: Date
});

module.exports = mongoose.model('Recurring', RecurringSchema);