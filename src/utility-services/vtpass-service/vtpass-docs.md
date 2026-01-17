### Integrating the VTpass API

Use the Sandbox environment for all testing. After successful sandbox tests and completing your integration, request access to the Live environment.


### Environments

- **Sandbox**: For test purposes, create an account on the Sandbox platform. This account has a default wallet balance that will be debited for transactions, similar to Live.
  - **Create account**: [VTpass Sandbox](https://sandbox.vtpass.com)

- **Live**: Register on the Live platform and request API access from support after completing some sandbox testing.
  - **Create account**: [VTpass Live](https://www.vtpass.com)


### API Base URLs

- **Sandbox API**: [https://sandbox.vtpass.com/api/](https://sandbox.vtpass.com/api/)
- **Live API**: [https://vtpass.com/api/](https://vtpass.com/api/)


### Support and Technical Assistance

We offer integration support through multiple channels:

- **Email**: `support@vtpass.com`
- **Skype**: `vtpass.techsupport`


### API Key Authentication

VTpass uses API keys for authentication. Follow the steps below to generate and use your keys.

#### Generate API Keys

1. Go to your profile page:
   - **Live**: [VTpass Profile](https://www.vtpass.com/profile)
   - **Sandbox**: [Sandbox Profile](https://sandbox.vtpass.com/profile)
2. Open the **API Keys** tab.
3. Set **API Authentication Type** to **All** or **API Keys**.
4. Copy your static API Key.
5. Click to generate your **Public** and **Secret** keys. These are shown only once—copy and store them securely. If you miss copying them, generate a new set.

#### Using Your API Keys

- **GET requests**: pass `api-key` and `public-key` in request headers.

```http
api-key: xxxxxxxxxxxxxxxxxxxx
public-key: PK_xxxxxxxxxxxxxxxxx
```

- **POST requests**: pass `api-key` and `secret-key` in request headers.

```http
api-key: xxxxxxxxxxxxxxxxxxxx
secret-key: SK_xxxxxxxxxxxxxxxxx
```

### How to Generate Request ID
The Request ID should follow the Unix-like format `YYYYMMDDHHII` (today’s date + current hour + minute). You may append any alphanumeric string.

- Examples: `202201301610`, `202201301610ad8ef08acd8fc0f`, `2022013016104738492849`

Notes:

- MUST BE 12 CHARACTERS OR MORE
- FIRST 12 CHARACTERS MUST BE NUMERIC
- FIRST 12 CHARACTERS MUST COMPRISE OF TODAY’S DATE
- Date and Time should be in Africa/Lagos (GMT +1)

Example:

```json
"request_id": "202202071830YUs83meikd"
```


### Whitelist Products
Although you have access to all VTpass products, they are disabled by default. Whitelist products you intend to vend.

Steps:

1. Open your profile:
   - **Live**: [VTpass Profile](https://www.vtpass.com/profile)
   - **Sandbox**: [Sandbox Profile](https://sandbox.vtpass.com/profile)
2. Go to the **Product Settings** tab.
3. Select the products to vend and click **Submit**.


### Available Services API
Get available service categories.

- Authentication: see [API Key Authentication](#api-key-authentication)
- Endpoint:
  - Live: `https://vtpass.com/api/service-categories`
  - Sandbox: `https://sandbox.vtpass.com/api/service-categories`

Fields:

| Field | Mandatory | Type | Description |
|------|-----------|------|-------------|
| N/A | N/A | N/A | N/A |

Expected response:

```json
{
  "response_description": "000",
  "content": [
    { "identifier": "airtime", "name": "Airtime Recharge" },
    { "identifier": "data", "name": "Data Services" },
    { "identifier": "tv-subscription", "name": "TV Subscription" },
    { "identifier": "electricity-bill", "name": "Electricity Bill" },
    { "identifier": "education", "name": "Education" },
    { "identifier": "other-services", "name": "Other Merchants/Services" },
    { "identifier": "insurance", "name": "Insurance" }
  ]
}
```
------------------------------------------------




------------------------------------------------
### Service ID API
Get available `serviceID`s for a category (e.g., Data).

- Authentication: see [API Key Authentication](#api-key-authentication)
- Endpoint:
  - Live: `https://vtpass.com/api/services?identifier=data`
  - Sandbox: `https://sandbox.vtpass.com/api/services?identifier=data`

Fields:

| Field | Mandatory | Type | Description |
|------|-----------|------|-------------|
| N/A | N/A | N/A | N/A |

Expected response:

```json
{
  "response_description": "000",
  "content": [
    { "serviceID": "airtel-data", "name": "Airtel Data", "minimium_amount": "1", "maximum_amount": "1000000", "convinience_fee": "0 %", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/Airtel-Data.jpg" },
    { "serviceID": "mtn-data", "name": "MTN Data", "minimium_amount": "1", "maximum_amount": "1000000", "convinience_fee": "0 %", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/MTN-Data.jpg" },
    { "serviceID": "glo-data", "name": "GLO Data", "minimium_amount": "1", "maximum_amount": "200000", "convinience_fee": "0 %", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data.jpg" },
    { "serviceID": "etisalat-data", "name": "9mobile Data", "minimium_amount": "1", "maximum_amount": "1000000", "convinience_fee": "0 %", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/9mobile-Data.jpg" },
    { "serviceID": "smile-direct", "name": "Smile Payment", "minimium_amount": "100", "maximum_amount": "150000", "convinience_fee": "N0", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/Smile-Payment.jpg" },
    { "serviceID": "spectranet", "name": "Spectranet Internet Data", "minimium_amount": "1", "maximum_amount": "100000", "convinience_fee": "N0", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/Spectranet.jpg" },
    { "serviceID": "glo-sme-data", "name": "GLO Data (SME)", "minimium_amount": "1", "maximum_amount": "1000000", "convinience_fee": "0 %", "product_type": "fix", "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data-(SME).jpg" }
  ]
}
```

Note: Identifiers are obtained from this endpoint.




------------------------------------------------
### Variation Codes API
Get variation codes for products with multiple options (e.g., data plans, TV bouquets).

- Authentication: see [API Key Authentication](#api-key-authentication)
- Endpoint (example: GOTV):
  - Live: `https://vtpass.com/api/service-variations?serviceID=gotv`
  - Sandbox: `https://sandbox.vtpass.com/api/service-variations?serviceID=gotv`

Fields:

| Field | Mandatory | Type | Description |
|------|-----------|------|-------------|
| serviceID | M | string | Change to target other products/services |

Expected response:

```json
{
  "response_description": "000",
  "content": {
    "ServiceName": "GOTV Payment",
    "serviceID": "gotv",
    "convinience_fee": "100 %",
    "variations": [
      { "variation_code": "gotv-lite", "name": "GOtv Lite N400", "variation_amount": "400.00", "fixedPrice": "Yes" },
      { "variation_code": "gotv-value", "name": "GOtv value N1250", "variation_amount": "1250.00", "fixedPrice": "Yes" }
    ]
  }
}
```

Note: Update `serviceID` to retrieve variations for other products/services.
***
### Product Options API
Get options for products that require additional selections (e.g., flight passenger type).

- Authentication: see [API Key Authentication](#api-key-authentication)
- Endpoint (example: Aero passenger type):
  - Live: `https://vtpass.com/api/options?serviceID=aero&name=passenger_type`
  - Sandbox: `https://sandbox.vtpass.com/api/options?serviceID=aero&name=passenger_type`

Fields:

| Field | Mandatory | Type | Description |
|------|-----------|------|-------------|
| serviceID | M | string | Service ID (`aero` in this example) |
| name | M | string | Option name (`passenger_type`, others include `trip_type`) |

Expected response:

```json
{
  "response_description": "000",
  "content": {
    "ServiceName": "Aero",
    "serviceID": "aero",
    "optionName": "passenger_type",
    "optionType": "MultipleSelect",
    "optionLabel": "Passenger Type",
    "options": {
      "adult": "Adult (18yrs and Above)",
      "child": "Child (3yrs to 19yrs)",
      "infant": "Infant (Below 3yrs)"
    }
  }
}
```

Note: Option `name` will vary by product/service.




------------------------------------------------
### Buying Services via API
Recommended flow for purchases.

- Authentication: see [API Key Authentication](#api-key-authentication)
- Request ID: use the format in [How to Generate Request ID](#how-to-generate-request-id)

Buy Airtime:
1. Get service categories
2. Get Service ID
3. Purchase product (MTN, GLO, Airtel, 9mobile)

Buy Products with Variations:
1. Get service categories
2. Get Service ID
3. Get variation codes
4. Purchase product


------------------------------------------------
### Get VTpass Wallet Balance
Retrieve your wallet balance.

- Authentication: see [API Key Authentication](#api-key-authentication)
- Endpoint:
  - Live: `https://vtpass.com/api/balance`
  - Sandbox: `https://sandbox.vtpass.com/api/balance`

Expected response:

```json
{
  "code": 1,
  "contents": { "balance": 1081.8199999998 }
}
```




------------------------------------------------
### Transaction Status Requery
This endpoint allows you to retrieve data such as status of transaction using the request_id you supplied.

Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is the unique reference provided when carrying out the transaction.
 

EXPECTED RESPONSE

{
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "MTN Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": 20,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 1,
            "total_amount": 19.3,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 20,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17415980564672211596777904",
            "product_id": 2,
            "commission_details": {
                "amount": 1,
                "rate": "3.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031010146932932",
    "amount": 20,
    "transaction_date": "2025-03-10T09:14:16.000000Z",
    "purchased_code": ""
}
Note: See the complete list of response codes in VTpass documentation.


------------------------------------------------
### Understanding How VTpass Commission Works
VTPass offers commissions to API users in the form of discounts on transactions. These commissions allow API agents to earn a portion (percentage or flat amount) of each transaction while providing seamless bill payment services to their customers.

If you’re looking to track your earnings, it’s essential to know where to find your VTPass commissions. In this guide, we’ll walk you through the steps to locate commission details, understand your earnings, and ensure you’re maximizing your profits on the platform. Below, you’ll find a step-by-step guide on how to retrieve and review your commission, helping you maximize your profits.

How API Commissions Work
Commissions are applied as discounts on transactions, reducing the final amount API customers pay instead of charging them the full transaction price.. The commission structure is categorized into three types:

1. Percentage-Based Discount
The commission is applied as a percentage of the transaction amount.

This means that the discount is dynamically calculated based on the total value of the transaction.

Example: If a 2% commission is applied to a ₦1,000 transaction, the discount will be ₦20, making the effective charge ₦980.

2. Flat Rate-Based Discount
The commission is applied as a fixed amount per transaction, regardless of the transaction value.

The discount is predetermined for each product.

Example: If a flat discount of ₦50 is set for a service, every transaction will receive a ₦50 reduction, irrespective of the transaction amount.

Where to Find VTPass Commissions
There are two ways to view commissions: those you are eligible to earn on products, and those you’ve already earned from completed transactions.

1. General Commission Information
You can view the general commission for each product directly on the website HERE

2. API-Based Commission Retrieval
You can access product-specific commission details through the verification, purchase, or requery endpoints in the API. These endpoints return a response that includes the commission_details field. Additionally, if a product has a special commission, you can also retrieve its details in the commission_details field.

Special commissions are predefined rules based on the product category or variation. For example, a product with a computation_type of “nmd” may have a unique discount calculation method compared to standard flat-rate or percentage-based discounts.

Example:

```json
"commission_details": {
  "amount": 50,
  "rate": "50",
  "rate_type": "flat",
  "computation_type": "nmd",
  "capped_at": "20"
}
```

Explanation of Commission Fields

| Field | Description |
|-------|-------------|
| commission_details | Contains commission details for the product |
| amount | Actual discount applied. For verification, may be null until amount is known |
| rate | Commission rate used with `rate_type` |
| rate_type | `percentage` or `flat` |
| computation_type | Special rule if any; default is `default` (e.g., `nmd`) |
| capped_at | Maximum discount; null means no cap |
------------------------------------------------




------------------------------------------------
------------------------------------------------