# Mobile App Integration Guide

Complete guide for integrating the Payment Gateway API into a mobile application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Payments (Collections)](#payments-collections)
5. [Disbursements (Payouts)](#disbursements-payouts)
6. [Merchant Configuration](#merchant-configuration)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Code Examples](#code-examples)

---

## Getting Started

### Prerequisites

- Node.js 16+ or compatible JavaScript runtime
- API credentials (tenant ID, API key)
- HTTPS connection for production

### Environment Setup

```typescript
// .env
REACT_APP_API_URL=https://api.paymentgateway.local/api/v1
REACT_APP_TENANT_ID=your-tenant-id
REACT_APP_API_KEY=your-api-key
```

---

## Installation

### React Native / Flutter / Native

#### For TypeScript/JavaScript Projects

```bash
npm install payment-gateway-client
# or
yarn add payment-gateway-client
```

#### Manual Integration

Copy `mobile-app-api-client.ts` into your project:

```bash
cp specs/mobile-app-api-client.ts src/services/api/
```

---

## Authentication

### 1. User Registration

```typescript
import { PaymentGatewayClient } from './api/mobile-app-api-client';

const client = new PaymentGatewayClient({
  baseUrl: process.env.REACT_APP_API_URL,
});

async function registerUser() {
  try {
    const response = await client.auth.register({
      email: 'merchant@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      // Optional: provide tenantId if joining existing tenant
      // tenantId: 'existing-tenant-id'
    });

    if (response.data) {
      // Save tokens securely
      await saveToSecureStorage('accessToken', response.data.accessToken);
      await saveToSecureStorage('refreshToken', response.data.refreshToken);
      
      // Set client tenant
      client.setTenantId(response.data.user.tenantId);
      
      return response.data.user;
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

### 2. User Login

```typescript
async function loginUser(email: string, password: string) {
  try {
    const response = await client.auth.login({
      email,
      password,
    });

    if (response.data) {
      // Store tokens securely (use react-native-keychain, etc.)
      await SecureStorage.setItem(
        'accessToken',
        response.data.accessToken,
      );
      await SecureStorage.setItem(
        'refreshToken',
        response.data.refreshToken,
      );

      // Initialize client
      client.setAccessToken(response.data.accessToken);
      client.setTenantId(response.data.user.tenantId);

      return response.data.user;
    }
  } catch (error) {
    if (error.statusCode === 401) {
      // Show "Invalid credentials" message
    }
    throw error;
  }
}
```

### 3. Initialize Client with Stored Token

```typescript
// On app startup
async function initializeClient() {
  const accessToken = await SecureStorage.getItem('accessToken');
  const tenantId = await SecureStorage.getItem('tenantId');

  if (accessToken && tenantId) {
    client.setAccessToken(accessToken);
    client.setTenantId(tenantId);
    
    // Verify token is still valid
    try {
      await client.auth.getMe();
      return true; // Client ready
    } catch {
      // Token expired, refresh or re-login
      return false;
    }
  }
  return false;
}
```

### 4. Logout

```typescript
async function logoutUser() {
  // Clear tokens from secure storage
  await SecureStorage.removeItem('accessToken');
  await SecureStorage.removeItem('refreshToken');
  await SecureStorage.removeItem('tenantId');

  // Clear client authentication
  client.clearAuth();
}
```

---

## Payments (Collections)

### Create Payment Request

```typescript
import { PaymentProvider, generateUUID } from './api/mobile-app-api-client';

async function requestPayment(amount: number, phoneNumber: string) {
  try {
    const response = await client.payments.create(
      {
        amount,
        currency: 'ZMW',
        phoneNumber, // e.g., "+260971234567"
        externalId: `INV-${Date.now()}`, // Unique reference
        description: 'Payment for services',
        provider: PaymentProvider.MTN,
        customerName: 'Customer Name', // Optional
        metadata: {
          orderId: 'order-123',
          invoiceNumber: 'INV-2024-001',
        },
      },
      {
        idempotencyKey: generateUUID(), // Prevent duplicate requests
      },
    );

    if (response.data) {
      console.log('Payment created:', response.data.id);
      console.log('Payment status:', response.data.status);
      return response.data;
    }
  } catch (error) {
    if (error.statusCode === 402) {
      console.error('Insufficient balance');
    } else {
      console.error('Payment creation failed:', error);
    }
  }
}
```

### Monitor Payment Status

```typescript
async function checkPaymentStatus(paymentId: string) {
  try {
    // Poll for status updates
    let isCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10s interval

    while (!isCompleted && attempts < maxAttempts) {
      const response = await client.payments.getStatus(
        paymentId,
        PaymentProvider.MTN,
      );

      if (response.data) {
        console.log('Payment status:', response.data.status);

        if (
          response.data.status === 'COMPLETED' ||
          response.data.status === 'FAILED'
        ) {
          isCompleted = true;
          return response.data;
        }
      }

      // Wait 10 seconds before next check
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }
  } catch (error) {
    console.error('Status check failed:', error);
  }
}
```

### Get Payment History

```typescript
async function getPaymentHistory() {
  try {
    const response = await client.payments.list({
      status: 'COMPLETED',
      provider: PaymentProvider.MTN,
      skip: 0,
      limit: 20,
    });

    if (response.data) {
      console.log(`Total payments: ${response.total}`);
      return response.data;
    }
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
  }
}
```

### Check Balance

```typescript
async function checkBalance() {
  try {
    const response = await client.payments.getBalance(PaymentProvider.MTN);

    if (response.data) {
      console.log('Balance:', response.data.balance);
      console.log('Currency:', response.data.currency);
      return response.data;
    }
  } catch (error) {
    console.error('Failed to fetch balance:', error);
  }
}
```

---

## Disbursements (Payouts)

### Create Disbursement

```typescript
async function sendMoney(
  amount: number,
  phoneNumber: string,
  recipientName: string,
) {
  try {
    const response = await client.disbursements.create(
      {
        amount,
        currency: 'ZMW',
        phoneNumber,
        externalId: `PAYOUT-${Date.now()}`,
        description: 'Salary payment',
        provider: PaymentProvider.MTN,
        recipientName,
        metadata: {
          employeeId: 'EMP-123',
          payrollPeriod: '2024-02',
        },
      },
      {
        idempotencyKey: generateUUID(),
      },
    );

    if (response.data) {
      console.log('Disbursement created:', response.data.id);
      return response.data;
    }
  } catch (error) {
    if (error.statusCode === 402) {
      console.error('Insufficient balance for payout');
    } else {
      console.error('Disbursement failed:', error);
    }
  }
}
```

### Track Disbursement

```typescript
async function trackDisbursement(disbursementId: string) {
  try {
    const response = await client.disbursements.getStatus(
      disbursementId,
      PaymentProvider.MTN,
    );

    if (response.data) {
      console.log('Disbursement status:', response.data.status);
      return response.data;
    }
  } catch (error) {
    console.error('Failed to track disbursement:', error);
  }
}
```

### Get Disbursement History

```typescript
async function getDisbursementHistory() {
  try {
    const response = await client.disbursements.list({
      status: 'COMPLETED',
      provider: PaymentProvider.MTN,
      skip: 0,
      limit: 20,
    });

    if (response.data) {
      return response.data;
    }
  } catch (error) {
    console.error('Failed to fetch disbursement history:', error);
  }
}
```

---

## Merchant Configuration

### Get Configuration

```typescript
async function getMerchantConfig() {
  try {
    const response = await client.merchant.getConfiguration();

    if (response.data) {
      return {
        businessName: response.data.businessName,
        kycStatus: response.data.kycStatus,
        mtnActive: response.data.mtnAccountActive,
        airtelActive: response.data.airtelAccountActive,
        maxDailyCollections: response.data.maxDailyCollections,
        maxTransactionAmount: response.data.maxTransactionAmount,
      };
    }
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
  }
}
```

### Update Configuration

```typescript
async function updateMerchantConfig(updates: any) {
  try {
    const response = await client.merchant.updateConfiguration({
      businessName: updates.businessName,
      contactPersonEmail: updates.email,
      contactPersonPhone: updates.phone,
      webhookUrl: updates.webhookUrl,
      webhookEnabled: updates.webhookEnabled,
      maxDailyCollections: updates.maxDailyCollections,
      maxTransactionAmount: updates.maxTransactionAmount,
    });

    if (response.data) {
      return response.data;
    }
  } catch (error) {
    console.error('Failed to update configuration:', error);
  }
}
```

### Verify Payment Providers

```typescript
async function verifyPaymentProviders() {
  try {
    // Verify MTN
    const mtnResult = await client.merchant.verifyMtnCredentials();
    console.log('MTN verified:', mtnResult.verified);

    // Verify Airtel
    const airtelResult = await client.merchant.verifyAirtelCredentials();
    console.log('Airtel verified:', airtelResult.verified);

    // Verify Bank Account
    const bankResult = await client.merchant.verifyBankAccount();
    console.log('Bank verified:', bankResult.verified);

    return {
      mtn: mtnResult.verified,
      airtel: airtelResult.verified,
      bank: bankResult.verified,
    };
  } catch (error) {
    console.error('Verification failed:', error);
  }
}
```

---

## Error Handling

### Handle API Errors

```typescript
import { ApiError } from './api/mobile-app-api-client';

async function safeApiCall(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.statusCode) {
        case 400:
          console.error('Invalid request:', error.message);
          break;
        case 401:
          console.error('Unauthorized - please login again');
          // Redirect to login
          break;
        case 402:
          console.error('Payment required - insufficient balance');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 429:
          console.error('Rate limit exceeded - please try again later');
          break;
        case 500:
          console.error('Server error - please try again');
          break;
        default:
          console.error(`Error ${error.statusCode}: ${error.message}`);
      }

      return null;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      console.error('Network error:', error.message);
    }
  }
}
```

### Retry Strategy

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const result = await retryWithBackoff(() => client.payments.create(data));
```

---

## Best Practices

### 1. Secure Token Storage

```typescript
// React Native
import * as SecureStore from 'expo-secure-store';

async function saveToken(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

async function getToken(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
}
```

### 2. Idempotency for Critical Operations

```typescript
// Always use idempotency key for payments and disbursements
async function createPaymentIdempotent(paymentData: any) {
  const idempotencyKey = generateUUID();
  
  try {
    return await client.payments.create(paymentData, {
      idempotencyKey,
    });
  } catch (error) {
    // If network error, can retry with same key
    // Server will return cached response
    throw error;
  }
}
```

### 3. Validate Input

```typescript
function validatePhoneNumber(phone: string): boolean {
  // International format: +260971234567
  const pattern = /^[+]?[0-9]{7,15}$/;
  return pattern.test(phone.replace(/\s+/g, ''));
}

function validateAmount(amount: number, maxAmount: number): boolean {
  return amount > 0 && amount <= maxAmount;
}

async function requestPaymentSafe(amount: number, phone: string) {
  if (!validateAmount(amount, 100000)) {
    throw new Error('Invalid amount');
  }

  if (!validatePhoneNumber(phone)) {
    throw new Error('Invalid phone number');
  }

  return client.payments.create({
    amount,
    currency: 'ZMW',
    phoneNumber: phone,
    externalId: `INV-${Date.now()}`,
  });
}
```

### 4. Handle Network Connectivity

```typescript
import NetInfo from '@react-native-community/netinfo';

async function ensureConnected() {
  const state = await NetInfo.fetch();
  
  if (!state.isConnected) {
    throw new Error('No internet connection');
  }
}

async function createPaymentWithConnectivity(data: any) {
  try {
    await ensureConnected();
    return await client.payments.create(data);
  } catch (error) {
    if (error.message.includes('No internet')) {
      // Queue payment for later
      await queueForOfflineSync(data);
    }
    throw error;
  }
}
```

### 5. Polling for Transaction Status

```typescript
async function pollTransactionStatus(
  transactionId: string,
  maxWaitTime: number = 300000, // 5 minutes
) {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await client.payments.getStatus(transactionId);

      if (response.data.status === 'COMPLETED') {
        return { success: true, data: response.data };
      }

      if (response.data.status === 'FAILED') {
        return {
          success: false,
          error: response.data.errorMessage,
        };
      }

      // Still pending, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  return { success: false, error: 'Transaction status timeout' };
}
```

---

## Code Examples

### Complete Payment Flow

```typescript
// Payment flow example
async function completePaymentFlow() {
  try {
    // 1. Check balance
    const balance = await client.payments.getBalance(PaymentProvider.MTN);
    console.log('Current balance:', balance.data?.balance);

    // 2. Create payment
    const payment = await client.payments.create({
      amount: 100.50,
      currency: 'ZMW',
      phoneNumber: '+260971234567',
      externalId: `INV-${Date.now()}`,
      description: 'Payment for services',
      provider: PaymentProvider.MTN,
    });

    if (!payment.data) throw new Error('Payment creation failed');

    console.log('Payment created:', payment.data.id);

    // 3. Poll for completion (max 5 minutes)
    const result = await pollTransactionStatus(payment.data.id, 300000);

    if (result.success) {
      console.log('Payment completed successfully');
      // Update UI, show success message
    } else {
      console.error('Payment failed:', result.error);
      // Show error message
    }

    return result;
  } catch (error) {
    console.error('Payment flow error:', error);
  }
}
```

### Complete Disbursement Flow

```typescript
async function completeDisbursementFlow() {
  try {
    // 1. Verify merchant configuration
    const config = await client.merchant.getConfiguration();
    if (!config.data?.mtnAccountActive) {
      throw new Error('MTN account not active');
    }

    // 2. Create disbursement
    const disbursement = await client.disbursements.create({
      amount: 500.00,
      currency: 'ZMW',
      phoneNumber: '+260971234567',
      externalId: `PAYOUT-${Date.now()}`,
      description: 'Salary payment',
      provider: PaymentProvider.MTN,
      recipientName: 'Employee Name',
    });

    if (!disbursement.data) throw new Error('Disbursement creation failed');

    console.log('Disbursement created:', disbursement.data.id);

    // 3. Track disbursement
    const status = await client.disbursements.getStatus(disbursement.data.id);
    console.log('Disbursement status:', status.data?.status);

    return disbursement.data;
  } catch (error) {
    console.error('Disbursement flow error:', error);
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function usePaymentGateway() {
  const [client, setClient] = useState<PaymentGatewayClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeClient();
  }, []);

  async function initializeClient() {
    const instance = new PaymentGatewayClient({
      baseUrl: process.env.REACT_APP_API_URL,
    });

    // Restore session
    const token = await SecureStorage.getItem('accessToken');
    if (token) {
      instance.setAccessToken(token);
      try {
        const response = await instance.auth.getMe();
        if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch {
        // Token expired, need to re-login
      }
    }

    setClient(instance);
    setLoading(false);
  }

  async function login(email: string, password: string) {
    if (!client) return;

    const response = await client.auth.login({ email, password });
    if (response.data) {
      await SecureStorage.setItem('accessToken', response.data.accessToken);
      setUser(response.data.user);
      setIsAuthenticated(true);
    }
  }

  async function logout() {
    await SecureStorage.removeItem('accessToken');
    client?.clearAuth();
    setIsAuthenticated(false);
    setUser(null);
  }

  return {
    client,
    isAuthenticated,
    user,
    loading,
    login,
    logout,
  };
}

// Usage in component
function PaymentScreen() {
  const { client, isAuthenticated } = usePaymentGateway();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');

  async function handlePayment() {
    if (!client) return;

    try {
      const response = await client.payments.create({
        amount: parseFloat(amount),
        currency: 'ZMW',
        phoneNumber: phone,
        externalId: `INV-${Date.now()}`,
      });

      if (response.data) {
        console.log('Payment created:', response.data.id);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    }
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
      />
      <button onClick={handlePayment}>Send Payment</button>
    </div>
  );
}
```

---

## Support

For issues or questions:
- Email: support@paymentgateway.local
- Documentation: https://docs.paymentgateway.local
- API Status: https://status.paymentgateway.local

---

## Changelog

### Version 1.0.0 (2024-02-07)

- Initial release
- Support for MTN and Airtel payments
- Payment collections and disbursements
- Merchant configuration management
- Comprehensive error handling
