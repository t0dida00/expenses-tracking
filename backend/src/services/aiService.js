exports.analyzeTransaction = async (transaction) => {
    // Logic for AI analysis will go here
    return {
        ...transaction,
        category: 'Uncategorized',
        sentiment: 'neutral'
    };
};
