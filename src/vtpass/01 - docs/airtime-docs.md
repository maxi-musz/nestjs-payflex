MTN VTU API Integration
This section contains the recommended flow for integrating MTN VTU services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

Available Endpoints
To integrate the VTpass MTN VTU RESTful API, the endpoints below applies:

Purchase Product
Query transaction status
 

Purchase products
Using a POST method, MTN VTU services can be purchased with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: mtn

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for airtime purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing airtime purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is mtn
amount	M	Number	The amount you wish to topup
phone	M	Number	The phone number of the recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "MTN Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": "20",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 0.7000000000000001,
            "total_amount": 19.3,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "20",
            "platform": "api",
            "method": "api",
            "transactionId": "17415980564672211596777904",
            "commission_details": {
                "amount": 0.7000000000000001,
                "rate": "3.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031010146932932",
    "amount": 20,
    "transaction_date": "2025-03-10T09:14:16.000000Z",
    "purchased_code": ""
}
QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is the reference with which you sent when purchasing a transaction after the transaction has been executed.
 

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
You can check out the complete list of RESPONSE CODES HERE https://www.vtpass.com/documentation/mtn-airtime-vtu-api/#:~:text=RESPONSE%20CODES%20HERE.

GLO VTU API Integration
This section contains the recommended flow for integrating GLO VTU services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

Available Endpoints
To integrate the VTpass Glo VTU RESTful API, the endpoints below applies:

Purchase Product
Query transaction status
 

Purchase products
Using a POST method, Glo VTU services can be purchased with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: glo

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for airtime purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing airtime purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is glo
amount	M	Number	The amount you wish to topup
phone	M	Number	The phone number of the recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "GLO Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": "150",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4.5,
            "total_amount": 145.5,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "150",
            "platform": "api",
            "method": "api",
            "transactionId": "17415983929554658494269073",
            "commission_details": {
                "amount": 4.5,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031010195169937",
    "amount": 150,
    "transaction_date": "2025-03-10T09:19:52.000000Z",
    "purchased_code": ""
}
QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is the reference with which you sent when purchasing a transaction after the transaction has been executed.
 

EXPECTED RESPONSE

{
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "GLO Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": 150,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 5,
            "total_amount": 145.5,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 150,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17415983929554658494269073",
            "product_id": 3,
            "commission_details": {
                "amount": 5,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031010195169937",
    "amount": 150,
    "transaction_date": "2025-03-10T09:19:52.000000Z",
    "purchased_code": ""
}


Airtel VTU API Integration
This section contains the recommended flow for integrating Airtel VTU services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

Available Endpoints
To integrate the VTpass Airtel VTU RESTful API, the endpoints below applies:

Purchase Product
Query transaction status
 

Purchase products
Using a POST method, Airtel VTU services can be purchased with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: airtel

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for airtime purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing airtime purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is airtel
amount	M	Number	The amount you wish to topup
phone	M	Number	The phone number of the recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "Airtel Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": "100",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 3,
            "total_amount": 97,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "100",
            "platform": "api",
            "method": "api",
            "transactionId": "17416102627511572939185169",
            "commission_details": {
                "amount": 3,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031013373710241",
    "amount": 100,
    "transaction_date": "2025-03-10T12:37:42.000000Z",
    "purchased_code": ""
}
QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is the reference with which you sent when purchasing a transaction after the transaction has been executed.
 

EXPECTED RESPONSE

{
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "Airtel Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": 100,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 3,
            "total_amount": 97,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 100,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416102627511572939185169",
            "product_id": 1,
            "commission_details": {
                "amount": 3,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031013373710241",
    "amount": 100,
    "transaction_date": "2025-03-10T12:37:42.000000Z",
    "purchased_code": ""
}

9mobile VTU API Integration
This section contains the recommended flow for integrating 9mobile VTU (formally Etisalat) services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

Available Endpoints
To integrate the VTpass 9mobile VTU RESTful API, the endpoints below applies:

Purchase Product
Query transaction status
 

Purchase products
Using a POST method, 9mobile VTU services can be purchased with the endpoint below:

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: etisalat

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for airtime purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing airtime purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is etisalat
amount	M	Number	The amount you wish to topup
phone	M	Number	The phone number of the recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "9mobile Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": "150",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4.5,
            "total_amount": 145.5,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "150",
            "platform": "api",
            "method": "api",
            "transactionId": "17415991838224542218600989",
            "commission_details": {
                "amount": 4.5,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031010335779345",
    "amount": 150,
    "transaction_date": "2025-03-10T09:33:03.000000Z",
    "purchased_code": ""
}
QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is the reference with which you sent when purchasing a transaction after the transaction has been executed.
 

EXPECTED RESPONSE

{
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "9mobile Airtime VTU",
            "unique_element": "08011111111",
            "unit_price": 150,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 5,
            "total_amount": 145.5,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 150,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17415991838224542218600989",
            "product_id": 4,
            "commission_details": {
                "amount": 5,
                "rate": "3.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031010335779345",
    "amount": 150,
    "transaction_date": "2025-03-10T09:33:03.000000Z",
    "purchased_code": ""
}


International Airtime/Data/Pin API
This section contains the recommended flow for integrating International Airtime/Data/Pin services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass International Airtime/Data/Pin Payment RESTful API, the endpoints below applies:

Get International Airtime Countries: this returns the various countries you can purchase for.
Get International Airtime Product Types: this returns the various types of product that can be purchased
Get International Airtime Operators: this returns the various service providers/operators you can purchase for.
Get Variation Codes: this returns variation codes for various International Airtime Operators
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET International Airtime Countries
Using a GET method, the VTpass countries for International Airtime/Data/Pin can be accessed with the endpoint below:

Live:   https://vtpass.com/api/get-international-airtime-countries

Sandbox: https://sandbox.vtpass.com/api/get-international-airtime-countries

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "countries": [
            {
                "code": "CM",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/CM.png",
                "name": "Cameroon",
                "currency": "XAF",
                "prefix": "237"
            },
            {
                "code": "GH",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/GH.png",
                "name": "Ghana",
                "currency": "GHS",
                "prefix": "233"
            },
            {
                "code": "NG",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/NG.png",
                "name": "Nigeria",
                "currency": "NGN",
                "prefix": "234"
            },
            {
                "code": "RW",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/RW.png",
                "name": "Rwanda",
                "currency": "RWF",
                "prefix": "250"
            },
            {
                "code": "SZ",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/SZ.png",
                "name": "Swaziland",
                "currency": "SZL",
                "prefix": "268"
            },
            {
                "code": "YE",
                "flag": "https://sandbox.vtpass.com/resources/images/flags/YE.png",
                "name": "Yemen",
                "currency": "YER",
                "prefix": "967"
            }
        ]
    }
}
GET International Airtime Product Types
Using a GET method, the VTpass countries for International Airtime/Data/Pin Product Types can be accessed with the endpoint below; The code is the Country code (as specified in the GET International Airtime Countries method as code).

Live:   https://vtpass.com/api/get-international-airtime-product-types?code=GH

Sandbox: https://sandbox.vtpass.com/api/get-international-airtime-product-types?code=GH

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": [
        {
            "product_type_id": 4,
            "name": "Mobile Data"
        },
        {
            "product_type_id": 1,
            "name": "Mobile Top Up"
        }
    ]
}
GET International Airtime Operators
Using a GET method, the VTpass countries for International Airtime/Data/Pin Operators can be accessed with the endpoint below; The code is the Country code (as specified in the GET International Airtime Countries method as code). The product_type_id is the Product Type ID (as specified in the Get International Airtime Product Types method as product_type_id)

Live:   https://vtpass.com/api/get-international-airtime-operators?code=GH&product_type_id=4

Sandbox: https://sandbox.vtpass.com/api/get-international-airtime-operators?code=GH&product_type_id=4

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": [
        {
            "operator_id": "5",
            "name": "Ghana MTN",
            "operator_image": "https://sandbox.vtpass.com/resources/images/operators/80.png"
        }
    ]
}
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for International Airtime/Data/Pin can be accessed with the endpoint below; operator_id is the OPERATOR ID (as specified in the GET International Airtime Operators method as operator_id). The product_type_id is the Product Type ID (as specified in the Get International Airtime Product Types method as product_type_id).

Live:   https://vtpass.com/api/service-variations?serviceID=foreign-airtime&operator_id=1&product_type_id=1

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=foreign-airtime&operator_id=1&product_type_id=1

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

Note: The charged amount is the amount VTpass charges your wallet. For variations with the fixed price is the charged_amount (naira equivalent). For variations with the flexible price the charged amount (naira equivalent) can be calculated using variation_rate * amount in GHS.

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "International Airtime",
        "serviceID": "foreign-airtime",
        "convinience_fee": "0 %",
        "variations": [
            {
                "variation_code": "4987",
                "name": "160 -2000 GMD Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "2470",
                "name": "15EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "2471",
                "name": "20EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "2472",
                "name": "30EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5345",
                "name": "50EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5539",
                "name": "C&A 10EUR Gift Card",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5540",
                "name": "C&A 50EUR Gift Card",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5347",
                "name": "25EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5350",
                "name": "35EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5348",
                "name": "40EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5349",
                "name": "45EUR Top Up",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13056",
                "name": "Gaga Time - 5GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13062",
                "name": "Freedom Bundle - 1.5GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13100",
                "name": "Monthly - 125 Mins Voice Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13092",
                "name": "Monthly - 300 Mins Voice Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "5186",
                "name": "Weekly 1.5GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13064",
                "name": "Freedom Bundle - 5GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13074",
                "name": "200 MTN & 50 Local Mins, 250 SMS, 250MB, & 500MB Mobile Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13094",
                "name": "Monthly - 1000 Mins Voice Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13066",
                "name": "Freedom Bundle - 9GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13096",
                "name": "Monthly - 2400 Mins Voice Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13098",
                "name": "Monthly - 4500 Mins Voice Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13068",
                "name": "Freedom Bundle - 20GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13076",
                "name": "900 MTN & 100 Local Mins, 1000 SMS, 1GB, & 1GB WTF Mobile Bundle",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "13070",
                "name": "Freedom Bundle - 45GB Mobile Data",
                "variation_amount": "0.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}
PURCHASE PRODUCT

Using a POST method, International Airtime/Data/Pin can with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: foreign-airtime

Note: For VTU pins instructions on how to recharge will be in the response object

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for airtime purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing airtime purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is foreign-airtime
billersCode	M	String	The phone number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

phone	M	Number	The phone number of the customer or recipient of this service
operator_id	M	String	The ID of the operator (as specified in the GET International Airtime Operators method as operator_id).
country_code	M	String	The code of the country (as specified in the GET International Airtime Countries method as code).
product_type_id	M	String	The Id of the Product Type of International Aitime/Data/Pin (as specified in the Get International Airtime Product Types method as product_type_id).
email	M	String	The email address of the customer.
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "International Airtime",
            "unique_element": "2345638473434",
            "unit_price": "2",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 0.08,
            "total_amount": 1.92,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "2",
            "platform": "api",
            "method": "api",
            "transactionId": "17416193926764171056841998",
            "commission_details": {
                "amount": 0.08,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031016099807136",
    "amount": 2,
    "transaction_date": "2025-03-10T15:09:52.000000Z",
    "purchased_code": "",
    "cards": null,
    "CountryName": "UNKNOWN",
    "CountryCode": "GH",
    "OperatorAmount": "UNKNOWNUNKNOWN",
    "Amount": "NGN2"
}
 

QUERY TRANSACTION STATUS
Using a POST method, transaction status can be queried with the endpoint below:

Live: https://vtpass.com/api/requery

Sandbox: https://sandbox.vtpass.com/api/requery

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	
This is the reference with which you sent when purchasing a transaction after the transaction has been executed.

 

EXPECTED RESPONSE

{
    "response_description": "TRANSACTION SUCCESSFUL",
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "International Airtime",
            "unique_element": "2345638473434",
            "unit_price": 2,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 0,
            "total_amount": 1.92,
            "discount": null,
            "type": "Airtime Recharge",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 2,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416193926764171056841998",
            "product_id": 660,
            "commission_details": {
                "amount": 0,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031016099807136",
    "amount": 2,
    "transaction_date": "2025-03-10T15:09:52.000000Z",
    "purchased_code": "",
    "cards": null,
    "CountryName": "UNKNOWN",
    "CountryCode": "GH",
    "OperatorAmount": "UNKNOWNUNKNOWN",
    "Amount": "NGN2"
}