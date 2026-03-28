// This file will later be used for DB models (e.g., MongoDB, PostgreSQL)
class Transaction {
    constructor(data) {
        this.id = data.id;
        this.amount = data.amount;
        this.currency = data.currency;
        this.description = data.description;
        this.date = data.date;
    }
}

module.exports = Transaction;
