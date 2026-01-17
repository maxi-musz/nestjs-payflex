[UPDATED] GOTV Subscription Payment API
This documentation contains the recommended flow for integrating GOTV Subscription Payment services on the VTpass RESTful API.

The VTpass GOTV subscription payment API allows you to renew/recharge the subscription on a GOTV decoder using the Smartcard number.

 

Authentication
Learn about authentication from here.

 

 

Updated Endpoints
To integrate the VTpass GOTV Subscription Payment RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various GOTV bouquets (subscription plans)
Verify Smartcard Number
New Product Purchase (Using the variation code gotten in the first step)
Renew Product (Using the amount gotten from the verify smartcard number endpoint)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for GOTV bouquets can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=gotv

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=gotv

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "Gotv Payment",
        "serviceID": "gotv",
        "convinience_fee": "N0",
        "variations": [
            {
                "variation_code": "gotv-lite",
                "name": "GOtv Lite N410",
                "variation_amount": "410.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-max",
                "name": "GOtv Max N3,600",
                "variation_amount": "3600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-jolli",
                "name": "GOtv Jolli N2,460",
                "variation_amount": "2460.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-jinja",
                "name": "GOtv Jinja N1,640",
                "variation_amount": "1640.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-lite-3months",
                "name": "GOtv Lite (3 Months) N1,080",
                "variation_amount": "1080.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-lite-1year",
                "name": "GOtv Lite (1 Year) N3,180",
                "variation_amount": "3180.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-supa-plus",
                "name": "GOtv Supa Plus - monthly N15,700",
                "variation_amount": "15700.00",
                "fixedPrice": "Yes"
            }
        ],
        "varations": [
            {
                "variation_code": "gotv-lite",
                "name": "GOtv Lite N410",
                "variation_amount": "410.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-max",
                "name": "GOtv Max N3,600",
                "variation_amount": "3600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-jolli",
                "name": "GOtv Jolli N2,460",
                "variation_amount": "2460.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-jinja",
                "name": "GOtv Jinja N1,640",
                "variation_amount": "1640.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-lite-3months",
                "name": "GOtv Lite (3 Months) N1,080",
                "variation_amount": "1080.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-lite-1year",
                "name": "GOtv Lite (1 Year) N3,180",
                "variation_amount": "3180.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "gotv-supa-plus",
                "name": "GOtv Supa Plus - monthly N15,700",
                "variation_amount": "15700.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}
 

VERIFY SMARTCARD NUMBER

This endpoint allows you to verify the Smartcard number before attempting to make payment.

This endpoint returns the customer name, current bouquet, subscription due date and the renewal amount (which will be used for BOUQUET RENEWAL).

Using a POST method, you can verify a smartcard numbers with the endpoint below:

Live: https://vtpass.com/api/merchant-verify

Sandbox: https://sandbox.vtpass.com/api/merchant-verify

Smartcard number (billerscode) on sandbox: 1212121212
 

To simulate a failed smart card number validation on sandbox, please use any number apart from the one provided above as the smart card number.

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
billersCode	M	Number	The smart card number you wish to make the Subscription payment on.
On Sandbox
Use: 1212121212

serviceID	M	String	Service ID as specified by VTpass. In this case, it is gotv
 

 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "Customer_Name": "TEST METER",
        "Status": "ACTIVE",
        "Due_Date": "02-FEB-25",
        "Customer_Number": "81111111111",
        "Customer_Type": "GOTV",
        "commission_details": {
            "amount": null,
            "rate": "1.50",
            "rate_type": "percent",
            "computation_type": "default"
        }
    }
}
PURCHASE PRODUCT

This endpoint allows you to change or renew a GOTV decoder using its smartcard number.

For product purchase one can totally change the current bouquet of the GOTV decoder or subscribe a fresh bouquet on a GOTV decoder using the NEW PURCHASE/BOUQUET CHANGE endpoint or one can renew the current bouquet using the BOUQUET RENEWAL endpoint.

After carrying out verification, you need to display the following:

Customer Name
Customer’s current bouquet Current_Bouquet
The amount due for renewing the current bouquet. This is in the field Renewal_Amount . Please note that this amount might be different from the real price for renewing the current bouquet due to “promos” or “special offers”
Then you ask the customer if they want to renew the current bouquet at that price OR change their bouquet.
The option selected will determine if you will use the A (Change Bouquet) or B (Bouquet Renewal) option.

Product purchase endpoints are as follows:

 

A. BOUQUET CHANGE
This endpoint allows you to recharge a GOTV decoder afresh / change the existing bouquet of a GOTV decoder using its smartcard number. This option is for a new subscriber to GOTV or a returning subscriber who would like to change his/her bouquet.

Using a POST method, GOTV Subscription Payment services can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: gotv

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for GOTV purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct smartcard number/billersCode for simulating various API responses:

BillersCode Number	 Event	Description
1212121212	Successful 	Returns a successful response for testing gotv purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is gotv
billersCode	M	String	The smart card number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation of the bouquet (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
NOTE: This is optional.

If you specify amount, we will topup decoder with the amount. If you do not specify amount, then we will use the price set for the bouquet (as returned in GET VARIATION CODES endpoint)

phone	M	Number	The phone number of the customer or recipient of this service
subscription_type	M	String	The type of subscription in this case change.
quantity	O	Number	The number of months viewing month e.g 1
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "Gotv Payment",
            "unique_element": "1212121212",
            "unit_price": "410.00",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 6.1499999999999995,
            "total_amount": 403.85,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "410.00",
            "platform": "api",
            "method": "api",
            "transactionId": "17416015823378368730641207",
            "commission_details": {
                "amount": 6.1499999999999995,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031011134065522",
    "amount": 410,
    "transaction_date": "2025-03-10T10:13:02.000000Z",
    "purchased_code": ""
}
A. BOUQUET RENEWAL

This endpoint allows you to renew a GOTV decoder subscription using its smartcard number. This option is strictly for a returning customer who desires to renew his/her current GOTV bouquet. Using this option, there may be a discount on the renewal price [according to the discretion of GOTV] as opposed to the actual cost of the customer’s GOTV bouquet.

NOTE: You are to first verify the GOTV smartcard number using the MERCHANT VERIFY endpoint and use the Renewal_Amount obtained from the MERCHANT VERIFY endpoint as the amount in your request payload.
Using a POST method, GOTV Subscription Payment services can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: gotv

 

Smartcard number (billerscode) on sandbox: 1212121212

To simulate a failed transaction on sandbox, please use any number apart from the one provided above as the smart card number.

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is gotv
billersCode	M	String	The smart card number you wish to make the Subscription payment on
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
NOTE: This is optional.

If you specify amount, we will topup decoder with the amount. If you do not specify amount, then we will use the price set for the bouquet (as returned in GET VARIATION CODES endpoint)

phone	M	Number	The phone number of the customer or recipient of this service
subscription_type	M	String	The type of subscription in this case change.
subscription_type	M	String	The type of subscription in this case renew.
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "Gotv Payment",
            "unique_element": "1212121212",
            "unit_price": "410.00",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 6.1499999999999995,
            "total_amount": 403.85,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "410.00",
            "platform": "api",
            "method": "api",
            "transactionId": "17416015823378368730641207",
            "commission_details": {
                "amount": 6.1499999999999995,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031011134065522",
    "amount": 410,
    "transaction_date": "2025-03-10T10:13:02.000000Z",
    "purchased_code": ""
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
            "product_name": "Gotv Payment",
            "unique_element": "1212121212",
            "unit_price": 410,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 6,
            "total_amount": 403.85,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 410,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416015823378368730641207",
            "product_id": 11,
            "commission_details": {
                "amount": 6,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031011134065522",
    "amount": 410,
    "transaction_date": "2025-03-10T10:13:02.000000Z",
    "purchased_code": ""
}