const { InferenceClient } = require('@huggingface/inference');
const config = require('../config/env');

const client = new InferenceClient(config.HUGGINGFACE_API_KEY);

exports.classifyTransaction = async (transaction) => {
    if (!config.HUGGINGFACE_API_KEY) {
        console.warn('Hugging Face API key missing. Please check HUGGINGFACE_API_KEY in .env');
        return { category: 'Other', child_category: 'Other' };
    }

    const { description, credit_debit_indicator, amount, currency, creditor, debtor } = transaction;
    const creditor_debtor = credit_debit_indicator === 'DBIT' ? creditor : debtor || 'Unknown';

    const categories = [
        'Income',
        'Housing',
        'Bills & Utilities',
        'Food & Grocery',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Health & Wellness',
        'Financial',
        'Travel',
        'Gifts & Donations',
        'Other'
    ];

    const systemPrompt = `You are a financial transaction classifier.
Classify the transaction into ONE of these categories: ${categories.join(', ')}.
Provide the final result as a raw JSON object only. Do not use markdown formatting.
Priority:
1st:
DBIT is always an expense.
CRDT is always an income.
2nd: check description for keywords`;

    const userPrompt = `Transaction Details:
- Description: ${description || 'No description'}
- Indicator: ${credit_debit_indicator || 'Unknown'}
- Amount: ${amount || '0'} ${currency || ''}
- Creditor/Debitor: ${creditor_debtor || 'Unknown'}

Return ONLY this JSON structure:
{
  "category": category name only,
  "child_category": child category name only
}`;

    try {
        const response = await client.chatCompletion({
            model: config.HUGGINGFACE_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 300,
            temperature: 0.1
        });

        const message = response.choices[0].message;
        let resultText = message.content || message.reasoning || '';

        const jsonMatch = resultText.match(/\{.*\}/s);
        if (jsonMatch) {
            try {
                const json = JSON.parse(jsonMatch[0]);
                if (json.category) {
                    const foundCategory = categories.find(c => c.toLowerCase() === json.category.toLowerCase()) || json.category;
                    return {
                        category: foundCategory,
                        child_category: json.child_category || 'Other'
                    };
                }
            } catch (pErr) {
                console.error('Failed to parse AI JSON response:', pErr.message);
            }
        }

        // Fallback: search for category words in the text
        let fallbackCategory = 'Other';
        for (const cat of categories) {
            if (resultText.toLowerCase().includes(cat.toLowerCase())) {
                fallbackCategory = cat;
                break;
            }
        }

        return {
            category: fallbackCategory,
            child_category: 'Other'
        };
    } catch (error) {
        console.error('Error with Hugging Face classification:', error.message);
        return { category: 'Other', child_category: 'Other' };
    }
};

exports.analyzeTransaction = async (transaction) => {
    if (!transaction) {
        return {
            category: 'Other',
            child_category: 'Other',
            ai_processed: false
        };
    }

    const inputData = {
        description: transaction.remittance_information,
        credit_debit_indicator: transaction.credit_debit_indicator,
        amount: transaction.transaction_amount?.amount || transaction.amount,
        currency: transaction.transaction_amount?.currency || transaction.currency,
        creditor: transaction.creditor?.name,
        debtor: transaction.debtor?.name
    };

    const classification = await exports.classifyTransaction(inputData);

    return {
        ...transaction,
        category: classification.category,
        child_category: classification.child_category,
        ai_processed: true
    };
};
