Showmax Subscription Payment API
This documentation contains the updated flow for integrating Showmax Subscription Payment services on the VTpass RESTful API.

The VTpass Showmax subscription payment API allows you to recharge the subscription on your Showmax account using Phone number.

 

Authentication
Learn about authentication from here.

 

 

Updated Endpoints
To integrate the VTpass Showmax Subscription Payment RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for Showmax (subscription plans)
New Product Purchase (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for Showmax can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=showmax

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=showmax

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE:

{
    "response_description": "000",
    "content": {
        "ServiceName": "ShowMax",
        "serviceID": "showmax",
        "convinience_fee": "0 %",
        "variations": [
            {
                "variation_code": "full_3",
                "name": "Full - N8,400 - 3 Months",
                "variation_amount": "8400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mobile_only_3",
                "name": "Mobile Only - N3,800 - 3 Months",
                "variation_amount": "3800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports_mobile_only_3",
                "name": "Sports Mobile Only - N12,000 - 3 Months",
                "variation_amount": "12000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-1",
                "name": "Sports Only - N3,200",
                "variation_amount": "3200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-3",
                "name": "Sports Only 3 months - N9,600",
                "variation_amount": "9600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-sports-mobile-only-3",
                "name": "Full Sports Mobile Only - 3 months - N16,200",
                "variation_amount": "16200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mobile-only-6",
                "name": "Mobile Only - N6,700 - 6 Months",
                "variation_amount": "6700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-only-6",
                "name": "Full - 6 months - 14,700",
                "variation_amount": "14700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-sports-mobile-only-6",
                "name": "Full Sports Mobile Only - 6 months - N32,400",
                "variation_amount": "32400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-mobile-only-6",
                "name": "Sports Mobile Only - 6 months - N24,000",
                "variation_amount": "24000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-6",
                "name": "Sports Only - 6 months - N18,200",
                "variation_amount": "18200.00",
                "fixedPrice": "Yes"
            }
        ],
        "varations": [
            {
                "variation_code": "full_3",
                "name": "Full - N8,400 - 3 Months",
                "variation_amount": "8400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mobile_only_3",
                "name": "Mobile Only - N3,800 - 3 Months",
                "variation_amount": "3800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports_mobile_only_3",
                "name": "Sports Mobile Only - N12,000 - 3 Months",
                "variation_amount": "12000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-1",
                "name": "Sports Only - N3,200",
                "variation_amount": "3200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-3",
                "name": "Sports Only 3 months - N9,600",
                "variation_amount": "9600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-sports-mobile-only-3",
                "name": "Full Sports Mobile Only - 3 months - N16,200",
                "variation_amount": "16200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mobile-only-6",
                "name": "Mobile Only - N6,700 - 6 Months",
                "variation_amount": "6700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-only-6",
                "name": "Full - 6 months - 14,700",
                "variation_amount": "14700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "full-sports-mobile-only-6",
                "name": "Full Sports Mobile Only - 6 months - N32,400",
                "variation_amount": "32400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-mobile-only-6",
                "name": "Sports Mobile Only - 6 months - N24,000",
                "variation_amount": "24000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "sports-only-6",
                "name": "Sports Only - 6 months - N18,200",
                "variation_amount": "18200.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}
PURCHASE PRODUCT
This endpoint allows you to subscribe to your Showmax account using the customer’s phone number.

Using a POST method, Showmax Subscription Payment services can be purchased with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: showmax

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for showmax subscriptions. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number/billers code for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing showmax subscriptions.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is showmax
billersCode	M	String	The phone number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "ShowMax",
            "unique_element": "08011111111",
            "unit_price": "8400",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 84,
            "total_amount": 8416,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 100,
            "amount": "8400",
            "platform": "api",
            "method": "api",
            "transactionId": "17416109379361776858305486",
            "commission_details": {
                "amount": 84,
                "rate": "1.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031013486732084",
    "amount": 8400,
    "transaction_date": "2025-03-10T12:48:57.000000Z",
    "purchased_code": "SHMVHXQ9L3RXGPU",
    "Voucher": [
        "SHMVHXQ9L3RXGPU"
    ]
}
QUERY TRANSACTION STATUS

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
            "product_name": "ShowMax",
            "unique_element": "08011111111",
            "unit_price": 8400,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 84,
            "total_amount": 8416,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": "SHMVHXQ9L3RXGPU",
            "convinience_fee": 100,
            "amount": 8400,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416109379361776858305486",
            "product_id": 616,
            "commission_details": {
                "amount": 84,
                "rate": "1.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031013486732084",
    "amount": 8400,
    "transaction_date": "2025-03-10T12:48:57.000000Z",
    "purchased_code": "SHMVHXQ9L3RXGPU",
    "Voucher": [
        "SHMVHXQ9L3RXGPU"
    ]
}