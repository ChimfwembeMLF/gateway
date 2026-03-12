# Swagger Documentation Fix - Disbursements Endpoints

**Date**: February 6, 2026, 8:21 AM UTC  
**Status**: ✅ **COMPLETE**

---

## Issue

Airtel disbursement endpoints were not visible in Swagger/OpenAPI documentation.

## Root Cause

The `DisbursementsController` was using `@ApiSecurity('api-key', ['X-API-Key'])` but the Swagger configuration registered the API key scheme as `'x-api-key'`. This mismatch prevented Swagger from properly associating the endpoints with the security scheme.

## Solution Applied

### 1. Fixed Security Scheme Name ✅
Changed the security decorator from:
```typescript
@ApiSecurity('api-key', ['X-API-Key'])
```

To:
```typescript
@ApiSecurity('x-api-key')
```

This now matches the Swagger configuration in `src/swagger/swagger.setup.ts`:
```typescript
.addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
```

### 2. Added Missing Swagger Decorators ✅

#### Added to Imports:
```typescript
import {
  ApiParam,    // ← Added
  ApiBody,     // ← Added
  ApiQuery,    // ← Added
  // ... other decorators
} from '@nestjs/swagger';
```

#### POST /api/v1/disbursements Endpoint:
```typescript
@Post()
@ApiOperation({
  summary: 'Create a new disbursement',
  description: 'Send money to a customer Airtel Money wallet',
})
@ApiBody({                    // ← Added
  type: CreateDisbursementDto,
  description: 'Disbursement request details',
})
@ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Disbursement created successfully',
  type: DisbursementResponseDto,
})
// ... other decorators
async createDisbursement(...)
```

#### GET /api/v1/disbursements/:id Endpoint:
```typescript
@Get(':id')
@ApiOperation({
  summary: 'Get disbursement by ID',
  description: 'Retrieve details of a specific disbursement',
})
@ApiParam({                           // ← Added
  name: 'id',
  description: 'Disbursement UUID',
  example: '550e8400-e29b-41d4-a716-446655440000',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'Disbursement found',
  type: DisbursementResponseDto,
})
// ... other decorators
async getDisbursement(...)
```

#### GET /api/v1/disbursements (List) Endpoint:
```typescript
@Get()
@ApiOperation({
  summary: 'List disbursements',
  description: 'Retrieve paginated list of disbursements with optional filtering',
})
@ApiQuery({                                    // ← Added
  name: 'page',
  required: false,
  type: Number,
  description: 'Page number (1-indexed)',
  example: 1,
})
@ApiQuery({
  name: 'limit',
  required: false,
  type: Number,
  description: 'Items per page (max: 100)',
  example: 20,
})
@ApiQuery({
  name: 'status',
  required: false,
  type: String,
  enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT', 'BOUNCED', 'REFUNDED'],
  description: 'Filter by disbursement status',
})
@ApiQuery({
  name: 'startDate',
  required: false,
  type: String,
  description: 'Filter by creation date (ISO 8601, inclusive)',
  example: '2024-02-01T00:00:00Z',
})
@ApiQuery({
  name: 'endDate',
  required: false,
  type: String,
  description: 'Filter by creation date (ISO 8601, inclusive)',
  example: '2024-02-28T23:59:59Z',
})
@ApiResponse({
  status: HttpStatus.OK,
  description: 'List retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/DisbursementResponseDto' },
      },
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
      totalPages: { type: 'number' },
    },
  },
})
// ... other decorators
async listDisbursements(...)
```

---

## Swagger API Documentation Now Includes

### Endpoints (Visible in Swagger)
✅ **POST** `/api/v1/disbursements` - Create disbursement
✅ **GET** `/api/v1/disbursements/{id}` - Get disbursement by ID  
✅ **GET** `/api/v1/disbursements` - List disbursements

### Request Documentation
✅ Request body schema with all fields and examples
✅ Path parameters (id)
✅ Query parameters (page, limit, status, startDate, endDate)
✅ Required vs optional indicators
✅ Example values for each field

### Response Documentation
✅ Success response schemas (201, 200)
✅ Error responses (400, 401, 404, 409, 429, 500)
✅ Response field descriptions

### Authentication
✅ API Key requirement (x-api-key header)
✅ Try it out button with API key field

---

## Files Modified

1. **src/modules/disbursements/controllers/disbursements.controller.ts**
   - Changed: `@ApiSecurity('api-key', ['X-API-Key'])` → `@ApiSecurity('x-api-key')`
   - Added: `ApiParam`, `ApiBody`, `ApiQuery` imports
   - Added: `@ApiBody` to POST endpoint
   - Added: `@ApiParam` to GET :id endpoint
   - Added: `@ApiQuery` decorators to GET list endpoint (5 query parameters)

---

## Verification

### Swagger UI Access
```
URL: http://localhost:3000/api/docs
or
URL: http://localhost:3000/documentation
```

### What's Now Visible in Swagger

1. **Disbursements Tag** (grouped together)
   - All 3 endpoints appear under "Disbursements" section
   - Each endpoint has clear operation summary and description
   - Example requests and responses shown

2. **Try It Out Functionality**
   - API key field available in Swagger UI
   - Can test endpoints directly from Swagger

3. **Schema Documentation**
   - All request and response schemas documented
   - Field types and descriptions visible
   - Example values provided

---

## Build Status

✅ TypeScript compilation: **Successful**  
✅ No errors or warnings  
✅ Application ready to start

---

## Test the Endpoints

### 1. Access Swagger Documentation
```bash
# Start the application
npm run start:dev

# Open browser to Swagger
http://localhost:3000/api/docs
```

### 2. Test with cURL
```bash
# Get API key from your tenant
API_KEY="your-api-key-here"

# Create disbursement
curl -X POST http://localhost:3000/api/v1/disbursements \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "test-001",
    "payeeMsisdn": "0977123456",
    "amount": 100.50,
    "currency": "ZMW",
    "reference": "Test",
    "pin": "1234"
  }'

# Get disbursement by ID
curl -X GET http://localhost:3000/api/v1/disbursements/{id} \
  -H "X-API-Key: $API_KEY"

# List disbursements
curl -X GET "http://localhost:3000/api/v1/disbursements?page=1&limit=20" \
  -H "X-API-Key: $API_KEY"
```

---

## Summary

All three disbursement endpoints are now **fully documented in Swagger/OpenAPI** with:

✅ Proper security scheme association  
✅ Complete parameter documentation  
✅ Request/response examples  
✅ Error response documentation  
✅ Try it out functionality  

The endpoints are discoverable and testable directly from the Swagger UI.

---

**Status**: ✅ **READY FOR USE**

Users can now:
1. See all disbursement endpoints in Swagger UI
2. Understand each endpoint's purpose and parameters
3. Test endpoints directly from Swagger with their API key
4. View example requests and responses
