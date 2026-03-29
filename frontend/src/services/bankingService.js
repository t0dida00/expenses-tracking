/**
 * BankingService follows the Dependency Inversion principle by providing 
 * a clean interface for external API communications.
 */
class BankingService {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getAuthUrl(params) {
    const response = await fetch(`${this.baseUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initiate authentication');
    }

    return await response.json();
  }

  async exchangeCode(code) {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange session');
    }

    return await response.json();
  }

  async getAspsps(country = 'FI') {
    const response = await fetch(`${this.baseUrl}/aspsps?country=${country}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch ASPSPs');
    }

    return await response.json();
  }

  async getTransactions(accountId, sessionId) {
    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/transactions?session_id=${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch transactions');
    }

    const data = await response.json();
    return data.transactions || [];
  }
  
  async updateTransaction(accountId, entryReference, updates) {
    const encodedAcc = encodeURIComponent(accountId);
    const encodedRef = encodeURIComponent(entryReference);
    const url = `${this.baseUrl}/accounts/${encodedAcc}/transactions/${encodedRef}`;
    
    console.log(`FETCH PATCH: ${url}`);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      let errorMsg = 'Failed to update transaction';
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } else {
        const text = await response.text();
        console.error('Non-JSON Error Response:', text);
      }
      throw new Error(errorMsg);
    }

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { status: 'ok' };
  }
}

export const bankingService = new BankingService();
