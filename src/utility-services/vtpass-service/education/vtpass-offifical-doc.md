WAEC Registration API
This section contains the recommended flow for integrating WAEC registration services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass WAEC registration RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various WAEC registration plans
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for WAEC registration plans can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=waec-registration

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=waec-registration

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{  
   "response_description":"000",
   "content":{  
      "ServiceName":"WAEC Registration PIN",
      "serviceID":"waec-registration",
      "convinience_fee":"N0.00",
      "variations":[  
          {
                "variation_code": "waec-registraion",
                "name": "WASSCE for Private Candidates - Second Series (2019)",
                "variation_amount": "14450.00",
                "fixedPrice": "Yes"
          },
          ...
      ]
   }
}

PURCHASE PRODUCT
Using a POST method,  WAEC registration pin can with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: waec-registration

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is waec-registration
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

quantity	O	Number	The quantity of the result checker PIN you wish to purchase.
This quantity will be defaulted to 1 if it is not passed in your request.

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
  "code": "000",
  "content": {
      "transactions": {
          "status": "delivered",
          "product_name": "WAEC Registration PIN",
          "unique_element": "08011111111",
          "unit_price": 14450,
          "quantity": 1,
          "service_verification": null,
          "channel": "api",
          "commission": 150,
          "total_amount": 14300,
          "discount": null,
          "type": "Education",
          "email": "sandbox@vtpass.com",
          "phone": "07061933309",
          "name": null,
          "convinience_fee": 0,
          "amount": 14450,
          "platform": "api",
          "method": "api",
          "transactionId": "1582290782154",
          "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
       }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218130312-78654567",
    "amount": 14450,
    "transaction_date": "2025-02-18T12:03:16.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": [
        "0100070365657400875"
    ]
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
  "code": "000",
  "content": {
      "transactions": {
      "status": "delivered",
      "product_name": "WAEC Registration PIN",
      "unique_element": "08011111111",
      "unit_price": 14450,
      "quantity": 1,
      "service_verification": null,
      "channel": "api",
      "commission": 150, 
      "total_amount": 14300,
      "discount": null,
      "type": "Education",
      "email": "sandbox@vtpass.com",
      "phone": "07061933309",
      "name": null,
      "convinience_fee": 0,
      "amount": 14450,
      "platform": "api",
      "method": "api",
      "transactionId": "1582290782154",
      "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
       }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218130312-78654567",
    "amount": 14450,
    "transaction_date": "2025-02-18T12:03:16.000000Z",
    "purchased_code": "Token: 0100070365657400875",
    "tokens": [
        "0100070365657400875"
    ]
}

WAEC Result Checker API
This section contains the recommended flow for integrating WAEC result checker services on the VTpass RESTful API.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass WAEC result checker RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various WAEC result checker plans
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for WAEC result checker plans can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=waec

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=waec

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{  
   "response_description":"000",
   "content":{  
      "ServiceName":"WAEC Result Checker PIN",
      "serviceID":"waec",
      "convinience_fee":"N0.00",
      "variations":[  
          {
                "variation_code": "waecdirect",
                "name": "WASSCE",
                "variation_amount": "900.00",
                "fixedPrice": "Yes"
          },
          ...
      ]
   }
}

PURCHASE PRODUCT
Using a POST method,  WAEC result checker pin can with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: waec

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is waec
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

quantity	O	Number	The quantity of the result checker PIN you wish to purchase.
This quantity will be defaulted to 1 if it is not passed in your request.

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
  "code": "000",
  "content": {
      "transactions": {
          "status": "delivered",
          "product_name": "WAEC Result Checker PIN",
          "unique_element": "08011111111",
          "unit_price": 900,
          "quantity": 1,
          "service_verification": null,
          "channel": "api",
          "commission": 100,
          "total_amount": 800,
          "discount": null,
          "type": "Education",
          "email": "sandbox@vtpass.com",
          "phone": "07061933309",
          "name": null,
          "convinience_fee": 0,
          "amount": 900,
          "platform": "api",
          "method": "api",
          "transactionId": "1582290782154",
          "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
       }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218124018-c3pwwi49eid",
    "amount": "900.00",
    "transaction_date": "2025-02-18T11:40:20.000000Z",
    "purchased_code": "Serial No:WRN123456790, pin: 098765432112",
     "cards": [
         {
             "Serial": "WRN123456790",
             "Pin": "098765432112"
         }
     ]
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
  "code": "000",
  "content": {
      "transactions": {
      "status": "delivered",
      "product_name": "WAEC Result Checker PIN",
      "unique_element": "08011111111",
      "unit_price": 900,
      "quantity": 1,
      "service_verification": null,
      "channel": "api",
      "commission": 100,
      "total_amount": 800,
      "discount": null,
      "type": "Education",
      "email": "sandbox@vtpass.com",
      "phone": "07061933309",
      "name": null,
      "convinience_fee": 0,
      "amount": 900,
      "platform": "api",
      "method": "api",
      "transactionId": "1582290782154",
      "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
       }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "20250218124018-c3pwwi49eid", "amount": "900.00",
    "transaction_date": "2025-02-18T11:40:20.000000Z",
    "purchased_code": "Serial No:WRN123456790, pin: 098765432112",
     "cards": [
         {
             "Serial": "WRN18235587",
             "Pin": "373820665250"
         }
      ]
}


JAMB PIN VENDING API
This section contains the recommended flow for integrating JAMB pin vending (UTME & Direct Entry) services on the VTpass RESTful API.

NB: Do not sell more than the approved pricing from JAMB.
If you have any questions, please let us know by contacting us.

 

Authentication
Learn about authentication from here.

 

 

Available Endpoints
To integrate the VTpass JAMB pin vending RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various JAMB pin types
Verify JAMB Profile ID (get from JAMB Official Website)
Purchase Product (Using the variation code gotten in the first step)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for JAMB pin types can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=jamb

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=jamb

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "Jamb",
        "serviceID": "jamb",
        "convinience_fee": "0 %",
        "variations": [
            {
                "variation_code": "utme-mock",
                "name": "UTME PIN (with mock)",
                "variation_amount": "7700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "utme-no-mock",
                "name": "UTME PIN (without mock)",
                "variation_amount": "6200.00",
                "fixedPrice": "Yes"
            }
        ]
    }
}

 

VERIFY PROFILE ID
This endpoint allows you to verify the JAMB Profile ID (get from JAMB Official Website) before attempting to make payment.

This endpoint returns the customer name.

Using a POST method, you can verify a JAMB Profile ID with the endpoint below:

Live: https://vtpass.com/api/merchant-verify

Sandbox: https://sandbox.vtpass.com/api/merchant-verify

Smartcard number (billerscode) on sandbox: 0123456789

 

To simulate a failed Profile ID validation on sandbox, please use any number apart from the one provided above as the Profile ID.

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
billersCode	M	Number	The Profile ID number you wish to make payment on.
On Sandbox
Use: 0123456789

serviceID	M	String	Service ID as specified by VTpass. In this case, it is jamb
type	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
 

 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "Customer_Name": "Capital James",
        "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
    }
}
 

PURCHASE PRODUCT
Using a POST method, JAMB pin can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: jamb

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is jamb
variation_code	M	String	The code of the variation (as specified in the GET VARIATIONS method as variation_code).
billersCode	M	String	The Profile ID you wish to make the payment on. In this case, it is 0123456789
amount	O	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
This amount will be ignored as the variation code determine the price of the data bundle.

phone	M	Number	The phone number of the customer or recipient of this service
 

EXPECTED RESPONSE

{
    "code":"000",
    "content":{
        "transactions":{
            "status":"delivered",
            "product_name":"JAMB PIN VENDING (UTME & Direct Entry)",
            "unique_element":"0123456789",
            "unit_price":"7700.00",
            "quantity":1,
            "service_verification":null,
            "channel":"api",
            "commission":"100.00",
            "total_amount":7600,
            "discount":null,
            "type":"Education",
            "email":"sandbox@sandbox.vtpass.com",
            "phone":"123450987623",
            "name":null,
            "convinience_fee":0,
            "amount":"7700.00",
            "platform":"api",
            "method":"api",
            "transactionId":"17398810413069178444218360",
            "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
        }
    },
    "response_description":"TRANSACTION SUCCESSFUL",
    "requestId":"20250218131720-0rjx1p27xnj",
    "amount":7700,
    "transaction_date":"2025-02-18T12:17:21.000000Z",
    "purchased_code":"Pin : 3678251321392432",
    "Pin":"Pin : 3678251321392432"
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
    "code":"000",
    "content":{
        "transactions":{
            "status":"delivered",
            "product_name":"JAMB PIN VENDING (UTME & Direct Entry)",
            "unique_element":"0123456789",
            "unit_price":"7700.00",
            "quantity":1,
            "service_verification":null,
            "channel":"api",
            "commission":"100.00",
            "total_amount":7600,
            "discount":null,
            "type":"Education",
            "email":"sandbox@sandbox.vtpass.com",
            "phone":"123450987623",
            "name":null,
            "convinience_fee":0,
            "amount":"7700.00",
            "platform":"api",
            "method":"api",
            "transactionId":"17398810413069178444218360",
            "commission_details": { "amount": 10.22, "rate": "1.50", "rate_type": "percent", "computation_type": "default" },
        }
    },
    "response_description":"TRANSACTION SUCCESSFUL",
    "requestId":"20250218131720-0rjx1p27xnj",
    "amount":7700,
    "transaction_date":"2025-02-18T12:17:21.000000Z",
    "purchased_code":"Pin : 3678251321392432",
    "Pin":"Pin : 3678251321392432"
}
