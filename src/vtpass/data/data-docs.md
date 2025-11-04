Service ID API
This section contains the recommended flow for getting the available service IDs on VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

 

GET SERVICE ID
Using a GET method, the VTpass service IDs for Data [for instance] can be accessed with the endpoint below:

Live:   https://vtpass.com/api/services?identifier=data

Sandbox: https://sandbox.vtpass.com/api/services?identifier=data

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": [
        {
            "serviceID": "airtel-data",
            "name": "Airtel Data",
            "minimium_amount": "1",
            "maximum_amount": "1000000",
            "convinience_fee": "0 %",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/Airtel-Data.jpg"
        },
        {
            "serviceID": "mtn-data",
            "name": "MTN Data",
            "minimium_amount": "1",
            "maximum_amount": "1000000",
            "convinience_fee": "0 %",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/MTN-Data.jpg"
        },
        {
            "serviceID": "glo-data",
            "name": "GLO Data",
            "minimium_amount": "1",
            "maximum_amount": "200000",
            "convinience_fee": "0 %",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data.jpg"
        },
        {
            "serviceID": "etisalat-data",
            "name": "9mobile Data",
            "minimium_amount": "1",
            "maximum_amount": "1000000",
            "convinience_fee": "0 %",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/9mobile-Data.jpg"
        },
        {
            "serviceID": "smile-direct",
            "name": "Smile Payment",
            "minimium_amount": "100",
            "maximum_amount": "150000",
            "convinience_fee": "N0",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/Smile-Payment.jpg"
        },
        {
            "serviceID": "spectranet",
            "name": "Spectranet Internet Data",
            "minimium_amount": "1",
            "maximum_amount": "100000",
            "convinience_fee": "N0",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/Spectranet.jpg"
        },
        {
            "serviceID": "glo-sme-data",
            "name": "GLO Data (SME)",
            "minimium_amount": "1",
            "maximum_amount": "1000000",
            "convinience_fee": "0 %",
            "product_type": "fix",
            "image": "https://sandbox.vtpass.com/resources/products/200X200/GLO-Data-(SME).jpg"
        }
    ]
}
NOTE: Identifiers are gotten from this endpoint

{
    "response_description": "000",
    "content": [
        {
            "identifier": "airtime",
            "name": "Airtime Recharge"
        },
        {
            "identifier": "data",
            "name": "Data Services"
        },
        {
            "identifier": "tv-subscription",
            "name": "TV Subscription"
        },
        {
            "identifier": "electricity-bill",
            "name": "Electricity Bill"
        },
        {
            "identifier": "education",
            "name": "Education"
        },
        {
            "identifier": "other-services",
            "name": "Other Merchants/Services"
        },
        {
            "identifier": "insurance",
            "name": "Insurance"
        }
    ]
}












MTN Data Subscription API
This section contains the recommended flow for integrating MTN Data Subscription services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass MTN Data Subscription Payment RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various MTN Data (subscription plans)
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for MTN Data subscription plans can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=mtn-data

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=mtn-data


FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "MTN Data",
        "serviceID": "mtn-data",
        "convinience_fee": "0 %",
        "variations": [
            {
                "variation_code": "mtn-10mb-100",
                "name": "N100 100MB - 24 hrs",
                "variation_amount": "100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-50mb-200",
                "name": "N200 200MB - 2 days",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100mb-1000",
                "name": "N1000 1.5GB - 30 days",
                "variation_amount": "1000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-500mb-2000",
                "name": "N2000 4.5GB - 30 days",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-20hrs-1500",
                "name": "N1500 6GB - 7 days",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-2500",
                "name": "N2500 6GB - 30 days",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-data-3000",
                "name": "N3000 8GB - 30 days",
                "variation_amount": "3000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-1gb-3500",
                "name": "N3500 10GB - 30 days",
                "variation_amount": "3500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100hr-5000",
                "name": "N5000 15GB - 30 days",
                "variation_amount": "5000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-6000",
                "name": "N6000 20GB - 30 days",
                "variation_amount": "6000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-40gb-10000",
                "name": "N10000 40GB - 30 days",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-75gb-15000",
                "name": "N15000 75GB - 30 days",
                "variation_amount": "15000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-110gb-20000",
                "name": "N20000 110GB - 30 days",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-1500",
                "name": "N1500 3GB - 30 days",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-25gb-sme-10000",
                "name": "MTN N10,000 25GB SME Mobile Data ( 1 Month)",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-165gb-sme-50000",
                "name": "MTN N50,000 165GB SME Mobile Data (2-Months)",
                "variation_amount": "50000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-360gb-sme-100000",
                "name": "MTN N100,000 360GB SME Mobile Data (3 Months)",
                "variation_amount": "100000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-4-5tb-450000",
                "name": "MTN N450,000 4.5TB Mobile Data (1 Year)",
                "variation_amount": "450000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-1tb-110000",
                "name": "MTN N100,000 1TB Mobile Data (1 Year)",
                "variation_amount": "100000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-2-5gb-600",
                "name": "MTN N600 2.5GB - 2 days",
                "variation_amount": "600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-120gb-22000",
                "name": "MTN N22000 120GB Monthly Plan + 80mins",
                "variation_amount": "22000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100gb-20000",
                "name": "MTN 100GB 2-Month Plan",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-160gb-30000",
                "name": "MTN N30,000 160GB 2-Month Plan",
                "variation_amount": "30000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-400gb-50000",
                "name": "MTN N50,000 400GB 3-Month Plan",
                "variation_amount": "50000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-600gb-75000",
                "name": "MTN N75,000 600GB 3-Months Plan",
                "variation_amount": "75000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-300",
                "name": "MTN N300 Xtratalk Weekly Bundle",
                "variation_amount": "300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-500",
                "name": "MTN N500 Xtratalk Weekly Bundle",
                "variation_amount": "500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-1000",
                "name": "MTN N1000 Xtratalk Monthly Bundle",
                "variation_amount": "1000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-2000",
                "name": "MTN N2000 Xtratalk Monthly Bundle",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-5000",
                "name": "MTN N5000 Xtratalk Monthly Bundle",
                "variation_amount": "5000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-10000",
                "name": "MTN N10000 Xtratalk Monthly Bundle",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-15000",
                "name": "MTN N15000 Xtratalk Monthly Bundle",
                "variation_amount": "15000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-20000",
                "name": "MTN N20000 Xtratalk Monthly Bundle",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-800",
                "name": "MTN N800 3GB - 2 days",
                "variation_amount": "800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-7gb-2000",
                "name": "MTN N2000 7GB - 7 days",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtradata-200",
                "name": "MTN N200 Xtradata",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-300",
                "name": "MTN N200 Xtratalk - 3 days",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            }
        ],
        "varations": [
            {
                "variation_code": "mtn-10mb-100",
                "name": "N100 100MB - 24 hrs",
                "variation_amount": "100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-50mb-200",
                "name": "N200 200MB - 2 days",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100mb-1000",
                "name": "N1000 1.5GB - 30 days",
                "variation_amount": "1000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-500mb-2000",
                "name": "N2000 4.5GB - 30 days",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-20hrs-1500",
                "name": "N1500 6GB - 7 days",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-2500",
                "name": "N2500 6GB - 30 days",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-data-3000",
                "name": "N3000 8GB - 30 days",
                "variation_amount": "3000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-1gb-3500",
                "name": "N3500 10GB - 30 days",
                "variation_amount": "3500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100hr-5000",
                "name": "N5000 15GB - 30 days",
                "variation_amount": "5000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-6000",
                "name": "N6000 20GB - 30 days",
                "variation_amount": "6000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-40gb-10000",
                "name": "N10000 40GB - 30 days",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-75gb-15000",
                "name": "N15000 75GB - 30 days",
                "variation_amount": "15000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-110gb-20000",
                "name": "N20000 110GB - 30 days",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-1500",
                "name": "N1500 3GB - 30 days",
                "variation_amount": "1500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-25gb-sme-10000",
                "name": "MTN N10,000 25GB SME Mobile Data ( 1 Month)",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-165gb-sme-50000",
                "name": "MTN N50,000 165GB SME Mobile Data (2-Months)",
                "variation_amount": "50000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-360gb-sme-100000",
                "name": "MTN N100,000 360GB SME Mobile Data (3 Months)",
                "variation_amount": "100000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-4-5tb-450000",
                "name": "MTN N450,000 4.5TB Mobile Data (1 Year)",
                "variation_amount": "450000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-1tb-110000",
                "name": "MTN N100,000 1TB Mobile Data (1 Year)",
                "variation_amount": "100000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-2-5gb-600",
                "name": "MTN N600 2.5GB - 2 days",
                "variation_amount": "600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-120gb-22000",
                "name": "MTN N22000 120GB Monthly Plan + 80mins",
                "variation_amount": "22000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-100gb-20000",
                "name": "MTN 100GB 2-Month Plan",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-160gb-30000",
                "name": "MTN N30,000 160GB 2-Month Plan",
                "variation_amount": "30000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-400gb-50000",
                "name": "MTN N50,000 400GB 3-Month Plan",
                "variation_amount": "50000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-600gb-75000",
                "name": "MTN N75,000 600GB 3-Months Plan",
                "variation_amount": "75000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-300",
                "name": "MTN N300 Xtratalk Weekly Bundle",
                "variation_amount": "300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-500",
                "name": "MTN N500 Xtratalk Weekly Bundle",
                "variation_amount": "500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-1000",
                "name": "MTN N1000 Xtratalk Monthly Bundle",
                "variation_amount": "1000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-2000",
                "name": "MTN N2000 Xtratalk Monthly Bundle",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-5000",
                "name": "MTN N5000 Xtratalk Monthly Bundle",
                "variation_amount": "5000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-10000",
                "name": "MTN N10000 Xtratalk Monthly Bundle",
                "variation_amount": "10000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-15000",
                "name": "MTN N15000 Xtratalk Monthly Bundle",
                "variation_amount": "15000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-20000",
                "name": "MTN N20000 Xtratalk Monthly Bundle",
                "variation_amount": "20000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-3gb-800",
                "name": "MTN N800 3GB - 2 days",
                "variation_amount": "800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-7gb-2000",
                "name": "MTN N2000 7GB - 7 days",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtradata-200",
                "name": "MTN N200 Xtradata",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "mtn-xtratalk-300",
                "name": "MTN N200 Xtratalk - 3 days",
                "variation_amount": "200.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}
PURCHASE PRODUCT
Using a POST method, MTN Data bundle can with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: mtn-data

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for data purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing data purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is mtn-data
billersCode	M	String	The phone number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "MTN Data",
            "unique_element": "08011111111",
            "unit_price": "100",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4,
            "total_amount": 96,
            "discount": null,
            "type": "Data Services",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "100",
            "platform": "api",
            "method": "api",
            "transactionId": "17415991578739548187285972",
            "commission_details": {
                "amount": 4,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031010323857076",
    "amount": 100,
    "transaction_date": "2025-03-10T09:32:37.000000Z",
    "purchased_code": ""
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
            "product_name": "MTN Data",
            "unique_element": "08011111111",
            "unit_price": 100,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4,
            "total_amount": 96,
            "discount": null,
            "type": "Data Services",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 100,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17415991578739548187285972",
            "product_id": 8,
            "commission_details": {
                "amount": 4,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031010323857076",
    "amount": 100,
    "transaction_date": "2025-03-10T09:32:37.000000Z",
    "purchased_code": ""
}


PURCHASE DATA PRODUCT
Using a POST method, Data bundle can with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: mtn-data (for example)

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for data purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct phone number for simulating various API responses:

Phone Number	 Event	Description
08011111111	Successful 	Returns a successful response for testing data purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is mtn-data
billersCode	M	String	The phone number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "MTN Data",
            "unique_element": "08011111111",
            "unit_price": "100",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4,
            "total_amount": 96,
            "discount": null,
            "type": "Data Services",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "100",
            "platform": "api",
            "method": "api",
            "transactionId": "17415991578739548187285972",
            "commission_details": {
                "amount": 4,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031010323857076",
    "amount": 100,
    "transaction_date": "2025-03-10T09:32:37.000000Z",
    "purchased_code": ""
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
            "product_name": "MTN Data",
            "unique_element": "08011111111",
            "unit_price": 100,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 4,
            "total_amount": 96,
            "discount": null,
            "type": "Data Services",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 100,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17415991578739548187285972",
            "product_id": 8,
            "commission_details": {
                "amount": 4,
                "rate": "4.00",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031010323857076",
    "amount": 100,
    "transaction_date": "2025-03-10T09:32:37.000000Z",
    "purchased_code": ""
}
