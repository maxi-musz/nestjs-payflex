now, in this @registration.service.ts the next thing after veriyfying otp for phone is nin, bvn and voters card verification @REGISTRATION_PROGRESS_GUIDE.md 

now, for that one, on the app, the user can pass in two things, one is the verification method which can be nin bvn, voters card and then the number 

now, for the verification, i will be using two external services, one is dojah and the other is smileId, can we create this like we did for termii and bulksms so that it can easily be switched in env
so the three ways i can perform the verification is 
none
dojah
smileId

that none is majorly for if i want to test in development and just veriy the users whatver sent in number without really using real world data just fake peding till when i complete dojah and smile verification 

for dojah, this is the documentation 
🇳🇬 Nigeria - Lookup
Lookup NIN
This endpoint allows developers to fetch customers details using the National Identification Number (NIN) of the customer

​
Lookup NIN
​
Request
[GET]

Copy
{{baseURL}}/api/v1/kyc/nin
​
Header
Header	Type	Description
AppId	string	Create an app to get your app ID on dashboard here
Authorization	string	public secret key
​
Query parameters
Parameter	Type	Description	Required
nin *	string	A valid nin	required
​
Sample response
[200]

Copy

        {
            "entity": {
                "first_name": "John",
                "last_name": "Doe",
                "gender": "Male",
                "middle_name": "",
                "photo": "/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgc...",
                "date_of_birth": "1982-01-01",
                "email": "abc@gmail.com",
                "phone_number": "08012345678",
                "employment_status": "unemployment",
                "marital_status": "Single"
            }
        } 
​
Lookup NIN Advance
​
Request
[GET]

Copy
{{baseURL}}/api/v1/kyc/nin/advance
​
Query parameters
Parameter	Type	Description	Required
nin *	string	A valid nin	required
​
Sample response
[200]

Copy

{
    "entity": {
        "nin": "12345678910",
        "first_name": "John",
        "last_name": "Doe",
        "middle_name": "Anon",
        "date_of_birth": "1909-01-11",
        "phone_number": "081123456798",
        "photo": "/9j/4AAQSz\nQBKtKKaOgp460hjlpw4pmcGnA8Uhj6Mc0g6UCg..."
        "gender": "Male",
        "email": "",
        "employment_status": "unemployed",
        "marital_status": "single",
        "birth_country": "nigeria",
        "birth_lga": "Ikeja",
        "birth_state": "Lagos",
        "educational_level": "tertiary",
        "maiden_name": "",
        "nspoken_lang": "YORUBA",
        "profession": "STUDENT",
        "religion": "christianity",
        "residence_address_line_1": "2, ANON STREET",
        "residence_address_line_2": "",
        "residence_status": "birth",
        "residence_town": "",
        "residence_lga": "Ikeja West",
        "residence_state": "Ikeja",
        "ospoken_lang": "ENGLISH",
        "origin_lga": "Ikeja",
        "origin_place": "",
        "origin_state": "Lagos",
        "height": "171",
        "p_first_name": "",
        "p_middle_name": "",
        "p_last_name": ""
    }
}
​
Test Credentials for Sandbox
Kindly use this Test NIN in sandbox Environment
nin = 70123456789

for bvn 
 Nigeria - Lookup
Lookup BVN
The Lookup BVN endpoint returns details of a particular BVN

​
BVN Basic
[GET]

Copy
{{baseUrl}}/api/v1/kyc/bvn/full
​
Header
Header	Type	Description
AppId	string	Create an app to get your app ID on dashboard here
Authorization	string	public secret key
​
Query parameters
Parameter	Type	Description	Required
bvn *	string	A valid bvn	required
​
Sample response
Response

Copy
{
  "entity": {
        "bvn": "22171234567",
        "first_name": "JOHN",
        "last_name": "DOE",
        "middle_name": "AHMED",
        "gender": "Male",
        "date_of_birth": "1997-05-16",
        "phone_number1": "08012345678",
        "image": "BASE 64 IMAGE",
        "phone_number2": "08012345678"
    }
}
​
BVN Advanced
[GET]

Copy
{{baseUrl}}/api/v1/kyc/bvn/advance
​
Header
Header	Type	Description
AppId	string	Create an app to get your app ID on dashboard here
Authorization	string	public secret key
​
Query parameters
Parameter	Type	Description	Required
bvn *	string	A valid bvn	required
​
Sample response
Response

Copy
{
  "entity": {
        "bvn": "22171234567",
        "first_name": "JOHN",
        "last_name": "DOE",
        "middle_name": "AHMED",
        "gender": "Male",
        "date_of_birth": "1997-05-16",
        "phone_number1": "08012345678",
        "image": "BASE 64 IMAGE",
      	"email": "johndoe@gmail.com",
        "enrollment_bank": "GTB",
        "enrollment_branch": "IKEJA",
        "level_of_account": "LEVEL 2",
        "lga_of_origin": "OSOGBO",
        "lga_of_residence": "IKEJA",
        "marital_status": "SINGLE",
        "name_on_card": "",
        "nationality": "NIGERIAN",
        "phone_number2": "08012345678",
        "registration_date": "",
        "residential_address": "",
        "state_of_origin": "OSUN",
        "state_of_residence": "LAGOS",
        "title": "MISS",
        "watch_listed": "NO"
    }
}
​
Test Credentials for Sandbox
Kindly use this Test BVN in sandbox Environment
bvn = 22222222222

include the one for voters card also 
Nigeria - Lookup
Lookup Voters ID
This endpoint allows you to fetch a person’s details using the Voter’s Identification Number of the Individual.

​
Request
[GET]

Copy
{{baseUrl}}/api/v1/kyc/vin
​
Header
Header	Type	Description
AppId	string	Create an app to get your app ID on dashboard here
Authorization	string	public secret key
​
Query parameters
vin	string	Voter’s identification number	optional
​
Sample response
[200]

Copy
"entity": {
    "full_name": "JOHN DOE",
    "voter_identification_number": "91F1234567890123",
    "gender": "Male",
    "occupation": "STUDENT",
    "time_of_registration": "2011-02-18 13:59:46",
    "state": "ONDO",
    "local_government": "IDANRE",
    "registration_area_ward": "",
    "polling_unit": "OJAJIGBOKIN, O/S IN FRONT OF ABANA I & II",
    "polling_unit_code": "12/03/04/005",
    "address": "NO 16 OWODE QTS KABBA",
    "phone": "0812345678",
    "date_of_birth": "1960-10-16"
  }
​
Test Credentials for Sandbox
Kindly use this Test VIN in sandbox Environment
VIN = 91F6B1F5BE29535558655586

another service i want is this one to look up phone number (verify phone number name with bvn or nin or voters card name)
Nigeria - Lookup
Lookup Phone Number
This endpoint returns details of a phone number

📘 NOTE: There are two payload responses for this endpoint based on the details returned
Basic
Advanced
​
Phone Number Basic
[GET]

Copy
{{baseUrl}}api/v1/kyc/phone_number/basic

​
Header
Header	Type	Description
AppId	string	Create an app to get your app ID on dashboard here
Authorization	string	public secret key
​
Query parameters
Parameter	Type	Description	Required
phone_number *	string	A valid phone number	required
​
Sample response
Response

Copy
{
    "entity": {
        "first_name": "JOHN",
        "middle_name": "DOE",
        "last_name": "CHHUKWU",
        "gender": "Male",
        "nationality": "NGA",
        "date_of_birth": "1990-05-16",
        "msisdn": "23481222222222"
    }
}
​
Phone Number Advance
[GET]

Copy
{{baseUrl}}api/v1/kyc/phone_number?phone_number=081123456976
​
Query parameters
Parameter	Type	Description	Required
phone_number *	string	A valid phone numbe	required
​
Sample response
Response

Copy
{
    "entity": {
        "first_name": "JOHN",
        "last_name": "DOE",
        "middle_name": "CHHUKWU",
        "date_of_birth": "1960-12-12",
        "phone_number": "08012345678",
        "photo": "BASE 64 IMAGE",
        "gender": "M",
        "customer": "9b2ac137-5360-4050-b412-4fa6728a31fb"
    }
}
​
Test Credentials for Sandbox
phone_number = 09011111111