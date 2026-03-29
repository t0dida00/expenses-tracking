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
