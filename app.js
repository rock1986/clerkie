var express = require('express'),
    app = express(),
    port = process.env.PORT || 1984,
    mongoose = require('mongoose'),
    Transaction = require('../project/model/Transaction'), //import model
    RecurringTransaction = require('../project/model/RecurringTransaction'), //import model
    Recurring = require('../project/model/Recurring'),
    Company = require('../project/model/Company'),
    bodyParser = require('body-parser');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// mongoose instance connection url connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/interview_challenge', { useNewUrlParser: true }); 

//importing route
var routes = require('../project/route/recurringRoute');
//register the route
routes(app);

var server = app.listen(port, function () {
    console.log("Running on port " + port);
});
//time out after 10 seconds
server.setTimeout(10000);