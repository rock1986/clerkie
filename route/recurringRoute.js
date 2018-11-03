'use strict';
module.exports = function(app) {
    var recurring = require('../controller/recurringController');

    app.route('/')
        .post(recurring.upsert_transctions)
        .get(recurring.get_recurring_transctions);
};