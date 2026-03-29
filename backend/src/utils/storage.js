const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'outputs', 'transactions');

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

exports.readTransactionsFromFile = (account_id) => {
    try {
        const filePath = path.join(DATA_DIR, `${account_id}.json`);
        if (!fs.existsSync(filePath)) return null;
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error reading transactions: ${error.message}`);
        return null;
    }
};

exports.saveTransactionsToFile = (account_id, transactions) => {
    try {
        const filePath = path.join(DATA_DIR, `${account_id}.json`);

        let latestDate = null;
        let latestTransaction = null;

        if (Array.isArray(transactions) && transactions.length > 0) {
            // Find the latest transaction based on value_date
            const sorted = [...transactions].sort((a, b) =>
                new Date(b.value_date) - new Date(a.value_date)
            );
            latestTransaction = sorted[0];
            latestDate = latestTransaction.value_date;
        }

        const dataToSave = {
            account_id,
            latest_date: latestDate,
            latest_transaction_ref: latestTransaction?.entry_reference,
            transactions,
            updated_at: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
        console.log(`Saved transactions to ${filePath} (Count: ${transactions.length})`);
        return true;
    } catch (error) {
        console.error(`Error saving transactions: ${error.message}`);
        return false;
    }
};

exports.mergeTransactions = (existingData, newTransactions) => {
    const existingList = existingData?.transactions || [];
    const newList = newTransactions || [];
    
    // Merge both lists
    const mergedList = [...newList, ...existingList];
    
    // Deduplicate using entry_reference as unique key
    const uniqueMap = new Map();
    
    mergedList.forEach(tx => {
        if (!uniqueMap.has(tx.entry_reference)) {
            uniqueMap.set(tx.entry_reference, tx);
        }
    });

    const finalTransactions = Array.from(uniqueMap.values());
    
    // Optional: Sort by date descending
    return finalTransactions.sort((a, b) => new Date(b.value_date) - new Date(a.value_date));
};

exports.updateTransactionInFile = (account_id, entry_reference, updates) => {
    try {
        const data = exports.readTransactionsFromFile(account_id);
        if (!data || !data.transactions) return null;

        const index = data.transactions.findIndex(t => t.entry_reference === entry_reference);
        if (index === -1) return null;

        // Perform partial update
        const updatedTx = { ...data.transactions[index], ...updates };
        
        // Handle generic 'description' update
        if (updates.description) {
            if (updatedTx.amount >= 0) {
                updatedTx.creditor_name = updates.description;
            } else {
                updatedTx.debtor_name = updates.description;
            }
        }

        data.transactions[index] = updatedTx;

        // If amount was updated, ensure it's a number and handles indicator correctly
        if (updates.amount !== undefined) {
            updatedTx.amount = parseFloat(updates.amount);
            // If the user wants to keep a separate object structure, we update it too
            if (updatedTx.transaction_amount) {
                updatedTx.transaction_amount.amount = Math.abs(updatedTx.amount).toString();
            }
        }

        // Handle indicator update (CRDT/DBIT)
        if (updates.indicator) {
            const ind = updates.indicator.toUpperCase();
            if (ind === 'CRDT' || ind === 'DBIT') {
                if (updatedTx.credit_debit_indicator) updatedTx.credit_debit_indicator = ind;
                if (updatedTx.creditDebitIndicator) updatedTx.creditDebitIndicator = ind;
                
                // Adjust amount sign based on new indicator
                const rawAmt = Math.abs(updatedTx.amount);
                updatedTx.amount = ind === 'DBIT' ? -rawAmt : rawAmt;
            }
        }

        exports.saveTransactionsToFile(account_id, data.transactions);
        return updatedTx;
    } catch (error) {
        console.error(`Error updating transaction: ${error.message}`);
        return null;
    }
};
