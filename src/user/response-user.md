<!-- This is the file that will hold response structure for all the endpoints inside users module -->

# User Module Response Structures

## GET `/user/fetch-user-profile`

**Endpoint:** `GET /user/fetch-user-profile`  
**Guard:** `AuthGuard('jwt')` - Requires JWT authentication  
**Description:** Fetches the complete user profile including personal information, address, and KYC verification data.

### Response Structure

All responses follow the `ApiResponseDto` format:

```typescript
{
  success: boolean;
  message: string;
  data?: T;
}
```

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "User profile successfully fetched",
  "data": {
    "profile_data": {
      "id": "string (UUID)",
      "first_name": "string | empty string",
      "middle_name": "string | empty string",
      "last_name": "string | empty string",
      "email": "string",
      "phone_number": "string | empty string",
      "smipay_tag": "string | empty string (unique user tag/username)",
      "gender": "string | empty string (enum: 'male' | 'female')",
      "role": "string | empty string (enum: 'user' | 'admin' | 'super_admin')",
      "date_of_birth": "string (ISO date) | empty string",
      "email_verification": "boolean",
      "phone_verification": "boolean",
      "is_friendly": "boolean",
      "referral_code": "string | empty string",
      "account_status": "string | empty string (enum: 'active' | 'suspended')",
      "agree_to_terms": "boolean",
      "updates_opt_in": "boolean",
      "profile_image": "string (secure_url) | empty string",
      "joined": "string (formatted date) | 'N/A'",
      "updated_at": "string (formatted date) | 'N/A'"
    },
    "address": {
      "id": "string (UUID) | null",
      "house_no": "string | null",
      "city": "string | null",
      "state": "string | null",
      "country": "string | null",
      "house_address": "string | null",
      "postal_code": "string | null"
    },
    "user_kyc_data": {
      "id": "string (UUID) | empty string",
      "user_id": "string (UUID) | empty string",
      "is_verified": "boolean",
      "status": "string | empty string (enum: 'pending' | 'approved' | 'rejected')",
      "id_type": "string | empty string (enum: 'NIGERIAN_BVN_VERIFICATION' | 'NIGERIAN_NIN' | 'NIGERIAN_INTERNATIONAL_PASSPORT' | 'NIGERIAN_PVC' | 'NIGERIAN_DRIVERS_LICENSE')",
      "id_number": "string | empty string",
      "bvn": "string | empty string",
      "bvn_verified": "boolean",
      "watchlisted": "boolean",
      "initiated_at": "string (formatted date) | empty string",
      "approved_at": "string (formatted date) | empty string",
      "failure_reason": "string | empty string"
    },
    "account_tier": {
      "current_tier": {
        "tier": "string (enum: 'UNVERIFIED' | 'VERIFIED' | 'PREMIUM')",
        "name": "string",
        "description": "string",
        "requirements": "string[]",
        "limits": {
          "singleTransaction": "number (in NGN)",
          "daily": "number (in NGN)",
          "monthly": "number (in NGN)",
          "airtimeDaily": "number (in NGN)"
        }
      },
      "available_tiers": [
        {
          "tier": "string",
          "name": "string",
          "description": "string",
          "requirements": "string[]",
          "limits": {
            "singleTransaction": "number",
            "daily": "number",
            "monthly": "number",
            "airtimeDaily": "number"
          },
          "is_current": "boolean"
        }
      ]
    }
  }
}
```

### Example Response

```json
{
  "success": true,
  "message": "User profile successfully fetched",
  "data": {
    "profile_data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "John",
      "middle_name": "Michael",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "+2341234567890",
      "smipay_tag": "@johndoe",
      "gender": "male",
      "role": "user",
      "date_of_birth": "1990-01-15T00:00:00.000Z",
      "email_verification": true,
      "phone_verification": true,
      "is_friendly": false,
      "referral_code": "JOHN2024",
      "account_status": "active",
      "agree_to_terms": true,
      "updates_opt_in": true,
      "profile_image": "https://cloudinary.com/image.jpg",
      "joined": "2024-01-15",
      "updated_at": "2024-01-20"
    },
    "address": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "house_no": "123",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "house_address": "123 Main Street, Victoria Island",
      "postal_code": "101241"
    },
    "user_kyc_data": {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "is_verified": true,
      "status": "approved",
      "id_type": "NIGERIAN_BVN_VERIFICATION",
      "id_number": "12345678901",
      "bvn": "12345678901",
      "bvn_verified": true,
      "watchlisted": false,
      "initiated_at": "2024-01-16",
      "approved_at": "2024-01-17",
      "failure_reason": ""
    },
    "account_tier": {
      "current_tier": {
        "tier": "VERIFIED",
        "name": "Verified Tier",
        "description": "KYC verified account with increased transaction limits",
        "requirements": [
          "Phone number verification",
          "Email verification",
          "KYC verification (BVN/NIN)",
          "Face verification",
          "Address verification"
        ],
        "limits": {
          "singleTransaction": 100000,
          "daily": 500000,
          "monthly": 5000000,
          "airtimeDaily": 50000
        }
      },
      "available_tiers": [
        {
          "tier": "UNVERIFIED",
          "name": "Basic Tier",
          "description": "Phone verified account with basic transaction limits",
          "requirements": [
            "Phone number verification",
            "Email verification (optional)"
          ],
          "limits": {
            "singleTransaction": 50000,
            "daily": 200000,
            "monthly": 1000000,
            "airtimeDaily": 20000
          },
          "is_current": false
        },
        {
          "tier": "VERIFIED",
          "name": "Verified Tier",
          "description": "KYC verified account with increased transaction limits",
          "requirements": [
            "Phone number verification",
            "Email verification",
            "KYC verification (BVN/NIN)",
            "Face verification",
            "Address verification"
          ],
          "limits": {
            "singleTransaction": 100000,
            "daily": 500000,
            "monthly": 5000000,
            "airtimeDaily": 50000
          },
          "is_current": true
        },
        {
          "tier": "PREMIUM",
          "name": "Premium Tier",
          "description": "Fully verified account with maximum transaction limits",
          "requirements": [
            "Phone number verification",
            "Email verification",
            "KYC verification (BVN/NIN)",
            "Face verification",
            "Address verification",
            "BVN verification",
            "Additional documentation (if required)"
          ],
          "limits": {
            "singleTransaction": 500000,
            "daily": 2000000,
            "monthly": 10000000,
            "airtimeDaily": 100000
          },
          "is_current": false
        }
      ]
    }
  }
}
```

### Error Response

**Status Code:** `503 Service Unavailable`

```json
{
  "success": false,
  "message": "Error fetching user details",
  "statusCode": 503
}
```

### Notes

- **Profile Data:**
  - String fields default to empty strings (`""`) if not present
  - Boolean fields (`email_verification`, `phone_verification`, `is_friendly`, `agree_to_terms`, `updates_opt_in`) default to `false`
  - `smipay_tag` is a unique user identifier/tag (similar to username)
  - `account_status` can be `"active"` or `"suspended"`
  - `profile_image` contains the secure URL from Cloudinary or empty string if not set
  - `joined` and `updated_at` are formatted date strings or `"N/A"` if dates are not available

- **Address:**
  - All fields can be `null` if the user hasn't set up their address
  - Address is optional and may not exist for all users

- **KYC Data:**
  - String fields default to empty strings (`""`) if KYC verification hasn't been completed
  - Boolean fields (`is_verified`, `bvn_verified`, `watchlisted`) default to `false`
  - `initiated_at` and `approved_at` are formatted date strings or empty strings if not available
  - `failure_reason` contains the reason for KYC rejection if status is `"rejected"`, otherwise empty string
  - `bvn` is only populated if the user used BVN verification method

- **Account Tier:**
  - **Current Tier:** Determined automatically based on user's verification status:
    - `UNVERIFIED`: Phone verified only (basic tier)
    - `VERIFIED`: KYC verified with all required verifications
    - `PREMIUM`: Fully verified including BVN verification
  - **Available Tiers:** Returns all three tiers with their requirements and limits
  - Each tier in `available_tiers` has an `is_current` flag indicating if it's the user's current tier
  - Transaction limits are in NGN (Nigerian Naira)
  - Tier determination logic:
    - Premium: KYC verified + BVN verified + phone verified + email verified + address exists
    - Verified: KYC verified + phone verified + email verified + address exists (BVN not required)
    - Unverified: Only phone or email verified (default)
