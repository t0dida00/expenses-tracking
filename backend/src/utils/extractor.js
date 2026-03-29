const extractTransactionData = (rawTransaction) => {
    return {
        entry_reference: rawTransaction.entry_reference,
        transaction_amount: rawTransaction.transaction_amount,
        creditor: rawTransaction.creditor,
        debtor: rawTransaction.debtor,
        credit_debit_indicator: rawTransaction.credit_debit_indicator,
        value_date: rawTransaction.value_date,
        remittance_information: rawTransaction.remittance_information
    };
};

const extractTransactions = (transactionsResponse) => {
    if (!transactionsResponse || !Array.isArray(transactionsResponse.transactions)) {
        return [];
    }
    return transactionsResponse.transactions.map(extractTransactionData);
};

module.exports = {
    extractTransactionData,
    extractTransactions
};
