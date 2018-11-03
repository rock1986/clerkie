
'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ChildTransactionSchema = new Schema({
    trans_id: String,
    user_id: String,
    name: String,
    amount: Number,
    date: Date
});

var RecurringTransactionSchema = new Schema({
    user_id: String,
    //  company: {
    //    type: String,
    //    select: false,
    //  },
    name: String,
    next_amt: Number,
    newt_date: Date,
    transactions:[ChildTransactionSchema]
});

module.exports = mongoose.model('RecurringTransaction', RecurringTransactionSchema);