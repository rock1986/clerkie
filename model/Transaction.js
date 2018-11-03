'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TransactionSchema = new Schema({
    name: String,
    user_id: String,
    trans_id: String,
    amount: Number,
    date: Date,
    visited: {
        type:Boolean,
        default:false
    },
    is_recurring: {
        type:Boolean,
        default:false
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);