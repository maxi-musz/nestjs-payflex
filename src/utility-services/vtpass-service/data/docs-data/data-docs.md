Response Codes
This section contains the response codes you will likely get from the VTpass API.

The “code” parameter would usually contain the following response.

Verification Response
These are the response codes that can be gotten for a DSTV/GOTV/Startimes smartcard verification, meter number verification for various electricity disco.

Note if any of the below status code is gotten during product purchase, treat as failed.

Response Code	Meaning	Note
020	BILLER CONFIRMED	BILLER CONFIRMED
011	INVALID ARGUMENTS	You are not passing at least one of the arguments expected in your request.
012	PRODUCT DOES NOT EXIST	PRODUCT DOES NOT EXIST
030	BILLER NOT REACHABLE AT THIS POINT	The biller for the product or service is unreachable.
 

Transaction/Requery Response
These are the response codes that can be gotten for a product purchase. Some of these codes require you look inwards into the response object for the actual transaction status while some represent failed transactions.

 

Important
Take any response that differs from the guildelines provided here as pending, and initiate a transaction requery accordingly.
If transaction times out or response is not received, please treat as pending and initiate a transaction requery accordingly.

For any unclear transaction response, always initiate a transaction requery to confirm status.

 

Response Code	Meaning	Note
000	TRANSACTION PROCESSED	Transaction is processed. Please check [content][transactions][status] for the status of the transaction. It would contain the actual state like initiated, pending, delivered. See the next table for more information.
099	TRANSACTION IS PROCESSING	Transaction is currently precessing. In such situation, you should requery using your requestID to ascertain the current status of the transaction.
001	TRANSACTION QUERY	The current status of a given transaction carried out on the platform
044	TRANSACTION RESOLVED	Transaction has been resolved. Please contact us for more info.
091	TRANSACTION NOT PROCESSED	Transaction is not processed and you will not be charged for this transaction.
016	TRANSACTION FAILED	TRANSACTION FAILED
010	VARIATION CODE DOES NOT EXIST	You are using an invalid variation code. Please check the list of available variation codes here.
011	INVALID ARGUMENTS	You are not passing at least one of the arguments expected in your request.
012	PRODUCT DOES NOT EXIST	PRODUCT DOES NOT EXIST
013	BELOW MINIMUM AMOUNT ALLOWED	You are attempting to pay an amount lower than the minimum allowed for that product/service.
014	REQUEST ID ALREADY EXIST	You have used the RequestID for a previous transaction.
015	INVALID REQUEST ID	This is returned for a requery operation. This RequestID was not used on our platform.
017	ABOVE MAXIMUM AMOUNT ALLOWED	You are attempting to pay an amount higher than the maximum allowed for that product/service.
018	LOW WALLET BALANCE	You do not have adequate funds in your wallet to cover the cost of the transaction.
019	LIKELY DUPLICATE TRANSACTION	You attempted to buy thesame service multiple times for the same biller_code within 30 seconds.
021	ACCOUNT LOCKED	Your account is locked
022	ACCOUNT SUSPENDED	Your account is suspended
023	API ACCESS NOT ENABLE FOR USER	Your account does not have API access enabled. Please contact us to request for activation
024	ACCOUNT INACTIVE	Your account is inactive.
025	RECIPIENT BANK INVALID	Your bank code for bank transfer is invalid.
026	RECIPIENT ACCOUNT COULD NOT BE VERIFIED	Your bank account number could not be verified.
027	IP NOT WHITELISTED, CONTACT SUPPORT	You need to contact support with your server IP for whitelisting
028	PRODUCT IS NOT WHITELISTED ON YOUR ACCOUNT	You need to whitelist products you want to vend
030	BILLER NOT REACHABLE AT THIS POINT	The biller for the product or service is unreachable.
031	BELOW MINIMUM QUANTITY ALLOWED	You are under-requesting for a service that has a limit on the quantity to be purchased per time.
032	ABOVE MINIMUM QUANTITY ALLOWED	You are over-requesting for a service that has a limit on the quantity to be purchased per time.
034	SERVICE SUSPENDED	The service being requested for has been suspended for the time being.
035	SERVICE INACTIVE	You are requesting for a service that has been turned off at the moment.
040	TRANSACTION REVERSAL	Transaction reversal to wallet
083	SYSTEM ERROR	Oops!!! System error. Please contact tech support
085	IMPROPER REQUEST ID: DOES NOT CONTAIN DATE	Request ID must contain valid date..
IMPROPER REQUEST ID: NOT PROPER DATE FORMAT – FIRST 8 CHARACTERS MUST BE DATE (TODAY’S DATE – YYYYMMDD)	Request ID must contain a valid date format (YYYYMMDD).
IMPROPER REQUEST ID: DATE NOT TODAY’S DATE – FIRST 8 CHARACTERS MUST BE TODAY’S DATE IN THIS FORMAT: YYYYMMDD	Request ID date must contain todays’s date.
 

087	INVALID CREDENTIALS	Please verify your credentials and confirm that you are using the correct API authentication method as defined in your integration setup.
089	
REQUEST IS PROCESSING, PLEASE WAIT BEFORE MAKING ANOTHER REQUEST
The system is still processing your previous request. Please wait until it is complete before sending another.
Transaction Response Format
This section contains the response format for [content][status] when the transactions are processed and the code “000” is returned.
It determines the actual state of a processed transaction

When the “code” parameter returns “000”, the following “status” is applicable.

 

Response Code	Meaning	Note
initiated	Transaction has been initiated	Transaction is initiated.
pending	Transaction is pending.	Transaction is pending. This may happen when service provider has not concluded the transaction. This status will be updated. Please requery to get a final status.
delivered	Transaction Successful	Transaction is successful and service is confirmed as delivered.