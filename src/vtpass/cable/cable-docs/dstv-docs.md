[UPDATED] DSTV Subscription Payment API
This documentation contains the updated flow for integrating DSTV Subscription Payment services on the VTpass RESTful API.

The VTpass DSTV subscription payment API allows you to renew/recharge the subscription on a DSTV decoder using the Smartcard number.

 

Authentication
The VTpass API uses Basic Authentication.

It should be passed as a concatenated string like this

username:password
Please use the following details for authentication

Username: YourVtpassEmail

Password: YourPassword

Please create your authentication details by following the instructions here.

 

 

Updated Endpoints
To integrate the VTpass DSTV Subscription Payment RESTful API, the endpoints below applies:

Get Variation Codes: this returns variation codes for various dstv bouquets (subscription plans)
Verify Smartcard Number
New Product Purchase (Using the variation code gotten in the first step)
Renew Product (Using the amount gotten from the verify smartcard number endpoint)
Query transaction status
 

GET VARIATION CODES
Using a GET method, the VTpass variation codes for DSTV bouquets can be accessed with the endpoint below:

Live:   https://vtpass.com/api/service-variations?serviceID=dstv

Sandbox: https://sandbox.vtpass.com/api/service-variations?serviceID=dstv

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
N/A	N/A	N/A	N/A
 

EXPECTED RESPONSE

{
    "response_description": "000",
    "content": {
        "ServiceName": "DSTV Subscription",
        "serviceID": "dstv",
        "convinience_fee": "N0",
        "variations": [
            {
                "variation_code": "dstv-padi",
                "name": "DStv Padi N1,850",
                "variation_amount": "1850.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga",
                "name": "DStv Yanga N2,565",
                "variation_amount": "2565.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam",
                "name": "Dstv Confam N4,615",
                "variation_amount": "4615.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv79",
                "name": "DStv  Compact N7900",
                "variation_amount": "7900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv3",
                "name": "DStv Premium N18,400",
                "variation_amount": "18400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv6",
                "name": "DStv Asia N6,200",
                "variation_amount": "6200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv7",
                "name": "DStv Compact Plus N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv9",
                "name": "DStv Premium-French N25,550",
                "variation_amount": "25550.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv10",
                "name": "DStv Premium-Asia N20,500",
                "variation_amount": "20500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "confam-extra",
                "name": "DStv Confam + ExtraView N7,115",
                "variation_amount": "7115.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "yanga-extra",
                "name": "DStv Yanga + ExtraView N5,065",
                "variation_amount": "5065.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "padi-extra",
                "name": "DStv Padi + ExtraView N4,350",
                "variation_amount": "4350.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-asia",
                "name": "DStv Compact + Asia N14,100",
                "variation_amount": "14100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv30",
                "name": "DStv Compact + Extra View N10,400",
                "variation_amount": "10400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-frenchtouch",
                "name": "DStv Compact + French Touch N10,200",
                "variation_amount": "10200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv33",
                "name": "DStv Premium - Extra View N20,900",
                "variation_amount": "20900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv40",
                "name": "DStv Compact Plus - Asia N18,600",
                "variation_amount": "18600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-frenchtouch-extra",
                "name": "DStv Compact + French Touch + ExtraView N12,700",
                "variation_amount": "12700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-asia-extra",
                "name": "DStv Compact + Asia + ExtraView N16,600",
                "variation_amount": "16600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv43",
                "name": "DStv Compact Plus + French Plus N20,500",
                "variation_amount": "20500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "complus-frenchtouch",
                "name": "DStv Compact Plus + French Touch N14,700",
                "variation_amount": "14700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv45",
                "name": "DStv Compact Plus - Extra View N14,900",
                "variation_amount": "14900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "complus-french-extraview",
                "name": "DStv Compact Plus + FrenchPlus + Extra View N23,000",
                "variation_amount": "23000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv47",
                "name": "DStv Compact + French Plus N16,000",
                "variation_amount": "16000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv48",
                "name": "DStv Compact Plus + Asia + ExtraView N21,100",
                "variation_amount": "21100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv61",
                "name": "DStv Premium + Asia + Extra View N23,000",
                "variation_amount": "23000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv62",
                "name": "DStv Premium + French + Extra View N28,000",
                "variation_amount": "28050.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "hdpvr-access-service",
                "name": "DStv HDPVR Access Service N2,500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "frenchplus-addon",
                "name": "DStv French Plus Add-on N8,100",
                "variation_amount": "8100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "asia-addon",
                "name": "DStv Asian Add-on N6,200",
                "variation_amount": "6200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "frenchtouch-addon",
                "name": "DStv French Touch Add-on N2,300",
                "variation_amount": "2300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "extraview-access",
                "name": "ExtraView Access N2,500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "french11",
                "name": "DStv French 11 N3,260",
                "variation_amount": "3260.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv80",
                "name": "DStv Asian Bouquet E36 N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga-showmax",
                "name": "DStv Yanga + Showmax N6,550",
                "variation_amount": "6550.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-greatwall-showmax",
                "name": "DStv Great Wall Standalone Bouquet + Showmax N6,625",
                "variation_amount": "6625.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-plus-showmax",
                "name": "DStv Compact Plus + Showmax N26,450",
                "variation_amount": "26450.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam-showmax",
                "name": "Dstv Confam + Showmax N10,750",
                "variation_amount": "10750.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-showmax",
                "name": "DStv  Compact + Showmax N17,150",
                "variation_amount": "17150.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-padi-showmax",
                "name": "DStv Padi + Showmax N7,100",
                "variation_amount": "7100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-asia-showmax",
                "name": "DStv Premium W/Afr +  ASIAE36 + Showmax N57,500",
                "variation_amount": "57500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-asia-showmax",
                "name": "DStv Asia + Showmax N15,900",
                "variation_amount": "15900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-french-showmax",
                "name": "DStv Premium + French + Showmax N57,500",
                "variation_amount": "57500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-showmax",
                "name": "DStv Premium + Showmax N37,000",
                "variation_amount": "37000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-str",
                "name": "DStv Premium Streaming Subscription - N37,000",
                "variation_amount": "37000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-prestige",
                "name": "DStv Prestige - N850,000",
                "variation_amount": "850000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga-stream",
                "name": "DStv Yanga OTT Streaming Subscription - N5,100",
                "variation_amount": "5100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-plus-streem",
                "name": "DStv Compact Plus Streaming Subscription - N25,000",
                "variation_amount": "25000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-stream",
                "name": "DStv Compact Streaming Subscription - N15,700",
                "variation_amount": "15700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam-stream",
                "name": "DStv Comfam Streaming Subscription - N9,300",
                "variation_amount": "9300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-indian",
                "name": "DStv Indian N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-indian",
                "name": "DStv Premium East Africa and Indian N16530",
                "variation_amount": "16530.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-fta-plus",
                "name": "DStv FTA Plus N1,600",
                "variation_amount": "1600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-hd",
                "name": "DStv PREMIUM HD N39,000",
                "variation_amount": "39000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-access-1",
                "name": "DStv Access N2000",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-family-1",
                "name": "DStv Family",
                "variation_amount": "4000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-indian-add-on",
                "name": "DStv India Add-on N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-mobile-1",
                "name": "DSTV MOBILE N790",
                "variation_amount": "790.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-movie-bundle-add-on",
                "name": "DStv Movie Bundle Add-on N2500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-pvr-access",
                "name": "DStv PVR Access Service N4000",
                "variation_amount": "4000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-wafr-showmax",
                "name": "DStv Premium W/Afr + Showmax N37,000",
                "variation_amount": "42000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "showmax3500",
                "name": "Showmax Standalone - N3,500",
                "variation_amount": "3500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-prestige-850",
                "name": "DStv Prestige Membership - N850,000",
                "variation_amount": "850000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-complus-frch-xtra",
                "name": "DStv Compact Plus + French + Xtraview - N39,000",
                "variation_amount": "39000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-complus-frch",
                "name": "DStv Compact Plus + French - N34,000",
                "variation_amount": "34000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-box-office",
                "name": "DStv Box Office",
                "variation_amount": "800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-box-office-premier",
                "name": "DStv Box Office (New Premier)",
                "variation_amount": "1100.00",
                "fixedPrice": "Yes"
            }
        ],
        "varations": [
            {
                "variation_code": "dstv-padi",
                "name": "DStv Padi N1,850",
                "variation_amount": "1850.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga",
                "name": "DStv Yanga N2,565",
                "variation_amount": "2565.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam",
                "name": "Dstv Confam N4,615",
                "variation_amount": "4615.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv79",
                "name": "DStv  Compact N7900",
                "variation_amount": "7900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv3",
                "name": "DStv Premium N18,400",
                "variation_amount": "18400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv6",
                "name": "DStv Asia N6,200",
                "variation_amount": "6200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv7",
                "name": "DStv Compact Plus N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv9",
                "name": "DStv Premium-French N25,550",
                "variation_amount": "25550.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv10",
                "name": "DStv Premium-Asia N20,500",
                "variation_amount": "20500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "confam-extra",
                "name": "DStv Confam + ExtraView N7,115",
                "variation_amount": "7115.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "yanga-extra",
                "name": "DStv Yanga + ExtraView N5,065",
                "variation_amount": "5065.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "padi-extra",
                "name": "DStv Padi + ExtraView N4,350",
                "variation_amount": "4350.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-asia",
                "name": "DStv Compact + Asia N14,100",
                "variation_amount": "14100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv30",
                "name": "DStv Compact + Extra View N10,400",
                "variation_amount": "10400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-frenchtouch",
                "name": "DStv Compact + French Touch N10,200",
                "variation_amount": "10200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv33",
                "name": "DStv Premium - Extra View N20,900",
                "variation_amount": "20900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv40",
                "name": "DStv Compact Plus - Asia N18,600",
                "variation_amount": "18600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-frenchtouch-extra",
                "name": "DStv Compact + French Touch + ExtraView N12,700",
                "variation_amount": "12700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "com-asia-extra",
                "name": "DStv Compact + Asia + ExtraView N16,600",
                "variation_amount": "16600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv43",
                "name": "DStv Compact Plus + French Plus N20,500",
                "variation_amount": "20500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "complus-frenchtouch",
                "name": "DStv Compact Plus + French Touch N14,700",
                "variation_amount": "14700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv45",
                "name": "DStv Compact Plus - Extra View N14,900",
                "variation_amount": "14900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "complus-french-extraview",
                "name": "DStv Compact Plus + FrenchPlus + Extra View N23,000",
                "variation_amount": "23000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv47",
                "name": "DStv Compact + French Plus N16,000",
                "variation_amount": "16000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv48",
                "name": "DStv Compact Plus + Asia + ExtraView N21,100",
                "variation_amount": "21100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv61",
                "name": "DStv Premium + Asia + Extra View N23,000",
                "variation_amount": "23000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv62",
                "name": "DStv Premium + French + Extra View N28,000",
                "variation_amount": "28050.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "hdpvr-access-service",
                "name": "DStv HDPVR Access Service N2,500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "frenchplus-addon",
                "name": "DStv French Plus Add-on N8,100",
                "variation_amount": "8100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "asia-addon",
                "name": "DStv Asian Add-on N6,200",
                "variation_amount": "6200.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "frenchtouch-addon",
                "name": "DStv French Touch Add-on N2,300",
                "variation_amount": "2300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "extraview-access",
                "name": "ExtraView Access N2,500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "french11",
                "name": "DStv French 11 N3,260",
                "variation_amount": "3260.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv80",
                "name": "DStv Asian Bouquet E36 N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga-showmax",
                "name": "DStv Yanga + Showmax N6,550",
                "variation_amount": "6550.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-greatwall-showmax",
                "name": "DStv Great Wall Standalone Bouquet + Showmax N6,625",
                "variation_amount": "6625.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-plus-showmax",
                "name": "DStv Compact Plus + Showmax N26,450",
                "variation_amount": "26450.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam-showmax",
                "name": "Dstv Confam + Showmax N10,750",
                "variation_amount": "10750.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-showmax",
                "name": "DStv  Compact + Showmax N17,150",
                "variation_amount": "17150.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-padi-showmax",
                "name": "DStv Padi + Showmax N7,100",
                "variation_amount": "7100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-asia-showmax",
                "name": "DStv Premium W/Afr +  ASIAE36 + Showmax N57,500",
                "variation_amount": "57500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-asia-showmax",
                "name": "DStv Asia + Showmax N15,900",
                "variation_amount": "15900.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-french-showmax",
                "name": "DStv Premium + French + Showmax N57,500",
                "variation_amount": "57500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-showmax",
                "name": "DStv Premium + Showmax N37,000",
                "variation_amount": "37000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-str",
                "name": "DStv Premium Streaming Subscription - N37,000",
                "variation_amount": "37000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-prestige",
                "name": "DStv Prestige - N850,000",
                "variation_amount": "850000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-yanga-stream",
                "name": "DStv Yanga OTT Streaming Subscription - N5,100",
                "variation_amount": "5100.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-plus-streem",
                "name": "DStv Compact Plus Streaming Subscription - N25,000",
                "variation_amount": "25000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-compact-stream",
                "name": "DStv Compact Streaming Subscription - N15,700",
                "variation_amount": "15700.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-confam-stream",
                "name": "DStv Comfam Streaming Subscription - N9,300",
                "variation_amount": "9300.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-indian",
                "name": "DStv Indian N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-indian",
                "name": "DStv Premium East Africa and Indian N16530",
                "variation_amount": "16530.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-fta-plus",
                "name": "DStv FTA Plus N1,600",
                "variation_amount": "1600.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-hd",
                "name": "DStv PREMIUM HD N39,000",
                "variation_amount": "39000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-access-1",
                "name": "DStv Access N2000",
                "variation_amount": "2000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-family-1",
                "name": "DStv Family",
                "variation_amount": "4000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-indian-add-on",
                "name": "DStv India Add-on N12,400",
                "variation_amount": "12400.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-mobile-1",
                "name": "DSTV MOBILE N790",
                "variation_amount": "790.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-movie-bundle-add-on",
                "name": "DStv Movie Bundle Add-on N2500",
                "variation_amount": "2500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-pvr-access",
                "name": "DStv PVR Access Service N4000",
                "variation_amount": "4000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-premium-wafr-showmax",
                "name": "DStv Premium W/Afr + Showmax N37,000",
                "variation_amount": "42000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "showmax3500",
                "name": "Showmax Standalone - N3,500",
                "variation_amount": "3500.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-prestige-850",
                "name": "DStv Prestige Membership - N850,000",
                "variation_amount": "850000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-complus-frch-xtra",
                "name": "DStv Compact Plus + French + Xtraview - N39,000",
                "variation_amount": "39000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-complus-frch",
                "name": "DStv Compact Plus + French - N34,000",
                "variation_amount": "34000.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-box-office",
                "name": "DStv Box Office",
                "variation_amount": "800.00",
                "fixedPrice": "Yes"
            },
            {
                "variation_code": "dstv-box-office-premier",
                "name": "DStv Box Office (New Premier)",
                "variation_amount": "1100.00",
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

serviceID	M	String	Service ID as specified by VTpass. In this case, it is dstv
 

 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "Customer_Name": "TEST METER",
        "Status": "ACTIVE",
        "Due_Date": "2025-02-06T00:00:00",
        "Customer_Number": "8061522780",
        "Customer_Type": "DSTV",
        "commission_details": {
            "amount": null,
            "rate": "1.50",
            "rate_type": "percent",
            "computation_type": "default"
        }
    }
}
PURCHASE PRODUCT

This endpoint allows you to change or renew a DSTV decoder using its smartcard number.

For product purchase one can totally change the current bouquet of the DSTV decoder or subscribe a fresh bouquet on a DSTV decoder using the NEW PURCHASE/BOUQUET CHANGE endpoint or one can renew the current bouquet using the BOUQUET RENEWAL endpoint.

After carrying out verification, you need to display the following:

Customer Name
Customer’s current bouquet Current_Bouquet
The amount due for renewing the current bouquet. This is in the field Renewal_Amount . Please note that this amount might be different from the real price for renewing the current bouquet due to “promos” or “special offers”
Then you ask the customer if they want to renew the current bouquet at that price OR change their bouquet.
The option selected will determine if you will use the A (Change Bouquet) or B (Bouquet Renewal) option.

Product purchase endpoints are as follows:

A. BOUQUET CHANGE
This endpoint allows you to recharge a DSTV decoder afresh / change the existing bouquet of a DSTV decoder using its smartcard number. This option is for a new subscriber to DSTV or a returning subscriber who would like to change his/her bouquet.

Using a POST method, DSTV Subscription Payment services can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: dstv

 

The sandbox environment provides specific scenarios to simulate success, failure, or unexpected outcomes for DSTV purchases. Use the examples below to test and observe how your integration behaves.

Refer to the table below to find the correct smartcard number/billersCode for simulating various API responses:

BillersCode	 Event	Description
1212121212	Successful 	Returns a successful response for testing data purchases.
201000000000	Pending	Simulates an unexpected pending response.
500000000000	Unexpected Response	Simulates an expected response, used to test how your system handles anomalies.
400000000000	No Response	Simulates a scenario where the API returns no response.
300000000000	Timeout	Simulates a timeout scenario for testing response handling under delays.
Any random phone number other than the above	Failed	Simulates a failed scenario for testing error handling for transaction failure.
 

NEEDED PAYLOAD

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is dstv
billersCode	M	String	The smart card number you wish to make the Subscription payment on
variation_code	M	String	The code of the variation of the bouquet (as specified in the GET VARIATIONS method as variation_code).
amount	M	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
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
            "product_name": "DSTV Subscription",
            "unique_element": "1212121212",
            "unit_price": "1850",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 27.75,
            "total_amount": 1822.25,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "1850",
            "platform": "api",
            "method": "api",
            "transactionId": "17416009779459629327738818",
            "commission_details": {
                "amount": 27.75,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031011029125930",
    "amount": 1850,
    "transaction_date": "2025-03-10T10:02:57.000000Z",
    "purchased_code": ""
}
B. BOUQUET RENEWAL
This endpoint allows you to renew a DSTV decoder subscription using its smartcard number. This option is strictly for a returning customer who desires to renew his/her current DSTV bouquet. Using this option, there may be a discount on the renewal price [according to the discretion of DSTV] as opposed to the actual cost of the customer’s DSTV bouquet.

NOTE: You are to first verify the DSTV smartcard number using the MERCHANT VERIFY endpoint and use the Renewal_Amount obtained from the MERCHANT VERIFY endpoint as the amount in your request payload.
Using a POST method, DSTV Subscription Payment services can be purchased with the endpoint below:

 

Live: https://vtpass.com/api/pay

Sandbox: https://sandbox.vtpass.com/api/pay

ServiceID: dstv

 

Smartcard number (billerscode) on sandbox: 1212121212

To simulate a failed transaction on sandbox, please use any number apart from the one provided above as the smart card number.

 

 

FIELDS	Mandatory/Optional	TYPE	DESCRIPTION
request_id	M	String	This is a unique reference with which you can use to identify and query the status of a given transaction after the transaction has been executed.
Click here to understand how to generate a valid request ID

serviceID	M	String	Service ID as specified by VTpass. In this case, it is dstv
billersCode	M	String	The smart card number you wish to make the Subscription payment on
amount	M	Number	The amount of the variation (as specified in the GET VARIATIONS endpoint as variation_amount)
NOTE: This is optional.

If you specify amount, we will topup decoder with the amount. If you do not specify amount, then we will use the price set for the bouquet (as returned in GET VARIATION CODES endpoint)

phone	M	Number	The phone number of the customer or recipient of this service
subscription_type	M	String	The type of subscription in this case renew.
 

EXPECTED RESPONSE

{
    "code": "000",
    "content": {
        "transactions": {
            "status": "delivered",
            "product_name": "DSTV Subscription",
            "unique_element": "1212121212",
            "unit_price": "1850",
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 27.75,
            "total_amount": 1822.25,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "convinience_fee": 0,
            "amount": "1850",
            "platform": "api",
            "method": "api",
            "transactionId": "17416009779459629327738818",
            "commission_details": {
                "amount": 27.75,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "response_description": "TRANSACTION SUCCESSFUL",
    "requestId": "2025031011029125930",
    "amount": 1850,
    "transaction_date": "2025-03-10T10:02:57.000000Z",
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
            "product_name": "DSTV Subscription",
            "unique_element": "1212121212",
            "unit_price": 1850,
            "quantity": 1,
            "service_verification": null,
            "channel": "api",
            "commission": 28,
            "total_amount": 1822.25,
            "discount": null,
            "type": "TV Subscription",
            "email": "sandbox@sandbox.vtpass.com",
            "phone": "123450987623",
            "name": null,
            "extras": null,
            "convinience_fee": 0,
            "amount": 1850,
            "platform": "api",
            "method": "wallet",
            "transactionId": "17416009779459629327738818",
            "product_id": 5,
            "commission_details": {
                "amount": 28,
                "rate": "1.50",
                "rate_type": "percent",
                "computation_type": "default"
            }
        }
    },
    "requestId": "2025031011029125930",
    "amount": 1850,
    "transaction_date": "2025-03-10T10:02:57.000000Z",
    "purchased_code": ""
}


