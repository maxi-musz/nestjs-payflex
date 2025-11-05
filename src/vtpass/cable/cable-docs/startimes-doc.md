The Startimes Subscription Payment API
This section contains the recommended flow for integrating Startimes Subscription Payment services on the VTpass RESTful API.

The VTpass Startimes subscription payment API allows you to renew/recharge the subscription on a Startimes decoder using the Smartcard number.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass Startimes Subscription Payment RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various Startimes bouquets (subscription plans)
Verify Smartcard Number
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for Startimes bouquets can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=startimes

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=startimes

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "Startimes Subscription",
        "serviceID": "startimes",
        "convinience_fee": "N0",
        "variations": [
            {
                "variation_code": "nova",
                "name": "Nova - 900 Naira - 1 Month",
                "variation_amount": "900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic",
                "name": "Basic - 1,700 Naira - 1 Month",
                "variation_amount": "1700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart",
                "name": "Smart - 2,200 Naira - 1 Month",
                "variation_amount": "2200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic",
                "name": "Classic - 2,500 Naira - 1 Month",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super",
                "name": "Super - 4,200 Naira - 1 Month",
                "variation_amount": "4200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-weekly",
                "name": "Nova - 300 Naira - 1 Week",
                "variation_amount": "300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic-weekly",
                "name": "Basic - 600 Naira - 1 Week",
                "variation_amount": "600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart-weekly",
                "name": "Smart - 700 Naira - 1 Week",
                "variation_amount": "700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic-weekly",
                "name": "Classic - 1200 Naira - 1 Week ",
                "variation_amount": "1200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-weekly",
                "name": "Super - 1,500 Naira - 1 Week",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-daily",
                "name": "Nova - 90 Naira - 1 Day",
                "variation_amount": "90.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic-daily",
                "name": "Basic - 160 Naira - 1 Day",
                "variation_amount": "160.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart-daily",
                "name": "Smart - 200 Naira - 1 Day",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic-daily",
                "name": "Classic - 320 Naira - 1 Day ",
                "variation_amount": "320.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-daily",
                "name": "Super - 400 Naira - 1 Day",
                "variation_amount": "400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "ewallet",
                "name": "ewallet Amount",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "uni-1",
                "name": "Chinese (Dish) - 19,000 Naira - 1 month",
                "variation_amount": "19000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "uni-2",
                "name": "Nova (Antenna) - 1,900 Naira - 1 Month",
                "variation_amount": "1900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "special-weekly",
                "name": "Classic (Dish) - 2300 Naira - 1 Week",
                "variation_amount": "2300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "special-monthly",
                "name": "Classic (Dish) - 6800 Naira - 1 Month",
                "variation_amount": "6800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-dish-weekly",
                "name": "Nova (Dish) - 650 Naira - 1 Week",
                "variation_amount": "650.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-antenna-weekly",
                "name": "Super (Antenna) - 3,000 Naira - 1 Week",
                "variation_amount": "3000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-antenna-monthly",
                "name": "Super (Antenna) - 8,800 Naira - 1 Month",
                "variation_amount": "8800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "global-monthly-dish",
                "name": "Global (Dish) - 19000 Naira - 1 Month",
                "variation_amount": "19000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "global-weekly-dish",
                "name": "Global (Dish) - 6500 Naira - 1Week",
                "variation_amount": "6500.00",
                "fixedPrice": "Yes"
            }
        ],
        "varations": [
            {
                "variation_code": "nova",
                "name": "Nova - 900 Naira - 1 Month",
                "variation_amount": "900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic",
                "name": "Basic - 1,700 Naira - 1 Month",
                "variation_amount": "1700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart",
                "name": "Smart - 2,200 Naira - 1 Month",
                "variation_amount": "2200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic",
                "name": "Classic - 2,500 Naira - 1 Month",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super",
                "name": "Super - 4,200 Naira - 1 Month",
                "variation_amount": "4200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-weekly",
                "name": "Nova - 300 Naira - 1 Week",
                "variation_amount": "300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic-weekly",
                "name": "Basic - 600 Naira - 1 Week",
                "variation_amount": "600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart-weekly",
                "name": "Smart - 700 Naira - 1 Week",
                "variation_amount": "700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic-weekly",
                "name": "Classic - 1200 Naira - 1 Week ",
                "variation_amount": "1200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-weekly",
                "name": "Super - 1,500 Naira - 1 Week",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-daily",
                "name": "Nova - 90 Naira - 1 Day",
                "variation_amount": "90.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "basic-daily",
                "name": "Basic - 160 Naira - 1 Day",
                "variation_amount": "160.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "smart-daily",
                "name": "Smart - 200 Naira - 1 Day",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "classic-daily",
                "name": "Classic - 320 Naira - 1 Day ",
                "variation_amount": "320.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-daily",
                "name": "Super - 400 Naira - 1 Day",
                "variation_amount": "400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "ewallet",
                "name": "ewallet Amount",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "uni-1",
                "name": "Chinese (Dish) - 19,000 Naira - 1 month",
                "variation_amount": "19000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "uni-2",
                "name": "Nova (Antenna) - 1,900 Naira - 1 Month",
                "variation_amount": "1900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "special-weekly",
                "name": "Classic (Dish) - 2300 Naira - 1 Week",
                "variation_amount": "2300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "special-monthly",
                "name": "Classic (Dish) - 6800 Naira - 1 Month",
                "variation_amount": "6800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "nova-dish-weekly",
                "name": "Nova (Dish) - 650 Naira - 1 Week",
                "variation_amount": "650.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-antenna-weekly",
                "name": "Super (Antenna) - 3,000 Naira - 1 Week",
                "variation_amount": "3000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "super-antenna-monthly",
                "name": "Super (Antenna) - 8,800 Naira - 1 Month",
                "variation_amount": "8800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "global-monthly-dish",
                "name": "Global (Dish) - 19000 Naira - 1 Month",
                "variation_amount": "19000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "global-weekly-dish",
                "name": "Global (Dish) - 6500 Naira - 1Week",
                "variation_amount": "6500.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}
VERIFY SMARTCARD NUMBER

This endpoint allows you to verify the Smartcard number before attempting to make payment.

Using a POST method, you can verify a smartcard numbers with the endpoint below:

Live: https://vtpass.com/api/merchant-verify

Sandbox: https://sandbox.vtpass.com/api/merchant-verify

Smartcard number (billerscode) on sandbox: 1212121212

 

To simulate a failed smart card number validation on sandbox, please use any number apart from the one provided above as the smart card number.

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
billersCode	M	Number	The smart card number you wish to make the Subscription payment on.
On Sandbox
Use: 1212121212

serviceID	M	String	Service ID as specified by VTpass. In this case, it is startimes
 

 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "Customer_Name": "TestMan Decoder",
        "Balance": 54.82,
        "Smartcard_Number": "1212121212",
        "WrongBillersCode": false,
        "commission_details": {
            "amount": null,
            "rate": "2.50",
            "rate_type": "percent",
            "computation_type": "default"
        }
    }
}
PURCHASE PRODUCT
This endpoint allows you to recharge a Startimes decoder using it’s smartcard number.

YouCan also use this method to topup a Startimes ewallet.

Using a POST method, Startimes Subscription Payment services can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: startimes

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for startimes purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct smartcard number/billersCode for simulating various API responses:

BillersCode Number	 Event	Description
1212121212	Successful 	Returns a successful response for testing startimes purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random billers code other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is startimes
billersCode	M	String	The smart card number or ewallet number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation of the bouquet (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
NOTE: This is optional.

If you specify amount, we will topup decoder with the amount. If you do not specify amount, then we will use the price set for the bouquet (as returned in GET VARIATION CODES endpoint)

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "Startimes Subscription",
            "unique_element": "1212121212",
            "unit_price": "900.00",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 22.5,
            "total_amount": 877.5,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "900.00",
            "platform": "api",
            "method": "api",
            "transactionId": "17416109662586688933191823",
            "commission_details": {
                "amount": 22.5,
                "rate": "2.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031013495446866",
    "amount": 900,
    "transaction_date": "2025-03-10T12:49:26.000000Z",
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
            "product_name": "Startimes Subscription",
            "unique_element": "1212121212",
            "unit_price": 900,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 23,
            "total_amount": 877.5,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 900,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416109662586688933191823",
            "product_id": 13,
            "commission_details": {
                "amount": 23,
                "rate": "2.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031013495446866",
    "amount": 900,
    "transaction_date": "2025-03-10T12:49:26.000000Z",
    "purchased_code": ""
}