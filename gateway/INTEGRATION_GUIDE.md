# Payment Gateway Integration Guide

This document explains how to integrate and use the NestJS Payment Gateway from another application.

## 1. Overview
The gateway exposes RESTful APIs for user management, authentication, and unified payment processing. All payment providers are accessed through a single `/api/v1/payments` endpoint. The gateway acts as a relay between your app and multiple internal/external payment systems.

## 2. Prerequisites
- The gateway must be running and accessible (e.g., `http://localhost:3000` or your deployed URL).
- Obtain API credentials (if authentication is enabled).


## 3. Authentication
All endpoints require an API key for authentication. Register to obtain your API key, then include it in the `Authorization` header for every request:

### Register
```
POST /api/v1/auth/register
Content-Type: application/json
{

  # Payment Gateway Integration Guide

  This guide explains how to integrate with the Payment Gateway using API key authentication, following industry standards for easy adoption.

  ---

  ## 1. Overview
  The gateway exposes RESTful APIs for user management and unified payment processing. All payment providers are accessed through a single `/api/v1/payments` endpoint. API key authentication is required for all endpoints.

  ## 2. Prerequisites
  - The gateway must be running and accessible (e.g., `http://localhost:3000` or your deployed URL).
  - Register for an account to obtain your API key.


  ## 3. Authentication (API Key)

  ### Public Endpoints
  - `/api/v1/auth/register` — Register a new user (no API key required)
  - `/api/v1/auth/login` — Login (no API key required)

  ### Protected Endpoints
  - All other endpoints (e.g., `/api/v1/payments`, `/api/v1/users/:id`) require an API key in the `Authorization` header.

  ### Register
  ```
  POST /api/v1/auth/register
  Content-Type: application/json
  {
    "username": "youruser",
    "password": "yourpassword"
  }
  ```
  *Email is optional. Only username and password are required for registration.*

  ### Get Your API Key
  After registration, your API key is returned in the response. You can also retrieve it from your user profile (`/api/v1/users/:id`).

  ### Using the API Key
  Include your API key in the `Authorization` header for every protected request:
  ```
  Authorization: Bearer <api_key>
  ```
  *No JWT or login required for API access. The API key is all you need for server-to-server integration.*

  ### Regenerating Your API Key
  If you need to rotate your API key, use the API endpoint `/api/v1/users/:id/generate-api-key` (see API docs for details).

  ## 4. Making Payments

  Example: Initiate a payment (all providers)
  ```
  POST /api/v1/payments
  Authorization: Bearer <api_key>
  Content-Type: application/json
  {
    "provider": "mtn", // or other supported provider
    "amount": 100,
    "currency": "ZMW",
    "externalId": "order-123",
    "payer": { "partyIdType": "MSISDN", "partyId": "2609xxxxxxx" },
    "payerMessage": "Payment for order 123",
    "payeeNote": "Thank you"
  }
  ```
  *The `provider` field selects the payment provider. All payments use this unified endpoint.*

  ## 5. Webhook Handling
  If your app needs to receive payment status updates, provide a webhook URL to the gateway (if supported). Ensure your endpoint is reachable and can process POST requests.

  ## 6. Error Handling
  All responses use standard HTTP status codes. On error, the response will include a message and details.

  ## 7. API Documentation
  Visit `/documentation` (Swagger UI) for full API details and to test endpoints interactively.

  ## 8. Example Integration (Node.js)
  ```js
  const axios = require('axios');

  // 1. Register and get your API key
  const register = await axios.post('http://localhost:3000/api/v1/auth/register', {
    username: 'youruser',
    password: 'yourpassword',
  });
  const api_key = register.data.apiKey; // Or fetch from /api/v1/users/:id

  // 2. Make a payment (unified endpoint)
  await axios.post('http://localhost:3000/api/v1/payments', {
    provider: 'mtn',
    amount: 100,
    currency: 'ZMW',
    externalId: 'order-123',
    payer: { partyIdType: 'MSISDN', partyId: '2609xxxxxxx' },
    payerMessage: 'Payment for order 123',
    payeeNote: 'Thank you',
  }, {
    headers: { Authorization: `Bearer ${api_key}` }
  });
  ```

  ## 9. Best Practices
  - Keep your API key secret. Do not expose it in client-side code.
  - Rotate your API key if you suspect it is compromised.
  - Use different API keys for different environments (test, production) if supported.

  ## 10. Support
  For questions or issues, contact the gateway maintainer or open an issue in the repository.
