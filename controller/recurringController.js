'use strict';

var mongoose = require('mongoose'),
    Transaction = mongoose.model('Transaction'),
    RecurringTransaction = mongoose.model('RecurringTransaction'),
    Recurring = mongoose.model('Recurring'),
    Company = mongoose.model('Company'),
    async = require('async');

exports.upsert_transctions = function (req, res) {    
    function getPrefix(word1, word2) {
        var i = 0, j = 0,
            prefix = "";
        while (i < word1.length && j < word2.length && word1.charAt(i) === word2.charAt(j)) {
            prefix += word1.charAt(i);
            i++;
            j++;
        }
        return prefix;
    }
    function getMainWord(input) {
        input.sort();
        var series = [],
            first = input[0],
            prefix;
        for (var i = 1; i < input.length; i++){
            prefix = getPrefix(first, input[i]);
            if (prefix == "" || prefix.indexOf(" ") == -1) {
                series.push(first);
                first = input[i];
            } else {
                first = prefix;
            }
        }
        series.push(first);
        return series;
    }
    function composeCompany(input){
        var companies = [];
        for(var i = 0; i < input.length; i++){
            companies.push({name : input[i]});
        }
        return companies;
    }
    var inputTransactions = req.body;
    var input = [];
    for (var i = 0; i < inputTransactions.length; i++){
        if (input.indexOf(inputTransactions[i].name) == -1 ){
            input.push(inputTransactions[i].name);
        }
    }
    var inputCompany = getMainWord(input);
    console.log("inputCompany :" + inputCompany);
    async.waterfall([
        //upsert transactions from request
        function(callback){
            var bulk = Transaction.collection.initializeOrderedBulkOp();
            for (var i = 0; i < req.body.length; i++){
                req.body[i].visited = false;
                bulk.find({user_id: req.body[i].user_id, trans_id: req.body[i].trans_id}).upsert().updateOne(req.body[i]);
//                Transaction.insertMany(req.body, function(err){
//                    callback(err);
//                    console.log("Insert Success");
//                });
            }
            bulk.execute(function(err, result){
                console.log("Upsert Success");
                callback(err);
            });
        },
        //get all user_ids
        function(callback){
            Transaction.distinct('user_id').exec(function(err, userIds){
                callback(err, userIds);
                
                console.log("All users:");
                console.log(userIds);
                console.log("\n");
            })
        },
        //get all companies;
        function(userIds, callback){
            Company.find().exec(function(err, companies){
                if (err) console.log(err);
                
                console.log("Companies:");
                console.log(companies);
                console.log("\n");
                
                var allCompany = [];
                var curCompany = [];
                if (companies.length > 0){
                    for(var i = 0; i < companies.length; i++){
                        curCompany.push(companies[i].name);
                    }
                    
                    console.log("Current Companies:");
                    console.log(curCompany);
                    console.log("\n");
                    
                    for(var i = 0; i < inputCompany.length; i++){
                        if(curCompany.indexOf(inputCompany[i]) == -1){
                            curCompany.push(inputCompany[i]);
                        }
                    }
                    if (curCompany.length > 1)
                        allCompany = getMainWord(curCompany);
                    else 
                        allCompany = curCompany;
                } else {
                    allCompany = inputCompany;
                }
                                                
                console.log("All Company:");
                console.log(allCompany);
                console.log("\n");
                
                Company.deleteMany().exec(function(err){
                    if (err) console.log(err);
                })
                
                callback(err, userIds, allCompany);
            });
        },
        function(userIds, companies, callback){
            Company.deleteMany().exec(function(err){
                if (err) console.log(err);
                Company.insertMany(composeCompany(companies), function(err) {
                    callback(err, userIds, companies);
                });
            });
        },
        //find recurring transactions
        function(userIds, companies, callback){
            for (var i = 0; i < userIds.length; i++) {
                for (var j = 0; j < companies.length; j++) {
                    
                    console.log(companies[j]);
                    console.log(userIds[i]);
                    console.log("\n");                    
                    
                    var userId = userIds[i];
                    var company = companies[j];
                    
                    //get transactions for each user and each company
                    Transaction.find({user_id: userIds[i], name: new RegExp(companies[j]+'.*'), visited: false}, null, {sort:{name: 'asc', date: 'asc'}}, function(err, transactions){
                        if (err) console.log(err);
                        
                        console.log("Get Transactions");
                        console.log(transactions);
                        console.log("\n");
                                                
                        //find recurring record for company and user
                        Recurring.findOne({user_id: userId, name: new RegExp(company+'.*')},function(err, recurring){
                            if (err) console.log(err);
                            console.log("Get Recurring");
                            console.log(recurring);
                            console.log("\n");
                            
                            var tmpRecurringTransaction = new RecurringTransaction();
                            tmpRecurringTransaction.user_id = userIds[i];
                            var interval = 0, tempInt = 0;
                            var curDate = new Date(); 
                            var firstDate;
                            var delta = 1000 * 60 * 60 * 24 * 3;
                            if (transactions.length > 0){
                                if (recurring != null){
                                    interval = recurring.interval;
                                    firstDate = new Date(recurring.last_date);
                                    //check one by one to if in range
                                    for (var k = 0; k < transactions.length; k++){
                                        var tempDate = new Date(transactions[k].date);
                                        if (firstDate.getMonth() == 1){
                                            tempInt = interval - 2 * 1000 * 60 * 60 * 24;
                                        } else {
                                            tempInt = interval
                                        }
                                        if (firstDate.getTime() + tempInt - delta <= tempDate && tempDate <= firstDate.getTime() + tempInt + delta){
                                            transactions[k].is_recurring = true;
                                            console.log("Recurring: " + k);
                                            tmpRecurringTransaction.transactions.push({
                                                name : transactions[k].name,
                                                amount: transactions[k].amount,
                                                user_id: transactions[k].user_id,
                                                trans_id: transactions[k].trans_id,
                                                date: transactions[k].date
                                            })
                                        } else {
                                            transactions[k].is_recurring = false;
                                        }
                                        firstDate = tempDate;
                                    }
                                } else {
                                    firstDate = new Date(transactions[0].date);
                                    //calculate interval if not exist
                                    for (var k = 1; k < transactions.length; k++){
                                        var tempDate = new Date(transactions[k].date);
                                        interval += tempDate - firstDate;
                                        if (tempDate.getMonth() == 2){
                                            interval += 2 * 1000 * 60 * 60 * 24;
                                        }
                                        firstDate = tempDate;
                                    }
                                    interval = interval / (transactions.length-1);
                                    
                                    console.log("Interval:" + interval);
                                    console.log("\n");
                                    
                                    //check one by one to verify if within range
                                    firstDate = new Date(transactions[0].date);
                                    for (var k = 1; k < transactions.length; k++){
                                        var tempDate = new Date(transactions[k].date);
                                        if (firstDate.getMonth() == 1){
                                            tempInt = interval - 2 * 1000 * 60 * 60 * 24;
                                        } else {
                                            tempInt = interval
                                        }
                                        if (firstDate.getTime() + tempInt - delta <= tempDate && tempDate <= firstDate.getTime() + tempInt + delta){
                                            transactions[k].is_recurring = true;
                                            if (k == 1){
                                                transactions[0].is_recurring = true;
                                                tmpRecurringTransaction.transactions.push({
                                                    name : transactions[0].name,
                                                    amount: transactions[0].amount,
                                                    user_id: transactions[0].user_id,
                                                    trans_id: transactions[0].trans_id,
                                                    date: transactions[0].date
                                                })
                                            }
                                            tmpRecurringTransaction.transactions.push({
                                                name : transactions[k].name,
                                                amount: transactions[k].amount,
                                                user_id: transactions[k].user_id,
                                                trans_id: transactions[k].trans_id,
                                                date: transactions[k].date
                                            })
                                        } else {
                                            transactions[k].is_recurring = false;
                                        }
                                        firstDate = tempDate;
                                    }
                                }
                                //get last recurring one's date
                                var k = transactions.length - 1;
                                for (; k>=0; k--){
                                    if(transactions[k].is_recurring) {
                                        tmpRecurringTransaction.name = transactions[k].name;
                                        tmpRecurringTransaction.next_date = Date.parse(transactions[k].date) + interval;
                                        tmpRecurringTransaction.next_amt = transactions[k].amount;
                                        break;
                                    }
                                }
                                
                                console.log(k);
                                console.log("Transaction:" + transactions[k]);
                                console.log("\n");
                                
                                //if curDate not in the range of last recurring date + interver then all are not recurring anymore
                                if (Date.parse(transactions[k].date) + interval + delta < curDate){
                                    console.log("Check Current Date");
                                    for (var k = 0; k < transactions.length; k++){
                                        transactions[k].is_recurring = false;
                                        tmpRecurringTransaction.transactions.pop();
                                    }
//                                    tmpRecurringTransaction.transactions.remove();
                                    console.log(tmpRecurringTransaction.transactions);
                                }
                                
                                if (tmpRecurringTransaction.transactions.length > 0){
                                    if (recurring != null){
                                        //update existing recurring
                                        recurring.updateOne({last_date: transactions[k].date, name: transactions[k].name, amount: transactions[k].amount},function(err) {
                                            if (err) console.log(err);
                                            console.log("Update Recurring Success");
                                        });
                                    } else {
                                        //insert new recurring
                                        var newRecurring = new Recurring({
                                            name : transactions[k].name,
    //                                        company: companies[j],
                                            amount: transactions[k].amount,
                                            user_id: transactions[k].user_id,
                                            last_date: transactions[k].date,
                                            interval: interval
                                        });
                                        newRecurring.save(function(err) {
                                            if (err) console.log(err);
                                            console.log("Insert New Recurring Success");
                                        });
                                    }
                                }
                                
                                //mark newly inserted to be visited
                                for (var k = 0; k < transactions.length; k++){
                                    transactions[k].updateOne({visited: true},function(err){
                                        if (err) console.log(err);
                                    })
                                }

                                RecurringTransaction.findOne({user_id: userId, name: new RegExp(company+'.*')}, function(err, recurringTransaction){
                                    if (err) console.log(err);
                                    
                                    console.log("Get Recurring Transaction");
                                    console.log(recurringTransaction);
                                    
                                    if (tmpRecurringTransaction.transactions.length > 0){
                                        if (recurringTransaction == null){
                                            tmpRecurringTransaction.save(function (err) {
                                              callback(err);
                                              console.log('Save Recurring Transaction Success');
                                            });
                                        } else {
                                            var newChildTransaction = recurringTransaction.transactions;
                                            if (tmpRecurringTransaction.transactions != null) {
                                                for (var i = 0; i < tmpRecurringTransaction.transactions.length; i++){
                                                    newChildTransaction.push(tmpRecurringTransaction.transactions[i]);
                                                }
                                            }
                                            recurringTransaction.updateOne({name:tmpRecurringTransaction.name, next_amt: tmpRecurringTransaction.next_amt, next_date : tmpRecurringTransaction.next_date, transactions: newChildTransaction}, function(err) {
                                                callback(err);
                                                console.log("Insert Recurring Transaction Success");
                                            });
                                        }
                                    } else {
                                        RecurringTransaction.deleteOne({user_id: userId, name: new RegExp(company+'.*')}, function(err){
                                            callback(err);
                                        });
                                    }
                                })
                            }
                        });
                    });
                }
            }
        },
        function(callback){
            RecurringTransaction.find().lean().sort({name: 'asc'}).exec(function(err, output){
                callback(err, output);
            });        
        }
    ], function(err, result){
        if (err) console.log(err);
        res.send(result);
    }); 
}

exports.get_recurring_transctions = function(req, res) {
    RecurringTransaction.find({}, null, {sort :{name: 'asc'}}).lean().exec(function(err, transactions){
        if (err) res.send(err);
        res.send(transactions);
    });
};

exports.get_recurrings = function(req, res) {
    Recurring.find().exec(function(err, recurrings){
        if (err)
            res.send(err);
        res.send(recurrings);
    });
};

exports.get_transactions = function(req, res) {
    Transaction.find().exec(function(err, recurrings){
        if (err)
            res.send(err);
        res.send(recurrings);
    });
};

exports.clear_transactions = function(req, res){
    Transaction.deleteMany({}, function(err){
        if (err)
            res.send(err);
        console.log("Clear db");
    });
    Company.deleteMany({}, function(err){
        if (err)
            res.send(err);
        console.log("Clear db");
    });
    Recurring.deleteMany({}, function(err){
        if (err)
            res.send(err);
        console.log("Clear db");
    });
    RecurringTransaction.deleteMany({}, function(err){
        if (err)
            res.send(err);
        console.log("Clear db");
    });
};