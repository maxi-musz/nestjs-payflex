--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Homebrew)
-- Dumped by pg_dump version 16.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountType" AS ENUM (
    'savings',
    'current',
    'investment'
);


ALTER TYPE public."AccountType" OWNER TO postgres;

--
-- Name: BridgeCurrencyType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BridgeCurrencyType" AS ENUM (
    'NGN',
    'USD',
    'GBP',
    'EUR'
);


ALTER TYPE public."BridgeCurrencyType" OWNER TO postgres;

--
-- Name: CreditDebit; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CreditDebit" AS ENUM (
    'credit',
    'debit'
);


ALTER TYPE public."CreditDebit" OWNER TO postgres;

--
-- Name: CurrencyType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CurrencyType" AS ENUM (
    'ngn',
    'usd',
    'gbp',
    'eur'
);


ALTER TYPE public."CurrencyType" OWNER TO postgres;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Gender" AS ENUM (
    'male',
    'female'
);


ALTER TYPE public."Gender" OWNER TO postgres;

--
-- Name: KycIdStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."KycIdStatus" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public."KycIdStatus" OWNER TO postgres;

--
-- Name: KycIdType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."KycIdType" AS ENUM (
    'NIGERIAN_NIN',
    'NIGERIAN_INTERNATIONAL_PASSPORT',
    'NIGERIAN_PVC',
    'NIGERIAN_DRIVERS_LICENSE',
    'NIGERIAN_BVN_VERIFICATION'
);


ALTER TYPE public."KycIdType" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'paystack',
    'card',
    'bank_transfer',
    'wallet',
    'ussd'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'user',
    'admin',
    'super_admin'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'pending',
    'success',
    'failed',
    'cancelled'
);


ALTER TYPE public."TransactionStatus" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'transfer',
    'deposit',
    'airtime',
    'data',
    'cable',
    'education',
    'betting'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    user_id text NOT NULL,
    account_number text,
    "accountType" public."AccountType" DEFAULT 'savings'::public."AccountType",
    currency public."CurrencyType",
    bank_name text,
    bank_code text,
    balance double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    flutterwave_id text,
    meta_data jsonb DEFAULT '{}'::jsonb,
    order_ref text,
    reference text,
    account_name text,
    country text,
    iban text,
    routing_number text,
    sort_code text,
    swift_code text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "userId" text NOT NULL,
    city text,
    state text,
    country text,
    home_address text,
    house_number text,
    postal_code text
);


ALTER TABLE public."Address" OWNER TO postgres;

--
-- Name: Bookmark; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Bookmark" (
    id integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    link text NOT NULL
);


ALTER TABLE public."Bookmark" OWNER TO postgres;

--
-- Name: Bookmark_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Bookmark_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Bookmark_id_seq" OWNER TO postgres;

--
-- Name: Bookmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Bookmark_id_seq" OWNED BY public."Bookmark".id;


--
-- Name: Card; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Card" (
    id text NOT NULL,
    user_id text NOT NULL,
    bridge_card_id text,
    masked_pan text,
    expiry_month text,
    expiry_year text,
    status text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    balance_after double precision,
    balance_before double precision,
    card_brand text,
    card_currency public."BridgeCurrencyType",
    card_last4 text,
    card_name text,
    current_balance double precision,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    card_type text,
    first_funding_amount double precision,
    card_limit double precision,
    transaction_reference text,
    bridge_cardholder_id text DEFAULT 'null'::text
);


ALTER TABLE public."Card" OWNER TO postgres;

--
-- Name: FlwTempAcctNumber; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FlwTempAcctNumber" (
    id text NOT NULL,
    response_code text,
    flw_ref text,
    order_ref text,
    account_number text,
    "accountStatus" text,
    bank_name text,
    note text,
    amount double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id text NOT NULL,
    order_no text,
    status text,
    meta_data jsonb,
    frequency integer
);


ALTER TABLE public."FlwTempAcctNumber" OWNER TO postgres;

--
-- Name: KycVerification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KycVerification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    id_no text NOT NULL,
    id_type public."KycIdType",
    status public."KycIdStatus"
);


ALTER TABLE public."KycVerification" OWNER TO postgres;

--
-- Name: ProfileImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProfileImage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    secure_url text NOT NULL,
    public_id text NOT NULL
);


ALTER TABLE public."ProfileImage" OWNER TO postgres;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO postgres;

--
-- Name: SenderDetails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SenderDetails" (
    id text NOT NULL,
    transaction_id text NOT NULL,
    sender_name text NOT NULL,
    sender_bank text NOT NULL,
    sender_account_number text NOT NULL
);


ALTER TABLE public."SenderDetails" OWNER TO postgres;

--
-- Name: TransactionHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TransactionHistory" (
    id text NOT NULL,
    account_id text,
    user_id text NOT NULL,
    amount double precision,
    transaction_type public."TransactionType",
    description text,
    status public."TransactionStatus" DEFAULT 'pending'::public."TransactionStatus",
    recipient_mobile text,
    currency_type public."CurrencyType" DEFAULT 'ngn'::public."CurrencyType",
    payment_method public."PaymentMethod" DEFAULT 'paystack'::public."PaymentMethod",
    fee double precision DEFAULT 0.0,
    transaction_number text,
    transaction_reference text,
    session_id text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    balance_after double precision DEFAULT 0 NOT NULL,
    balance_before double precision DEFAULT 0 NOT NULL,
    authorization_url text,
    credit_debit public."CreditDebit"
);


ALTER TABLE public."TransactionHistory" OWNER TO postgres;

--
-- Name: TransactionIcon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TransactionIcon" (
    id text NOT NULL,
    transaction_id text NOT NULL,
    secure_url text NOT NULL,
    public_id text NOT NULL
);


ALTER TABLE public."TransactionIcon" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    first_name text,
    last_name text,
    email text NOT NULL,
    hash text,
    phone_number text,
    password text,
    otp text,
    otp_expires_at timestamp(3) without time zone,
    role public."Role" DEFAULT 'user'::public."Role",
    gender public."Gender",
    date_of_birth timestamp(3) without time zone,
    is_email_verified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cardholder_id text,
    "fourDigitPin" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Wallet; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Wallet" (
    id text NOT NULL,
    user_id text NOT NULL,
    current_balance double precision DEFAULT 0 NOT NULL,
    all_time_fuunding double precision DEFAULT 0 NOT NULL,
    all_time_withdrawn double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Wallet" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: Bookmark id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Bookmark" ALTER COLUMN id SET DEFAULT nextval('public."Bookmark_id_seq"'::regclass);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Account" (id, user_id, account_number, "accountType", currency, bank_name, bank_code, balance, "isActive", "createdAt", "updatedAt", flutterwave_id, meta_data, order_ref, reference, account_name, country, iban, routing_number, sort_code, swift_code) FROM stdin;
d8cd3ce6-6add-43ab-be0f-78181e28b7b7	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0067100155	savings	ngn	Mock Bank	\N	0	t	2025-04-18 12:34:12.934	2025-04-18 12:34:12.934	\N	{"note": "Mock note", "amount": "0.00", "flw_ref": "MockFLWRef-1744979653193", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744979652730_243735", "created_at": "2025-04-18 12:34:13 PM", "expiry_date": "N/A", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	URF_1744979652730_243735	\N	Maximus Danny	nigeria	\N	\N	\N	\N
fc270879-54a7-47dc-a5e8-93aad4cb3497	0bef0fa5-9f55-4b01-a15a-db9defeb6037	0067100155	savings	ngn	Mock Bank	\N	0	t	2025-04-18 21:53:30.57	2025-04-18 21:53:30.57	\N	{"note": "Mock note", "amount": "0.00", "flw_ref": "MockFLWRef-1745013211084", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1745013210732_6550635", "created_at": "2025-04-18 9:53:31 PM", "expiry_date": "N/A", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	URF_1745013210732_6550635	\N	Maximus Bernard	nigeria	\N	\N	\N	\N
\.


--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Address" (id, "userId", city, state, country, home_address, house_number, postal_code) FROM stdin;
826209ec-a189-452b-8f70-91a0ae4a79cb	70b59c24-d647-480a-a9a9-d7ea570d9d9c	San Francisco	California	United States	123 Main St	\N	\N
8c086a31-5c14-403c-94da-be69f01a9432	e990f812-0b1a-452d-a342-f0133f3e4882	San Francisco	California	United States	123 Main St	\N	\N
aad34dc2-8705-4b0e-b3bb-b01da47e8124	0bef0fa5-9f55-4b01-a15a-db9defeb6037	Ibadan	Oyo	Nigeria	16, Jeircho GRA, Ibadan, Oyo State	16	10001
7e308647-10f9-4515-9ff3-27b377c9f954	368c3d88-c8e4-41c7-b960-1c5e98f898d6	ile-ife	Osun state	Nigeria	Iloromu quarters	\N	\N
\.


--
-- Data for Name: Bookmark; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Bookmark" (id, "createdAt", "updatedAt", title, description, link) FROM stdin;
\.


--
-- Data for Name: Card; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Card" (id, user_id, bridge_card_id, masked_pan, expiry_month, expiry_year, status, is_active, metadata, "createdAt", balance_after, balance_before, card_brand, card_currency, card_last4, card_name, current_balance, "updatedAt", card_type, first_funding_amount, card_limit, transaction_reference, bridge_cardholder_id) FROM stdin;
45ef5e61-1152-4712-ae09-d554a7d11781	0bef0fa5-9f55-4b01-a15a-db9defeb6037	532c726fcb024b81ae95d0298851502d	\N	\N	\N	\N	t	{"card_id": "4dc0904c17ae48919b1364ab6a5ebfcf", "currency": "NGN"}	2025-04-08 00:12:34.2	\N	\N	Mastercard	NGN	\N	\N	700000	2025-04-18 19:41:11.851	virtual	700000	1000000	card-creation-1744071154199	532c726fcb024b81ae95d0298851502d
08b5139c-7cd9-4e0c-8256-c0540c22621b	0bef0fa5-9f55-4b01-a15a-db9defeb6037	532c726fcb024b81ae95d0298851502d	\N	\N	\N	\N	t	{"card_id": "1a4fd796b78148c5b7625444d661e9cd", "currency": "USD"}	2025-04-07 22:31:40.554	\N	\N	Mastercard	USD	\N	\N	356000	2025-04-18 22:28:34.667	virtual	700000	1000000	card-creation-1744065100553	532c726fcb024b81ae95d0298851502d
\.


--
-- Data for Name: FlwTempAcctNumber; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FlwTempAcctNumber" (id, response_code, flw_ref, order_ref, account_number, "accountStatus", bank_name, note, amount, created_at, updated_at, user_id, order_no, status, meta_data, frequency) FROM stdin;
a0ef61e2-bc32-4141-9b86-f8dbcf482e1e	\N	MockFLWRef-1744671925381	\N	0067100155	\N	Mock Bank	\N	2000	2025-04-14 23:05:25.103	2025-04-14 23:05:25.103	0bef0fa5-9f55-4b01-a15a-db9defeb6037	URF_1744671925064_7631235	pending	{"note": "Mock note", "amount": "2000.00", "flw_ref": "MockFLWRef-1744671925381", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744671925064_7631235", "created_at": "2025-04-14 11:05:25 PM", "expiry_date": "2025-04-15 12:05:25 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	\N
d6b4ba8b-dade-44f6-b7f6-efd013260031	02	MockFLWRef-1744672188960	URF_1744672188710_3460335	0067100155	\N	Mock Bank	\N	2000	2025-04-14 23:09:48.672	2025-04-14 23:09:48.672	0bef0fa5-9f55-4b01-a15a-db9defeb6037	URF_1744672188710_3460335	pending	{"note": "Mock note", "amount": "2000.00", "flw_ref": "MockFLWRef-1744672188960", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744672188710_3460335", "created_at": "2025-04-14 11:09:48 PM", "expiry_date": "2025-04-15 12:09:48 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	\N
9c106c69-fa8b-4a56-bdd7-06248a2a08c3	02	MockFLWRef-1744672302571	URF_1744672302292_3977135	0067100155	\N	Mock Bank	Mock note	3000	2025-04-14 23:11:42.289	2025-04-14 23:11:42.289	0bef0fa5-9f55-4b01-a15a-db9defeb6037	URF_1744672302292_3977135	pending	{"note": "Mock note", "amount": "3000.00", "flw_ref": "MockFLWRef-1744672302571", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744672302292_3977135", "created_at": "2025-04-14 11:11:42 PM", "expiry_date": "2025-04-15 12:11:42 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
8d7a76cd-1ab1-4477-8bf9-2483b4e3fcec	02	MockFLWRef-1744672357058	URF_1744672356768_1737635	0067100155	\N	Mock Bank	Mock note	4000	2025-04-14 23:12:36.842	2025-04-14 23:12:36.842	0bef0fa5-9f55-4b01-a15a-db9defeb6037	URF_1744672356768_1737635	pending	{"note": "Mock note", "amount": "4000.00", "flw_ref": "MockFLWRef-1744672357058", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744672356768_1737635", "created_at": "2025-04-14 11:12:37 PM", "expiry_date": "2025-04-15 12:12:37 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
c67252a9-63a3-4f61-9f79-7f111ff7e437	02	MockFLWRef-1744672416905	URF_1744672416164_3084335	0067100155	active	Mock Bank	Mock note	4000	2025-04-14 23:13:36.629	2025-04-14 23:13:36.629	0bef0fa5-9f55-4b01-a15a-db9defeb6037	URF_1744672416164_3084335	pending	{"note": "Mock note", "amount": "4000.00", "flw_ref": "MockFLWRef-1744672416905", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744672416164_3084335", "created_at": "2025-04-14 11:13:36 PM", "expiry_date": "2025-04-15 12:13:36 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
fc15a93e-5b47-4019-b7b3-131af54c5f30	02	MockFLWRef-1744675972655	URF_1744675972330_8033435	0067100155	active	Mock Bank	Mock note	10000	2025-04-15 00:12:52.36	2025-04-15 00:12:52.36	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744675972330_8033435	pending	{"note": "Mock note", "amount": "10000.00", "flw_ref": "MockFLWRef-1744675972655", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744675972330_8033435", "created_at": "2025-04-15 12:12:52 AM", "expiry_date": "2025-04-15 1:12:52 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
9b0e325e-deaa-4996-a18d-085c326dcd21	02	MockFLWRef-1744676610853	URF_1744676610505_351835	0067100155	active	Mock Bank	Mock note	600	2025-04-15 00:23:30.538	2025-04-15 00:23:30.538	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744676610505_351835	pending	{"note": "Mock note", "amount": "600.00", "flw_ref": "MockFLWRef-1744676610853", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744676610505_351835", "created_at": "2025-04-15 12:23:30 AM", "expiry_date": "2025-04-15 1:23:30 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
1672710c-b60a-49be-8f98-b9733efea72b	02	MockFLWRef-1744676650465	URF_1744676650154_8516035	0067100155	active	Mock Bank	Mock note	800	2025-04-15 00:24:10.127	2025-04-15 00:24:10.127	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744676650154_8516035	pending	{"note": "Mock note", "amount": "800.00", "flw_ref": "MockFLWRef-1744676650465", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744676650154_8516035", "created_at": "2025-04-15 12:24:10 AM", "expiry_date": "2025-04-15 1:24:10 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
bb915292-12aa-4b26-a39e-52cd16c97dc7	02	MockFLWRef-1744676748897	URF_1744676748648_7657635	0067100155	active	Mock Bank	Mock note	500	2025-04-15 00:25:48.624	2025-04-15 00:25:48.624	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744676748648_7657635	pending	{"note": "Mock note", "amount": "500.00", "flw_ref": "MockFLWRef-1744676748897", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744676748648_7657635", "created_at": "2025-04-15 12:25:48 AM", "expiry_date": "2025-04-15 1:25:48 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
e6fd34e9-7553-487c-b188-1579c9e2a716	02	MockFLWRef-1744676946123	URF_1744676945843_4856735	0067100155	active	Mock Bank	Mock note	5000	2025-04-15 00:29:05.992	2025-04-15 00:29:05.992	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744676945843_4856735	pending	{"note": "Mock note", "amount": "5000.00", "flw_ref": "MockFLWRef-1744676946123", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744676945843_4856735", "created_at": "2025-04-15 12:29:06 AM", "expiry_date": "2025-04-15 1:29:06 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
ee0d1083-6359-4533-b755-4ba16ebed8e3	02	MockFLWRef-1744676962771	URF_1744676962296_2446935	0067100155	active	Mock Bank	Mock note	50000	2025-04-15 00:29:22.732	2025-04-15 00:29:22.732	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744676962296_2446935	pending	{"note": "Mock note", "amount": "50000.00", "flw_ref": "MockFLWRef-1744676962771", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744676962296_2446935", "created_at": "2025-04-15 12:29:22 AM", "expiry_date": "2025-04-15 1:29:22 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
219255c6-700e-49ff-b6ed-15269cb9e8f1	02	MockFLWRef-1744677283387	URF_1744677283079_5836035	0067100155	active	Mock Bank	Mock note	1000	2025-04-15 00:34:43.221	2025-04-15 00:34:43.221	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744677283079_5836035	pending	{"note": "Mock note", "amount": "1000.00", "flw_ref": "MockFLWRef-1744677283387", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744677283079_5836035", "created_at": "2025-04-15 12:34:43 AM", "expiry_date": "2025-04-15 1:34:43 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
3e6969e8-38c8-4bc4-bc2e-b34ed03adcb9	02	MockFLWRef-1744677412012	URF_1744677411645_1390335	0067100155	active	Mock Bank	Mock note	4500	2025-04-15 00:36:51.846	2025-04-15 00:36:51.846	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744677411645_1390335	pending	{"note": "Mock note", "amount": "4500.00", "flw_ref": "MockFLWRef-1744677412012", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744677411645_1390335", "created_at": "2025-04-15 12:36:52 AM", "expiry_date": "2025-04-15 1:36:52 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
2df6474e-0ffa-48af-be70-e486ae023769	02	MockFLWRef-1744677576137	URF_1744677575836_7562735	0067100155	active	Mock Bank	Mock note	500	2025-04-15 00:39:36.048	2025-04-15 00:39:36.048	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744677575836_7562735	pending	{"note": "Mock note", "amount": "500.00", "flw_ref": "MockFLWRef-1744677576137", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744677575836_7562735", "created_at": "2025-04-15 12:39:36 AM", "expiry_date": "2025-04-15 1:39:36 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
18c67722-f653-4c80-aded-395b2d04e55a	02	MockFLWRef-1744677594273	URF_1744677593967_573835	0067100155	active	Mock Bank	Mock note	4300	2025-04-15 00:39:54.137	2025-04-15 00:39:54.137	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744677593967_573835	pending	{"note": "Mock note", "amount": "4300.00", "flw_ref": "MockFLWRef-1744677594273", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744677593967_573835", "created_at": "2025-04-15 12:39:54 AM", "expiry_date": "2025-04-15 1:39:54 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
f43546fa-2bbc-47f5-912e-f8e773a774d7	02	MockFLWRef-1744678198072	URF_1744678197763_6545835	0067100155	active	Mock Bank	Mock note	7000	2025-04-15 00:49:58.045	2025-04-15 00:49:58.045	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678197763_6545835	pending	{"note": "Mock note", "amount": "7000.00", "flw_ref": "MockFLWRef-1744678198072", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678197763_6545835", "created_at": "2025-04-15 12:49:58 AM", "expiry_date": "2025-04-15 1:49:58 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
35b29787-701f-44c0-a4d0-435a372ae0fa	02	MockFLWRef-1744678240928	URF_1744678240650_5652835	0067100155	active	Mock Bank	Mock note	7000	2025-04-15 00:50:40.849	2025-04-15 00:50:40.849	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678240650_5652835	pending	{"note": "Mock note", "amount": "7000.00", "flw_ref": "MockFLWRef-1744678240928", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678240650_5652835", "created_at": "2025-04-15 12:50:40 AM", "expiry_date": "2025-04-15 1:50:40 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
1440a0e6-dfb5-4773-8e93-2c628f815554	02	MockFLWRef-1744678297591	URF_1744678297176_1517335	0067100155	active	Mock Bank	Mock note	300	2025-04-15 00:51:37.582	2025-04-15 00:51:37.582	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678297176_1517335	pending	{"note": "Mock note", "amount": "300.00", "flw_ref": "MockFLWRef-1744678297591", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678297176_1517335", "created_at": "2025-04-15 12:51:37 AM", "expiry_date": "2025-04-15 1:51:37 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
eaa1c212-ae54-4e76-8259-63926065fa8b	02	MockFLWRef-1744678420075	URF_1744678419824_3335235	0067100155	active	Mock Bank	Mock note	500	2025-04-15 00:53:39.99	2025-04-15 00:53:39.99	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678419824_3335235	pending	{"note": "Mock note", "amount": "500.00", "flw_ref": "MockFLWRef-1744678420075", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678419824_3335235", "created_at": "2025-04-15 12:53:40 AM", "expiry_date": "2025-04-15 1:53:40 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
1d5b3e34-e63c-48b5-837c-6a59ada93423	02	MockFLWRef-1744678614496	URF_1744678613929_383035	0067100155	active	Mock Bank	Mock note	400	2025-04-15 00:56:54.519	2025-04-15 00:56:54.519	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678613929_383035	pending	{"note": "Mock note", "amount": "400.00", "flw_ref": "MockFLWRef-1744678614496", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678613929_383035", "created_at": "2025-04-15 12:56:54 AM", "expiry_date": "2025-04-15 1:56:54 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
fc3bc216-b71a-49b4-8b06-46437aade57e	02	MockFLWRef-1744678897489	URF_1744678897240_7690135	0067100155	active	Mock Bank	Mock note	5400	2025-04-15 01:01:37.441	2025-04-15 01:01:37.441	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678897240_7690135	pending	{"note": "Mock note", "amount": "5400.00", "flw_ref": "MockFLWRef-1744678897489", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678897240_7690135", "created_at": "2025-04-15 1:01:37 AM", "expiry_date": "2025-04-15 2:01:37 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
038d8aad-ab2d-4068-8286-e306fc36b499	02	MockFLWRef-1744678919056	URF_1744678918620_6521335	0067100155	active	Mock Bank	Mock note	500	2025-04-15 01:01:59.137	2025-04-15 01:01:59.137	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678918620_6521335	pending	{"note": "Mock note", "amount": "500.00", "flw_ref": "MockFLWRef-1744678919056", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678918620_6521335", "created_at": "2025-04-15 1:01:59 AM", "expiry_date": "2025-04-15 2:01:59 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
9c8d7635-e3b3-420e-949b-7ec51548361c	02	MockFLWRef-1744678955283	URF_1744678954873_7829635	0067100155	active	Mock Bank	Mock note	500	2025-04-15 01:02:35.194	2025-04-15 01:02:35.194	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678954873_7829635	pending	{"note": "Mock note", "amount": "500.00", "flw_ref": "MockFLWRef-1744678955283", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678954873_7829635", "created_at": "2025-04-15 1:02:35 AM", "expiry_date": "2025-04-15 2:02:35 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
83007ca1-0083-45ec-b94e-dda8388f22f5	02	MockFLWRef-1744678970097	URF_1744678969719_7086235	0067100155	active	Mock Bank	Mock note	450	2025-04-15 01:02:50.166	2025-04-15 01:02:50.166	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744678969719_7086235	pending	{"note": "Mock note", "amount": "450.00", "flw_ref": "MockFLWRef-1744678970097", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744678969719_7086235", "created_at": "2025-04-15 1:02:50 AM", "expiry_date": "2025-04-15 2:02:50 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
ae95d0bd-037b-403c-ad1f-c617c0dd7ea6	02	MockFLWRef-1744679198126	URF_1744679197876_1002235	0067100155	active	Mock Bank	Mock note	6000	2025-04-15 01:06:38.131	2025-04-15 01:06:38.131	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744679197876_1002235	pending	{"note": "Mock note", "amount": "6000.00", "flw_ref": "MockFLWRef-1744679198126", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744679197876_1002235", "created_at": "2025-04-15 1:06:38 AM", "expiry_date": "2025-04-15 2:06:38 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
6d251af0-47bd-4b51-955c-58637c49cfac	02	MockFLWRef-1744679215641	URF_1744679215341_4576735	0067100155	active	Mock Bank	Mock note	5000	2025-04-15 01:06:55.612	2025-04-15 01:06:55.612	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744679215341_4576735	pending	{"note": "Mock note", "amount": "5000.00", "flw_ref": "MockFLWRef-1744679215641", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744679215341_4576735", "created_at": "2025-04-15 1:06:55 AM", "expiry_date": "2025-04-15 2:06:55 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
54d258e9-40f1-410c-8eeb-54539898b573	02	MockFLWRef-1744679273374	URF_1744679273005_4728935	0067100155	active	Mock Bank	Mock note	1000	2025-04-15 01:07:53.292	2025-04-15 01:07:53.292	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744679273005_4728935	pending	{"note": "Mock note", "amount": "1000.00", "flw_ref": "MockFLWRef-1744679273374", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744679273005_4728935", "created_at": "2025-04-15 1:07:53 AM", "expiry_date": "2025-04-15 2:07:53 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
9e4ccf35-ae49-40b9-9601-3c7032e6edb8	02	MockFLWRef-1744885775000	URF_1744885774684_2922535	0067100155	active	Mock Bank	Mock note	4300	2025-04-17 10:29:34.967	2025-04-17 10:29:34.967	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744885774684_2922535	pending	{"note": "Mock note", "amount": "4300.00", "flw_ref": "MockFLWRef-1744885775000", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744885774684_2922535", "created_at": "2025-04-17 10:29:35 AM", "expiry_date": "2025-04-17 11:29:35 AM", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
d7f110ba-2a09-4bfd-aa81-c40bab8ef3a8	02	MockFLWRef-1744977935327	URF_1744977935015_7874835	0067100155	active	Mock Bank	Mock note	0	2025-04-18 12:05:34.904	2025-04-18 12:05:34.904	70b59c24-d647-480a-a9a9-d7ea570d9d9c	URF_1744977935015_7874835	pending	{"note": "Mock note", "amount": "0.00", "flw_ref": "MockFLWRef-1744977935327", "bank_name": "Mock Bank", "frequency": 1, "order_ref": "URF_1744977935015_7874835", "created_at": "2025-04-18 12:05:35 PM", "expiry_date": "N/A", "response_code": "02", "account_number": "0067100155", "account_status": "active", "response_message": "Transaction in progress"}	1
\.


--
-- Data for Name: KycVerification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."KycVerification" (id, "userId", is_verified, id_no, id_type, status) FROM stdin;
65c705bd-89ed-43ed-bfa7-02d46a56f8ec	0bef0fa5-9f55-4b01-a15a-db9defeb6037	t	12345678909	NIGERIAN_BVN_VERIFICATION	approved
9d555c63-beee-4993-970b-cf0b55e39607	70b59c24-d647-480a-a9a9-d7ea570d9d9c	t	23427834639	NIGERIAN_BVN_VERIFICATION	approved
\.


--
-- Data for Name: ProfileImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProfileImage" (id, "userId", secure_url, public_id) FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: SenderDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SenderDetails" (id, transaction_id, sender_name, sender_bank, sender_account_number) FROM stdin;
bc5aece0-bb38-497e-963b-30f4407ffe2c	43fe4177-3ec4-4497-844c-7312f3c54022			
adb76677-2110-4310-b015-1bf2a81917d2	f8c4ae7b-2c30-4262-9581-1df9f2f3fc85			
b877eebb-3d3a-4ada-b77d-df70fcaba4bd	a4854e2d-3d5b-4988-9c96-b504087295fe			
f52775b8-6507-4f02-b2ac-44ad12f40114	f5798ce8-10b5-4312-a6f1-24ffa8e4701c			
9b7dd94b-6160-4ad2-88b4-9e6f05b93459	66929e3e-bd63-440d-8ace-735e2d9e8902			
869aac7e-2258-489e-ad27-8d614831f0d4	4fc49a1e-adc5-4c47-b07e-2ec41aba6434			
c8e8cfb0-e35e-485a-b2d7-47c84fadd842	be9e5bb2-f095-4927-81e2-d1a492d87453			
c9bf3ad2-7fab-4eb8-ae0d-275e72e2b021	d1e2dac4-d82f-49db-8ef8-86c06f96bf3f			
f4c44633-33d9-4632-a856-54824e9b7de9	ec2b19de-eef8-4347-a0ce-c8ea307062a5			
ed1e5de4-99f6-47bd-a336-2523ec58095a	c9af2975-0303-4623-b4ed-cdfc341a5090			
d2ca72b5-81ae-4508-a077-5842e2ecc45f	2fb7c78c-9c1c-4921-b8e2-01c29c8f9b03			
c7e1fa8e-e7ad-411d-acbb-3793bcb50845	a8e27330-2165-4ac4-800b-a5034be67278			
48e209a6-eea9-449c-9b66-69504ddee393	8dd990bb-4a05-4307-a615-f1c2a56025c4			
3e655bed-8918-40a0-96a0-99670dc7ad78	6edbcef9-b81b-4f82-a41b-328c52706a0c			
79c2f32b-af97-437d-9a78-7a90719a87c0	612b9020-d760-4d4d-964f-f0229a60a6e9			
91d64982-478b-4f17-b383-b435d750a320	910c8664-24f8-497e-9ab2-454ce066cce5			
4b5f4bea-afb0-40c8-8334-1da53af5bfca	6b9fe939-4def-454d-8076-f65a43309740			
b3c7a70f-dd78-434d-9683-1121f3ca0e2c	c1ac2014-5c1a-4f45-bbd3-c5b679d13b8e			
253585fa-3239-48c0-981c-fd20b9b3988e	c3199521-bb56-4555-9377-04f4975a3490			
96caa60e-c382-4d43-88a2-08c5ccc5f741	e51c9842-a002-4173-b7e8-3e4d4bf09f92			
3ceffb93-cb9e-4f7a-b659-e04b392cc07f	5bce8ffa-b7ac-48e5-a7a7-279f09391ec8			
ef41f0dc-83b5-412c-8276-d2fd3a18df7a	f113cba2-ba2b-45cd-89fa-d5a2a426a480			
136bae79-a703-4c84-87ba-ec1f8bcc258a	cdb5d170-d7c3-45bb-a18f-0f5567dca4e3			
65386c55-6685-4be8-80ca-8f822b75f8d8	79192690-c658-4236-a60f-08c9dde123c7			
6ec67cdb-4d50-4430-996a-112d128e3354	60a13033-965c-43e4-a753-575b079d1544			
d31385f9-c545-465c-ab12-7d2510efa1c6	d2cb412e-9054-4b23-9542-b7a1fb4bf3a1			
850e12a7-59d5-497a-b584-a7af86eaf5e2	d08cfed6-9fea-4bee-8645-b55940325d0c			
6a2081da-5b37-45e0-a3c5-c518a069dc1a	47391bfe-9d76-4160-826d-099903f684ce			
b06f4456-a436-43e8-ad52-d13a55aad201	d18e3169-dc77-462b-8aa6-d04283f0bf5a			
5f8bb238-5850-43f3-a2c9-dfc454469c8c	ea8af93c-1d83-401f-97c8-aa06309a9611			
6393f135-be76-4680-9039-0f34c1452cdc	c1f494c1-cdc9-45b0-a097-2a6aa574cb9d			
79c1811f-7338-4a30-9e1d-fa5f6a19ed12	c30f2a11-e577-4e57-bed8-4a963208a090			
cd25f1db-19a1-4699-adc4-b0705945a915	cd43dd7b-e484-4d26-ab97-f50a3cf55d17			
4d55d306-ecbd-4eea-8d16-434e2f609506	d0b2b9d6-cbae-49bc-88d3-34eb71f0eea5			
e3565afa-ca08-4f56-8f99-083da3cda96c	6f8264fc-cf9f-470b-9a08-57a1ffd32bac			
a5705d03-7539-4147-bc15-1f38948ad8f1	0115acb8-e391-481a-b81a-28c7283620b1			
601492e6-cf1e-4bda-8dfb-50974f1eb550	d23b81c5-9253-4953-84a6-2cd45e670f9a			
fe219104-ed31-4d14-a148-60dc4e3ae561	97983991-3243-4967-9b53-e5f1577a3534			
9b9c2460-0e75-4db0-abe5-66068ad1bbf5	406d3ca7-6d04-408b-8e9b-378b77ca6dd9			
99ea9085-dc8c-4ac3-b702-9bae281542f1	616045e2-a306-409a-a021-7f15a5a7625f			
e117e570-e38e-4429-b7a3-f6999e260af1	af1bd5df-de43-45f5-a304-84d22a3fc702			
5e875a27-027f-4ad0-af36-0d72a93e56c6	a0ec2cd0-40de-483f-bb7a-a79dd96563ac			
0a4f52f1-5b97-4b14-8574-2c260d72cf6c	7b792890-a30c-4fa5-9fdd-3b7904b25493			
01ec851b-61ef-4477-adad-a9f0d0eb7d8f	dd5d7534-d03a-4f36-9abd-01bdef31b499			
b1a8d1e9-410c-4e1e-a08d-89ac3a0de8e3	e4b106f5-e490-4b4e-b5b0-3b0f3a11f6e7			
67a586a4-74a6-48d4-87ee-055ecb92d808	32cacd5d-e848-4e8d-a0bd-587da058f539			
61947217-ec43-4e43-ad38-0a69ae77fa85	24c4ea71-c670-4f54-a191-034f7813b162			
772af658-0639-49a7-b3d7-66320e1b05c8	55cab52f-13d7-4eec-a63b-8d7ea236b561			
97b609c8-22f2-4254-a149-1b8eb08e7d9c	711680df-3b68-42ac-b8b2-e5534d30eafe			
b63cb6a5-f275-4de0-adff-79c7a380049c	0d1dba05-0562-4d20-84dc-e9794a4dc29a			
f5ec5393-48b6-460c-aeb8-6ecab06c3abb	c4126b2e-a561-4d6d-9218-0bf044dc2e45			
dbe47e67-7f2f-433d-86b4-5db4d7677ef3	724379bf-4e20-4677-b793-d58cbc9abb9c			
00bebd4c-9dbe-441d-a2a5-3bda907092cf	b570100a-1677-469e-9e1f-f2d647f74736			
593b5850-0e32-4c50-9bb0-ff87c79f8520	c75f7515-e6d4-4993-bd4a-26fff312cc11			
665acacd-7de6-4cea-a4e7-0eea0a5d6967	566f1880-b468-4418-bbac-2fabd029070b			
d2c3cf4b-7947-457a-afaf-d86919123f21	d51f3165-324f-43f2-ba7f-54d88b127e7d			
d211b3e2-4545-43d5-987f-ad418a48a893	77fa2b13-7af4-41f3-9018-9c309ccb6869			
ebe1901a-43ed-4292-a1f5-86754db09b01	c6539217-1227-41b9-876e-d6757c87c106			
1bb9047c-01df-4039-bcec-3463982d2a74	3e06ea3c-6417-4e1b-88ae-330f88619a74			
4598fde1-695f-4b2d-bbad-cf79db2ee39b	5710824b-db18-423a-83f4-5fa2d51ab795			
64d2cd33-6a5d-418c-a20f-41abe4e91b5f	773eb43a-3814-4f6a-b049-fc268bf32c9b			
90c18cfb-9942-4901-8c43-8bf88bf23eff	63428ff7-dd6b-401c-966f-afcc415788b9			
46791e2b-eb52-42b8-b4dc-c355f0d7dbd9	f4254aa4-b2de-435f-b5ba-dc44d3338dfb			
940fe259-a75b-4ca4-b5c3-4dd7ca370514	aa1a3a35-c060-4097-97c3-0d04df54b8c8			
5daa5a83-14c7-41a0-b32e-9d227a06382a	dbd0bbe2-e0b2-429f-823c-26585f9af54c			
e9e01653-1229-41db-86bd-09d1b60f4fb8	c42ec36f-96e5-433a-8106-795e75af57f9			
2d657d9d-5630-4e2c-8cf6-20170b94e4dc	4892167d-7493-4675-a2b5-ff3728c0bd29			
7f80141f-3c97-4212-b296-81705266b9fc	59022716-be16-466c-9814-63f5255ae5d1			
cea7c4a1-8c0c-44bf-959d-c51280fa6ce9	5661ff22-3285-4d20-8d38-931a22fb5a22			
e50bf8d1-e338-405f-94da-d577c7beadce	a83336f4-b6ac-44df-807a-3b9e0cacb9eb			
\.


--
-- Data for Name: TransactionHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransactionHistory" (id, account_id, user_id, amount, transaction_type, description, status, recipient_mobile, currency_type, payment_method, fee, transaction_number, transaction_reference, session_id, "createdAt", "updatedAt", balance_after, balance_before, authorization_url, credit_debit) FROM stdin;
54e74dd0-708f-4862-950f-04acf13ada7a	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	3200	airtime	MTN	success	07031921732	ngn	wallet	0	\N	gift_bill-2025-04-05-0-54-21-104-7c9ceb	\N	2025-04-05 23:54:21.932	2025-04-05 23:54:21.933	0	0	\N	\N
61c1a0b8-c353-4178-b8bb-e41471d02c26	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1300	airtime	MTN	success	07031921732	ngn	wallet	0	\N	gift_bill-2025-04-06-2-18-27-50-994812	\N	2025-04-06 01:18:29.211	2025-04-06 01:18:29.212	0	0	\N	\N
6d2fba03-1e0e-4063-bf9d-89e1eb9d9251	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	700	airtime	MTN	success	08246694787	ngn	wallet	0	\N	gift_bill-2025-04-06-11-25-41-87-177987	\N	2025-04-06 10:25:42.322	2025-04-06 10:25:42.322	0	0	\N	\N
60a5da82-c30c-46c4-a601-50e8851457c1	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	100	airtime	AIRTEL	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-06-15-42-3-254-7bd46c	\N	2025-04-06 14:42:04.015	2025-04-06 14:42:04.017	0	0	\N	\N
acbc17fb-86e4-4840-a60c-417bd586e554	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-06-19-17-47-295-c333f1	\N	2025-04-06 18:17:47.979	2025-04-06 18:17:47.979	0	0	\N	\N
c0e32c08-685c-4d8b-9899-720fc77034cb	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	228	gift_bill-2025-04-07-10-42-36-988-90b054	sess-id-2025-04-07-10-42-38-38-874f59	2025-04-07 09:42:38.039	2025-04-07 09:42:38.039	0	0	\N	\N
f9f77903-4ed8-4c18-a7f4-629c59932f57	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	900	data	Data top-up	success	08146694787	ngn	wallet	0	228	gift_bill-2025-04-07-11-48-0-641-dd41d3	sess-id-2025-04-07-11-48-1-831-650f3e	2025-04-07 10:48:01.832	2025-04-07 10:48:01.832	0	0	\N	\N
c96308b0-a889-4c81-b6fd-16d355d9817e	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	6400	data	Data top-up	success	08146694787	ngn	wallet	0	237	gift_bill-2025-04-07-15-38-28-922-3f036f	sess-id-2025-04-07-15-38-29-887-40c4fc	2025-04-07 14:38:29.888	2025-04-07 14:38:29.888	0	0	\N	\N
d950fcae-9636-46be-9321-7da049d43363	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	500	airtime	AIRTEL	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-09-11-44-10-918-54bd6d	\N	2025-04-09 10:44:11.796	2025-04-09 10:44:11.798	0	0	\N	\N
4fc49a1e-adc5-4c47-b07e-2ec41aba6434	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	90000	deposit	wallet funding	pending	\N	ngn	paystack	10	o5hj6hslfqv045x	jfd0tr2oku	sess-id-2025-04-06-20-2-57-458-eb416e	2025-04-06 19:02:57.459	2025-04-09 11:08:03.515	0	0	\N	\N
43fe4177-3ec4-4497-844c-7312f3c54022	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	81000	deposit	wallet funding	success	\N	ngn	paystack	10	pavgn42pzvfllg1	rtvd4zrs1p	sess-id-2025-04-05-0-24-34-121-a841d7	2025-04-05 23:24:34.122	2025-04-09 11:08:03.515	0	0	\N	\N
2fb7c78c-9c1c-4921-b8e2-01c29c8f9b03	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	500	deposit	wallet funding	pending	\N	ngn	paystack	10	i485abdsx8gpf0j	ghxsq1gajt	sess-id-2025-04-09-11-44-47-564-a41c28	2025-04-09 10:44:47.565	2025-04-09 11:08:03.515	0	0	\N	\N
612b9020-d760-4d4d-964f-f0229a60a6e9	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	100000	deposit	wallet funding	success	\N	ngn	paystack	10	szxb1uov3o8n9bx	cptp6z30as	sess-id-2025-04-09-11-55-52-591-42552e	2025-04-09 10:55:52.592	2025-04-09 11:08:03.515	0	0	\N	\N
66929e3e-bd63-440d-8ace-735e2d9e8902	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	8000	deposit	wallet funding	pending	\N	ngn	paystack	10	a8ecg55b000ir6g	w6b8xumrwd	sess-id-2025-04-06-19-20-6-567-655a7e	2025-04-06 18:20:06.568	2025-04-09 11:08:03.515	0	0	\N	\N
6edbcef9-b81b-4f82-a41b-328c52706a0c	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	50000	deposit	wallet funding	success	\N	ngn	paystack	10	xddwtvchgh1myof	iflrbzoicj	sess-id-2025-04-09-11-52-58-442-2a45ab	2025-04-09 10:52:58.443	2025-04-09 11:08:03.515	0	0	\N	\N
8dd990bb-4a05-4307-a615-f1c2a56025c4	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	100000	deposit	wallet funding	success	\N	ngn	paystack	10	ytsbpl6o7in8xb7	dkj1bnlg43	sess-id-2025-04-09-11-51-0-808-d5016c	2025-04-09 10:51:00.808	2025-04-09 11:08:03.515	0	0	\N	\N
910c8664-24f8-497e-9ab2-454ce066cce5	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	90000	deposit	wallet funding	success	\N	ngn	paystack	10	bm2r8vimq7cqi8l	lfqrehflow	sess-id-2025-04-09-12-4-47-775-6257c7	2025-04-09 11:04:47.776	2025-04-09 11:08:03.515	0	0	\N	\N
a4854e2d-3d5b-4988-9c96-b504087295fe	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	150000	deposit	wallet funding	pending	\N	ngn	paystack	10	t817m5pmcdsde8t	ph8nref66o	sess-id-2025-04-06-15-40-35-233-082f55	2025-04-06 14:40:35.234	2025-04-09 11:08:03.515	0	0	\N	\N
a8e27330-2165-4ac4-800b-a5034be67278	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	10000	deposit	wallet funding	success	\N	ngn	paystack	10	u1lxv2bmj7rrwv8	rdeoiw54lk	sess-id-2025-04-09-11-50-40-417-1f5f6f	2025-04-09 10:50:40.418	2025-04-09 11:08:03.515	0	0	\N	\N
be9e5bb2-f095-4927-81e2-d1a492d87453	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1000	deposit	wallet funding	success	\N	ngn	paystack	10	0bsfx47xfmr77hg	4o14cjn0vl	sess-id-2025-04-06-20-37-8-746-489e38	2025-04-06 19:37:08.747	2025-04-09 11:08:03.515	0	0	\N	\N
c9af2975-0303-4623-b4ed-cdfc341a5090	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	90000	deposit	wallet funding	success	\N	ngn	paystack	10	f2vp5mmsd8z21o7	yoie71qv4s	sess-id-2025-04-07-15-21-55-212-b06d46	2025-04-07 14:21:55.213	2025-04-09 11:08:03.515	0	0	\N	\N
d1e2dac4-d82f-49db-8ef8-86c06f96bf3f	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1000	deposit	wallet funding	success	\N	ngn	paystack	10	3plby75mphefo6c	g3ab5sstoc	sess-id-2025-04-06-20-50-6-142-f77de6	2025-04-06 19:50:06.143	2025-04-09 11:08:03.515	0	0	\N	\N
ec2b19de-eef8-4347-a0ce-c8ea307062a5	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	50000	deposit	wallet funding	success	\N	ngn	paystack	10	2ikb5yhiuq3wkl4	qphzxad4qn	sess-id-2025-04-06-20-50-44-225-b55587	2025-04-06 19:50:44.226	2025-04-09 11:08:03.515	0	0	\N	\N
f5798ce8-10b5-4312-a6f1-24ffa8e4701c	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	148000	deposit	wallet funding	pending	\N	ngn	paystack	10	mbigiqnwncdi4g5	6ujcgqzsdz	sess-id-2025-04-06-19-16-23-448-0c8ce6	2025-04-06 18:16:23.449	2025-04-09 11:08:03.515	0	0	\N	\N
f8c4ae7b-2c30-4262-9581-1df9f2f3fc85	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	22000	deposit	wallet funding	success	\N	ngn	paystack	10	w7sawdb0few1k4d	v9tsuphjra	sess-id-2025-04-06-1-3-59-434-f101f5	2025-04-06 00:03:59.435	2025-04-09 11:08:03.515	0	0	\N	\N
6b9fe939-4def-454d-8076-f65a43309740	\N	368c3d88-c8e4-41c7-b960-1c5e98f898d6	1000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	yfxdo9ovclwhppp	zen330zku3	sess-id-2025-04-09-12-27-47-675-ae8f05	2025-04-09 11:27:47.676	2025-04-09 11:28:56.631	0	0	\N	\N
e6c0e928-3bb4-4360-910b-3c8107d19b07	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	3200	airtime	MTN	success	07031921732	ngn	wallet	0	\N	gift_bill-2025-04-09-15-49-20-277-cfeba4	\N	2025-04-09 14:49:21.537	2025-04-09 14:49:21.538	0	0	\N	\N
7fa0a93b-b1fe-4cba-acec-077135a16c3b	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	3200	airtime	MTN	success	07031921732	ngn	wallet	0	\N	gift_bill-2025-04-09-15-49-48-241-5c680e	\N	2025-04-09 14:49:48.917	2025-04-09 14:49:48.918	0	0	\N	\N
d9e8f541-d680-4785-b0c8-a9ba575c85cd	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	55000	airtime	AIRTEL	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-09-15-51-22-671-cc4916	\N	2025-04-09 14:51:23.312	2025-04-09 14:51:23.313	0	0	\N	\N
c1ac2014-5c1a-4f45-bbd3-c5b679d13b8e	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	urk1ecn8w0sf1nd	uoi57b096e	sess-id-2025-04-09-16-4-42-134-c0a01e	2025-04-09 15:04:42.135	2025-04-09 15:04:57.25	0	0	\N	\N
c3199521-bb56-4555-9377-04f4975a3490	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	35000	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	ebo78yd90u2kcr9	9qhcvs2o82	sess-id-2025-04-10-11-11-54-976-b0546f	2025-04-10 10:11:54.977	2025-04-10 10:11:54.977	0	0	\N	\N
e51c9842-a002-4173-b7e8-3e4d4bf09f92	\N	636d84a6-57f0-4bfb-815f-0726d59e0f7e	22000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	dq0xl0zomqosi2h	hbpn0mtarp	sess-id-2025-04-10-11-14-59-436-67d0b0	2025-04-10 10:14:59.437	2025-04-10 10:21:21.044	0	0	\N	\N
cdb5d170-d7c3-45bb-a18f-0f5567dca4e3	\N	b58dd734-0484-4e90-8a6f-15d7fbe8ccfc	5000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	6wwzh2g09wvuv1i	cei9mwcfp1	sess-id-2025-04-10-14-28-55-746-a725f6	2025-04-10 13:28:55.747	2025-04-10 13:29:15.204	0	0	https://checkout.paystack.com/6wwzh2g09wvuv1i	\N
5bce8ffa-b7ac-48e5-a7a7-279f09391ec8	\N	636d84a6-57f0-4bfb-815f-0726d59e0f7e	19400	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	tkqfwjagxj0bgej	eyxyinut50	sess-id-2025-04-10-12-26-24-675-974ede	2025-04-10 11:26:24.677	2025-04-10 11:30:48.344	0	0	https://checkout.paystack.com/tkqfwjagxj0bgej	\N
f113cba2-ba2b-45cd-89fa-d5a2a426a480	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	x5hethfco7n7q21	zwwwoj2oss	sess-id-2025-04-10-14-18-29-220-34c640	2025-04-10 13:18:29.221	2025-04-10 13:18:38.053	0	0	https://checkout.paystack.com/x5hethfco7n7q21	\N
b982f7e5-72ef-4b48-b9aa-eb2d65f24336	\N	b58dd734-0484-4e90-8a6f-15d7fbe8ccfc	500	airtime	AIRTEL	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-10-14-29-59-637-3aed19	\N	2025-04-10 13:30:01.227	2025-04-10 13:30:01.228	0	0	\N	\N
a451e230-9345-4fcd-9e2d-fd7e86aca270	fb61fbdb-6149-4060-849d-9703958e8355	b58dd734-0484-4e90-8a6f-15d7fbe8ccfc	1250	data	Data top-up	success	08146694787	ngn	wallet	0	227	gift_bill-2025-04-10-14-37-7-437-4258b2	sess-id-2025-04-10-14-37-8-497-9df710	2025-04-10 13:37:08.497	2025-04-10 13:37:08.497	0	0	\N	\N
79192690-c658-4236-a60f-08c9dde123c7	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	4999	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	1y8nitkv9yhrnj8	masrmejqve	sess-id-2025-04-13-12-55-4-272-f819d6	2025-04-13 11:55:04.273	2025-04-13 11:55:04.273	0	0	https://checkout.paystack.com/1y8nitkv9yhrnj8	\N
60a13033-965c-43e4-a753-575b079d1544	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	700	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	djj1yf3dcvi7lcb	6g50dg61kp	sess-id-2025-04-13-13-22-52-549-10e4cf	2025-04-13 12:22:52.549	2025-04-13 12:22:52.549	0	0	https://checkout.paystack.com/djj1yf3dcvi7lcb	\N
d2cb412e-9054-4b23-9542-b7a1fb4bf3a1	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	800	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	5gh5ns2fmt2osvz	1wyygfqjth	sess-id-2025-04-13-13-31-0-518-ccf34b	2025-04-13 12:31:00.519	2025-04-13 12:31:22.268	0	0	https://checkout.paystack.com/5gh5ns2fmt2osvz	\N
d08cfed6-9fea-4bee-8645-b55940325d0c	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	1100	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	w73hixi0xet5dc9	azmyjask3x	sess-id-2025-04-13-13-43-56-654-46fd14	2025-04-13 12:43:56.655	2025-04-13 12:44:31.709	0	0	https://checkout.paystack.com/w73hixi0xet5dc9	\N
47391bfe-9d76-4160-826d-099903f684ce	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	2400	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	p142ihppid8a9kc	exofepjadp	sess-id-2025-04-13-13-58-38-22-3d93f7	2025-04-13 12:58:38.023	2025-04-13 12:58:38.023	0	0	https://checkout.paystack.com/p142ihppid8a9kc	\N
d18e3169-dc77-462b-8aa6-d04283f0bf5a	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	950	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	rakstmmrbe7fhqk	8pesz1tfa6	sess-id-2025-04-13-14-2-3-57-ef39e8	2025-04-13 13:02:03.058	2025-04-13 13:02:31.84	0	0	https://checkout.paystack.com/rakstmmrbe7fhqk	\N
ea8af93c-1d83-401f-97c8-aa06309a9611	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	xzq8sjhzueslt1a	dy8r23ffrm	sess-id-2025-04-13-14-9-20-141-750159	2025-04-13 13:09:20.142	2025-04-13 13:09:20.142	0	0	https://checkout.paystack.com/xzq8sjhzueslt1a	\N
c1f494c1-cdc9-45b0-a097-2a6aa574cb9d	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	300	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	60mifu45mg2qqz8	8a605vb9y1	sess-id-2025-04-13-14-13-58-179-59b7f3	2025-04-13 13:13:58.181	2025-04-13 13:13:58.181	0	0	https://checkout.paystack.com/60mifu45mg2qqz8	\N
c30f2a11-e577-4e57-bed8-4a963208a090	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	450	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	xxrm04t0osob5yo	14x4e4dp58	sess-id-2025-04-13-14-20-38-984-a2e0eb	2025-04-13 13:20:38.986	2025-04-13 13:21:10.747	0	0	https://checkout.paystack.com/xxrm04t0osob5yo	\N
cd43dd7b-e484-4d26-ab97-f50a3cf55d17	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	550	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	l44r8m80xd9swnt	6oqt486jhk	sess-id-2025-04-13-14-35-5-47-f4d7b7	2025-04-13 13:35:05.048	2025-04-13 13:35:19.269	0	0	https://checkout.paystack.com/l44r8m80xd9swnt	\N
d0b2b9d6-cbae-49bc-88d3-34eb71f0eea5	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	600	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	lkspfg6ywnz8u59	8f5mbpxckz	sess-id-2025-04-13-14-41-57-247-b09eff	2025-04-13 13:41:57.248	2025-04-13 13:41:57.248	0	0	https://checkout.paystack.com/lkspfg6ywnz8u59	\N
6f8264fc-cf9f-470b-9a08-57a1ffd32bac	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	10000	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	o2xjstj91zpzato	9kac4cnbao	sess-id-2025-04-13-14-43-4-60-75a2d0	2025-04-13 13:43:04.06	2025-04-13 13:43:04.06	0	0	https://checkout.paystack.com/o2xjstj91zpzato	\N
0115acb8-e391-481a-b81a-28c7283620b1	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	10000	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	9ipbbfm13ade0sf	0bn0zrblgw	sess-id-2025-04-13-14-51-54-754-e9a1bc	2025-04-13 13:51:54.755	2025-04-13 13:51:54.755	0	0	https://checkout.paystack.com/9ipbbfm13ade0sf	\N
d23b81c5-9253-4953-84a6-2cd45e670f9a	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	15000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	1afg4fllhfztrq2	rtfywsince	sess-id-2025-04-13-14-58-32-280-9ec5a5	2025-04-13 13:58:32.281	2025-04-13 13:58:45.518	0	0	https://checkout.paystack.com/1afg4fllhfztrq2	\N
97983991-3243-4967-9b53-e5f1577a3534	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100000	deposit	Wallet funding	success	\N	ngn	paystack	10	mh9uplsxoqsut4k	pcu5x4u17m	sess-id-2025-04-13-15-13-32-314-78205f	2025-04-13 14:13:32.315	2025-04-13 14:13:44.359	0	0	https://checkout.paystack.com/mh9uplsxoqsut4k	credit
406d3ca7-6d04-408b-8e9b-378b77ca6dd9	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	20000	deposit	Wallet funding	success	\N	ngn	paystack	10	lq1jeyye4spglt0	j1o1mgqrz3	sess-id-2025-04-13-15-24-34-120-44e6d6	2025-04-13 14:24:34.121	2025-04-13 14:24:45.413	0	0	https://checkout.paystack.com/lq1jeyye4spglt0	credit
616045e2-a306-409a-a021-7f15a5a7625f	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	300	deposit	Wallet funding	success	\N	ngn	paystack	10	1osphwfa82j4nlb	r65q7xdi1i	sess-id-2025-04-13-16-47-22-796-ef14b5	2025-04-13 15:47:22.798	2025-04-13 15:47:38.643	0	0	https://checkout.paystack.com/1osphwfa82j4nlb	credit
af1bd5df-de43-45f5-a304-84d22a3fc702	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1000	deposit	Wallet funding	pending	\N	ngn	paystack	10	r6oilp07xxofkzt	5taxcrpu4j	sess-id-2025-04-14-9-12-53-536-5e2f0b	2025-04-14 08:12:53.537	2025-04-14 08:12:53.537	0	0	https://checkout.paystack.com/r6oilp07xxofkzt	credit
a0ec2cd0-40de-483f-bb7a-a79dd96563ac	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	10000	deposit	Wallet funding	success	\N	ngn	paystack	10	wz58q9w2lni80ga	5jy7ulvsry	sess-id-2025-04-14-9-17-21-778-1878ba	2025-04-14 08:17:21.779	2025-04-14 08:17:35.731	0	0	https://checkout.paystack.com/wz58q9w2lni80ga	credit
7b792890-a30c-4fa5-9fdd-3b7904b25493	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100000	deposit	Wallet funding	pending	\N	ngn	paystack	10	0x8b7i4m5hlnfm3	ks5nsf937g	sess-id-2025-04-14-9-29-11-442-bcacf8	2025-04-14 08:29:11.444	2025-04-14 08:29:11.444	0	0	https://checkout.paystack.com/0x8b7i4m5hlnfm3	credit
dd5d7534-d03a-4f36-9abd-01bdef31b499	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	10000	deposit	Wallet funding	pending	\N	ngn	paystack	10	6ftr4u1xugv87u3	pbniddtbir	sess-id-2025-04-14-9-31-22-143-cfc572	2025-04-14 08:31:22.145	2025-04-14 08:31:22.145	0	0	https://checkout.paystack.com/6ftr4u1xugv87u3	credit
e4b106f5-e490-4b4e-b5b0-3b0f3a11f6e7	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	13000	deposit	Wallet funding	pending	\N	ngn	paystack	10	v07qq86xtt7o7w3	c8jqtze5um	sess-id-2025-04-14-9-51-23-312-18cc8e	2025-04-14 08:51:23.314	2025-04-14 08:51:23.314	0	0	https://checkout.paystack.com/v07qq86xtt7o7w3	credit
32cacd5d-e848-4e8d-a0bd-587da058f539	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	39000	deposit	Wallet funding	pending	\N	ngn	paystack	10	2b0110gliv90cso	318k2my8rm	sess-id-2025-04-14-9-52-9-829-83f058	2025-04-14 08:52:09.831	2025-04-14 08:52:09.831	0	0	https://checkout.paystack.com/2b0110gliv90cso	credit
24c4ea71-c670-4f54-a191-034f7813b162	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	55000	deposit	Wallet funding	success	\N	ngn	paystack	10	86hs9r9uzihhstd	c9msqaihvt	sess-id-2025-04-14-9-52-40-414-a83fc6	2025-04-14 08:52:40.415	2025-04-14 08:54:19.847	0	0	https://checkout.paystack.com/86hs9r9uzihhstd	credit
55cab52f-13d7-4eec-a63b-8d7ea236b561	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	32000	deposit	Wallet funding	success	\N	ngn	paystack	10	pv7ovcgo2nhmipt	qt1lho9st5	sess-id-2025-04-14-10-1-34-645-8cb85a	2025-04-14 09:01:34.646	2025-04-14 09:02:44.07	0	0	https://checkout.paystack.com/pv7ovcgo2nhmipt	credit
711680df-3b68-42ac-b8b2-e5534d30eafe	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100000	deposit	Wallet funding	pending	\N	ngn	paystack	10	c17qp6fehtq29th	4wyt6ctj9z	sess-id-2025-04-14-10-7-34-25-f8159d	2025-04-14 09:07:34.026	2025-04-14 09:07:34.026	0	0	https://checkout.paystack.com/c17qp6fehtq29th	credit
0d1dba05-0562-4d20-84dc-e9794a4dc29a	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100000	deposit	Wallet funding	pending	\N	ngn	paystack	10	nylg0o5fd9glnpn	bd0u3487cp	sess-id-2025-04-14-10-8-10-574-1aac96	2025-04-14 09:08:10.575	2025-04-14 09:08:10.575	0	0	https://checkout.paystack.com/nylg0o5fd9glnpn	credit
c4126b2e-a561-4d6d-9218-0bf044dc2e45	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100	deposit	Wallet funding	pending	\N	ngn	paystack	10	w7vn0w6iu3ccfdd	rxp8u4qa3q	sess-id-2025-04-14-10-10-7-806-336fad	2025-04-14 09:10:07.806	2025-04-14 09:10:07.806	0	0	https://checkout.paystack.com/w7vn0w6iu3ccfdd	credit
724379bf-4e20-4677-b793-d58cbc9abb9c	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	2300	deposit	Wallet funding	pending	\N	ngn	paystack	10	4zcdz7andowfalo	s3t8afshrg	sess-id-2025-04-14-10-14-21-128-60bb45	2025-04-14 09:14:21.128	2025-04-14 09:14:21.128	0	0	https://checkout.paystack.com/4zcdz7andowfalo	credit
b570100a-1677-469e-9e1f-f2d647f74736	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	2000	deposit	Wallet funding	pending	\N	ngn	paystack	10	mstw8z9ev6zicbc	6ycsqh2tio	sess-id-2025-04-14-11-12-27-496-ad0847	2025-04-14 10:12:27.497	2025-04-14 10:12:27.497	0	0	https://checkout.paystack.com/mstw8z9ev6zicbc	credit
c75f7515-e6d4-4993-bd4a-26fff312cc11	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	3500	deposit	Wallet funding	success	\N	ngn	paystack	10	4i4xy5qtco3ua8q	ouy509ifcw	sess-id-2025-04-14-11-14-25-958-a24354	2025-04-14 10:14:25.96	2025-04-14 10:14:37.866	0	0	https://checkout.paystack.com/4i4xy5qtco3ua8q	credit
566f1880-b468-4418-bbac-2fabd029070b	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	350	deposit	Wallet funding	success	\N	ngn	paystack	10	52w7gxvb5jnyvpf	pzfla0p435	sess-id-2025-04-14-11-31-11-513-aaf00b	2025-04-14 10:31:11.514	2025-04-14 10:31:23.079	0	0	https://checkout.paystack.com/52w7gxvb5jnyvpf	credit
d51f3165-324f-43f2-ba7f-54d88b127e7d	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	1000	deposit	Wallet funding	success	\N	ngn	paystack	10	ogo0izfv7pdvava	ue3yhvpupa	sess-id-2025-04-14-11-44-10-849-3a2900	2025-04-14 10:44:10.85	2025-04-14 10:44:27.285	0	0	https://checkout.paystack.com/ogo0izfv7pdvava	credit
77fa2b13-7af4-41f3-9018-9c309ccb6869	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	2000	deposit	Wallet funding	success	\N	ngn	paystack	10	oew13m1sovjxgbu	7tbn643jao	sess-id-2025-04-14-11-46-36-395-dcafe2	2025-04-14 10:46:36.397	2025-04-14 10:46:46.137	0	0	https://checkout.paystack.com/oew13m1sovjxgbu	credit
a6aa5d0f-1522-4b72-9038-c83c29beb7ee	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-19-6-190-a34154	sess-id-2025-04-14-16-19-6-191-b4f728	2025-04-14 15:19:06.239	2025-04-14 15:19:06.239	0	0	\N	\N
23d2bedc-81e1-4372-bbe7-728f33a1bf49	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-20-5-514-f1a85c	sess-id-2025-04-14-16-20-5-515-83288b	2025-04-14 15:20:05.532	2025-04-14 15:20:05.532	0	0	\N	\N
756d9057-b373-41cd-9811-a1ea178719fe	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-24-44-499-658792	sess-id-2025-04-14-16-24-44-500-38bc3d	2025-04-14 15:24:44.509	2025-04-14 15:24:44.509	0	0	\N	\N
46a4911c-16f8-46c7-a5d7-f4f3281e58f5	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-25-1-889-5216ee	sess-id-2025-04-14-16-25-1-890-37f15d	2025-04-14 15:25:01.899	2025-04-14 15:25:01.899	0	0	\N	\N
f7df77c0-6835-4acd-96a5-1cad4f9cdd25	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-25-15-318-18f41c	sess-id-2025-04-14-16-25-15-319-090867	2025-04-14 15:25:15.341	2025-04-14 15:25:15.341	0	0	\N	\N
5a1a0647-5e45-4270-8875-a13bcfde56db	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-25-41-998-1530c9	sess-id-2025-04-14-16-25-41-999-373a30	2025-04-14 15:25:42.009	2025-04-14 15:25:42.009	0	0	\N	\N
2152bb6c-8b98-4527-9328-75afb180c641	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	0	data	Data top-up	pending	08146694787	ngn	wallet	0	1438097680	gift_bill-2025-04-14-16-32-11-714-900351	sess-id-2025-04-14-16-32-11-715-49b3db	2025-04-14 15:32:11.726	2025-04-14 15:32:11.726	0	0	\N	\N
c6539217-1227-41b9-876e-d6757c87c106	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	300	deposit	Wallet funding	success	\N	ngn	paystack	10	m7vs5f7fb4veosu	961ttrbo0r	sess-id-2025-04-15-2-17-35-807-717c89	2025-04-15 01:17:35.808	2025-04-15 01:17:50.796	0	0	https://checkout.paystack.com/m7vs5f7fb4veosu	credit
3e06ea3c-6417-4e1b-88ae-330f88619a74	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	7000	deposit	Wallet funding	success	\N	ngn	paystack	10	mkq2zuo853tzd4n	pun2spy0zy	sess-id-2025-04-15-2-18-22-455-3b9768	2025-04-15 01:18:22.456	2025-04-15 01:18:34.512	0	0	https://checkout.paystack.com/mkq2zuo853tzd4n	credit
7a2c458c-ebed-490c-8f05-878db99ddfec	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-16-14-54-19-70-c25844	\N	2025-04-16 13:54:21.063	2025-04-16 13:54:21.064	0	0	\N	\N
d7d9b20a-18c6-428e-ba30-383f53682429	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	500	data	Data top-up	success	08146694787	ngn	wallet	0	225	gift_bill-2025-04-16-16-2-28-100-9b3724	sess-id-2025-04-16-16-2-30-848-838232	2025-04-16 15:02:30.849	2025-04-16 15:02:30.849	0	0	\N	\N
fccc0094-2c5b-4b9e-b0b3-b55d0d5a3ef8	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	140	data	Data top-up	success	08146694787	ngn	wallet	0	223	gift_bill-2025-04-16-16-3-18-696-be92bd	sess-id-2025-04-16-16-3-21-318-0b5b14	2025-04-16 15:03:21.319	2025-04-16 15:03:21.319	0	0	\N	\N
5039c0a2-a562-4228-89d8-e85f9fbab50c	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	21000	data	Data top-up	success	08146694787	ngn	wallet	0	222	gift_bill-2025-04-16-16-5-18-749-47c3f9	sess-id-2025-04-16-16-5-21-595-614921	2025-04-16 15:05:21.596	2025-04-16 15:05:21.596	0	0	\N	\N
9c4db986-5a10-4f93-ba77-beb0f53fc19e	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	15750	data	Data top-up	success	08146694787	ngn	wallet	0	221	gift_bill-2025-04-16-16-5-59-324-3a6043	sess-id-2025-04-16-16-6-0-357-d5691c	2025-04-16 15:06:00.358	2025-04-16 15:06:00.358	0	0	\N	\N
263b6c8f-70aa-4b1b-82d1-1b1455cc5df1	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	8400	data	Data top-up	success	08146694787	ngn	wallet	0	220	gift_bill-2025-04-16-16-6-30-71-6961cd	sess-id-2025-04-16-16-6-32-944-ba5d4e	2025-04-16 15:06:32.946	2025-04-16 15:06:32.946	0	0	\N	\N
13082814-536f-4a88-9ed0-93dd27b4ad6a	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	4200	data	Data top-up	success	08146694787	ngn	wallet	0	219	gift_bill-2025-04-16-16-7-3-967-aa1b26	sess-id-2025-04-16-16-7-7-71-dec7f4	2025-04-16 15:07:07.072	2025-04-16 15:07:07.072	0	0	\N	\N
d92e3f1c-c679-42ca-a662-2648b481a5cf	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	3150	data	Data top-up	success	08146694787	ngn	wallet	0	218	gift_bill-2025-04-16-16-7-28-350-9c7f9a	sess-id-2025-04-16-16-7-29-343-1131a2	2025-04-16 15:07:29.344	2025-04-16 15:07:29.344	0	0	\N	\N
c4e4fcb2-0053-47a8-a21c-683ee44d5625	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2100	data	Data top-up	success	08146694787	ngn	wallet	0	217	gift_bill-2025-04-16-16-7-54-903-e8b9a3	sess-id-2025-04-16-16-7-56-743-1a71fa	2025-04-16 15:07:56.744	2025-04-16 15:07:56.744	0	0	\N	\N
2c12a4c5-6868-4d4d-8abe-8a7738d80d2c	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	1050	data	Data top-up	success	08146694787	ngn	wallet	0	216	gift_bill-2025-04-16-16-8-21-655-14d605	sess-id-2025-04-16-16-8-23-548-606e37	2025-04-16 15:08:23.549	2025-04-16 15:08:23.549	0	0	\N	\N
368e8f87-4741-45ba-8ac3-c44b0a6d2869	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	630	data	Data top-up	success	08146694787	ngn	wallet	0	215	gift_bill-2025-04-16-16-8-46-549-6d70f3	sess-id-2025-04-16-16-8-47-415-91d586	2025-04-16 15:08:47.416	2025-04-16 15:08:47.416	0	0	\N	\N
0c124aef-d6d8-4a03-985e-a966ca40c6df	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	420	data	Data top-up	success	08146694787	ngn	wallet	0	214	gift_bill-2025-04-16-16-9-8-710-508b18	sess-id-2025-04-16-16-9-9-501-987c47	2025-04-16 15:09:09.502	2025-04-16 15:09:09.502	0	0	\N	\N
a6739c0a-a72a-4afe-9eb0-0a89be1188af	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	210	data	Data top-up	success	08146694787	ngn	wallet	0	213	gift_bill-2025-04-16-16-9-35-62-81fad1	sess-id-2025-04-16-16-9-35-994-a449a1	2025-04-16 15:09:35.995	2025-04-16 15:09:35.995	0	0	\N	\N
462a3e48-59ca-4cfb-95d5-73182bf808d4	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	115	data	Data top-up	success	08146694787	ngn	wallet	0	212	gift_bill-2025-04-16-16-10-1-690-c2a248	sess-id-2025-04-16-16-10-2-490-4db79e	2025-04-16 15:10:02.491	2025-04-16 15:10:02.491	0	0	\N	\N
247c6fcb-a92d-453f-9aaa-b489d3985e62	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	35	data	Data top-up	success	08146694787	ngn	wallet	0	229	gift_bill-2025-04-16-16-22-58-81-267450	sess-id-2025-04-16-16-23-0-44-856b83	2025-04-16 15:23:00.046	2025-04-16 15:23:00.046	0	0	\N	\N
9670aa15-3754-43e2-a003-0def307fedb4	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	237	gift_bill-2025-04-16-16-27-11-510-3cf838	sess-id-2025-04-16-16-27-12-210-4d817d	2025-04-16 15:27:12.21	2025-04-16 15:27:12.21	0	0	\N	\N
8904c755-61a2-44c7-9de5-b8c1bfab4532	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	236	gift_bill-2025-04-16-16-27-43-312-bd962d	sess-id-2025-04-16-16-27-44-24-1c0742	2025-04-16 15:27:44.025	2025-04-16 15:27:44.025	0	0	\N	\N
e1f1213a-a94f-4bb0-bf46-083345f8aae9	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	235	gift_bill-2025-04-16-16-28-2-586-7f27cf	sess-id-2025-04-16-16-28-3-514-cb336c	2025-04-16 15:28:03.515	2025-04-16 15:28:03.515	0	0	\N	\N
d43c5148-1bd2-48f0-b23f-f39538edc21e	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	234	gift_bill-2025-04-16-16-28-13-277-bf5b09	sess-id-2025-04-16-16-28-14-119-dfbd52	2025-04-16 15:28:14.12	2025-04-16 15:28:14.12	0	0	\N	\N
b3b1aade-5cd9-4af6-aa05-0b1f2cc5e292	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	233	gift_bill-2025-04-16-16-28-22-532-70f59b	sess-id-2025-04-16-16-28-23-728-2ccb71	2025-04-16 15:28:23.729	2025-04-16 15:28:23.729	0	0	\N	\N
9c4c1951-72e8-4c6f-98a4-f152038171a5	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	232	gift_bill-2025-04-16-16-28-32-385-223610	sess-id-2025-04-16-16-28-33-222-45f622	2025-04-16 15:28:33.223	2025-04-16 15:28:33.223	0	0	\N	\N
db825b46-5f0a-4e1d-ab08-f96c6b809e10	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	231	gift_bill-2025-04-16-16-28-41-408-aac9f5	sess-id-2025-04-16-16-28-42-608-6c70d8	2025-04-16 15:28:42.609	2025-04-16 15:28:42.609	0	0	\N	\N
3fccaf5b-97ce-4d06-9c4c-8664beea115a	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	230	gift_bill-2025-04-16-16-28-51-622-9f4a8c	sess-id-2025-04-16-16-28-52-958-bd7722	2025-04-16 15:28:52.959	2025-04-16 15:28:52.959	0	0	\N	\N
eb4ff512-96e0-4a1b-8c15-61c1b45d5a90	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2500	data	Data top-up	success	08146694787	ngn	wallet	0	229	gift_bill-2025-04-16-16-29-12-257-bd368f	sess-id-2025-04-16-16-29-16-361-a9c16a	2025-04-16 15:29:16.362	2025-04-16 15:29:16.362	0	0	\N	\N
dcf61c7e-37f8-4188-adf9-56ffd6a711ec	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	115	data	Data top-up	success	08146694787	ngn	wallet	0	212	gift_bill-2025-04-16-16-36-58-706-b10b63	sess-id-2025-04-16-16-36-59-450-7c4f7a	2025-04-16 15:36:59.452	2025-04-16 15:36:59.452	0	0	\N	\N
318346a0-446e-497a-b0d6-af1afc0bfb10	c9c20a1e-3173-46d7-9b61-5bf5271dd842	70b59c24-d647-480a-a9a9-d7ea570d9d9c	115	data	Data top-up	success	08146694787	ngn	wallet	0	212	gift_bill-2025-04-16-16-58-35-60-c2047d	sess-id-2025-04-16-16-58-35-749-a12a73	2025-04-16 15:58:35.75	2025-04-16 15:58:35.75	0	0	\N	\N
4cc7978a-3548-455a-a5d5-d53332e23d48	c9c20a1e-3173-46d7-9b61-5bf5271dd842	70b59c24-d647-480a-a9a9-d7ea570d9d9c	3150	data	Data top-up	success	08146694787	ngn	wallet	0	218	gift_bill-2025-04-16-17-2-2-159-84945f	sess-id-2025-04-16-17-2-3-551-7205c0	2025-04-16 16:02:03.553	2025-04-16 16:02:03.553	0	0	\N	\N
59313a86-ffd8-4c21-a966-d275d5df63c3	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-17-14-26-39-516-4a8088	\N	2025-04-17 13:26:41.318	2025-04-17 13:26:41.319	0	0	\N	\N
5710824b-db18-423a-83f4-5fa2d51ab795	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	4000	deposit	Wallet funding	success	\N	ngn	paystack	10	h400w4jurt8a08d	rjzwvkxxd7	sess-id-2025-04-18-11-30-57-988-a079a2	2025-04-18 10:30:57.989	2025-04-18 10:31:15.705	0	0	https://checkout.paystack.com/h400w4jurt8a08d	credit
63ae95c0-7bda-47f0-8973-a3ca481aac0e	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-18-14-49-55-335-1c7c02	\N	2025-04-18 13:49:56.694	2025-04-18 13:49:56.695	0	0	\N	\N
3ab45447-c6fc-49ee-bab7-134b9b001a21	c9c20a1e-3173-46d7-9b61-5bf5271dd842	70b59c24-d647-480a-a9a9-d7ea570d9d9c	420	data	Data top-up	success	08146694787	ngn	wallet	0	214	gift_bill-2025-04-18-14-50-20-830-3b9dcd	sess-id-2025-04-18-14-50-21-574-b07f3f	2025-04-18 13:50:21.575	2025-04-18 13:50:21.575	0	0	\N	\N
773eb43a-3814-4f6a-b049-fc268bf32c9b	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	1000	deposit	Wallet funding	success	\N	ngn	paystack	10	kattlw3zfu2wq4z	tj92thpj3z	sess-id-2025-04-18-23-38-58-914-1e3d12	2025-04-18 22:38:58.915	2025-04-18 22:39:21.137	0	0	https://checkout.paystack.com/kattlw3zfu2wq4z	credit
63428ff7-dd6b-401c-966f-afcc415788b9	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	600	deposit	Wallet funding	success	\N	ngn	paystack	10	r7288ejdgzxyu16	oteddav03y	sess-id-2025-04-18-23-45-41-477-7c1e9c	2025-04-18 22:45:41.478	2025-04-18 22:46:00.086	0	0	https://checkout.paystack.com/r7288ejdgzxyu16	credit
d9c7adff-f1bf-4f3b-8f4a-d4c541065a6a	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-18-23-47-51-684-da7cf4	\N	2025-04-18 22:47:55.151	2025-04-18 22:47:55.152	0	0	\N	\N
f4254aa4-b2de-435f-b5ba-dc44d3338dfb	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	9200	deposit	Wallet funding	success	\N	ngn	paystack	10	xg3skwsq33ooslv	g0o2i68xz1	sess-id-2025-04-18-23-49-33-231-f4fed3	2025-04-18 22:49:33.232	2025-04-18 22:49:45.279	0	0	https://checkout.paystack.com/xg3skwsq33ooslv	credit
aa1a3a35-c060-4097-97c3-0d04df54b8c8	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	300	deposit	Wallet funding	success	\N	ngn	paystack	10	e88sxe27wf6wphj	xlhlgdnnoq	sess-id-2025-04-18-23-51-41-379-5c453c	2025-04-18 22:51:41.38	2025-04-18 22:51:55.755	0	0	https://checkout.paystack.com/e88sxe27wf6wphj	credit
dbd0bbe2-e0b2-429f-823c-26585f9af54c	\N	c2fccf06-f936-40b0-a320-d15ec7e55795	250	deposit	Wallet funding	success	\N	ngn	paystack	10	kiwtk16c9z9makr	j3b7vybw6w	sess-id-2025-04-18-23-53-45-846-2bb2c9	2025-04-18 22:53:45.847	2025-04-18 22:53:59.155	0	0	https://checkout.paystack.com/kiwtk16c9z9makr	credit
f823bd56-cabe-4bc1-8f95-a1dd3a35501d	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-12-36-58-982-05219f	\N	2025-04-21 11:37:00.846	2025-04-21 11:37:00.847	0	0	\N	\N
d01e5008-4318-47ce-8f86-6f5404372a1a	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-12-38-53-107-1ce3dc	\N	2025-04-21 11:38:54.173	2025-04-21 11:38:54.174	0	0	\N	\N
2abf55de-b712-427c-9bc2-8fa61d7af8a8	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	200	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-12-41-58-217-16bf4b	\N	2025-04-21 11:41:59.472	2025-04-21 11:41:59.472	0	0	\N	\N
f7f0aa2c-ef98-45d3-98fa-56ee92da387d	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	100	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-12-43-12-885-24db96	\N	2025-04-21 11:43:14.059	2025-04-21 11:43:14.059	0	0	\N	\N
bb948bd9-7e47-440c-a932-8d9f67a9504c	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-12-46-9-935-6a1bf6	\N	2025-04-21 11:46:11.237	2025-04-21 11:46:11.237	0	0	\N	\N
c42bc945-db34-4e83-86c1-2cd3e7923b67	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	1000	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-17-5-57-210-341258	\N	2025-04-21 16:05:58.091	2025-04-21 16:05:58.092	0	0	\N	\N
40af6f45-eb39-4ac8-b920-ecbf3d3553a3	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	200	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-17-7-26-813-cb3d64	\N	2025-04-21 16:07:28.009	2025-04-21 16:07:28.01	0	0	\N	\N
d8eb26e0-a430-4c62-a386-f23fc7680964	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-21-17-8-27-859-cf7433	\N	2025-04-21 16:08:29.028	2025-04-21 16:08:29.028	0	0	\N	\N
3979ee25-fbf8-4d1e-9c30-9a6f99d95476	c9c20a1e-3173-46d7-9b61-5bf5271dd842	70b59c24-d647-480a-a9a9-d7ea570d9d9c	115	data	Data top-up	success	08146694787	ngn	wallet	0	212	gift_bill-2025-04-21-17-35-29-680-c9e3d2	sess-id-2025-04-21-17-35-30-381-61d493	2025-04-21 16:35:30.382	2025-04-21 16:35:30.382	0	0	\N	\N
c42ec36f-96e5-433a-8106-795e75af57f9	\N	3e38d9af-e211-45ab-808e-ca8652f8f64c	3000	deposit	Wallet funding	success	\N	ngn	paystack	10	txq3uk2fwv9p0aq	efbq9zhijf	sess-id-2025-04-22-9-40-48-520-d9191c	2025-04-22 08:40:48.521	2025-04-22 08:41:11.553	0	0	https://checkout.paystack.com/txq3uk2fwv9p0aq	credit
eb44b289-8386-4981-aace-7eab475403e8	\N	3e38d9af-e211-45ab-808e-ca8652f8f64c	230	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-22-9-45-16-576-f3aa5b	\N	2025-04-22 08:45:19.384	2025-04-22 08:45:19.385	0	0	\N	\N
d7359514-7148-47c7-8276-53de0151d80a	69de0e48-bcab-495e-9033-aa9f7b6dd602	3e38d9af-e211-45ab-808e-ca8652f8f64c	2100	data	Data top-up	success	08146694787	ngn	wallet	0	217	gift_bill-2025-04-22-9-53-24-665-9280a0	sess-id-2025-04-22-9-53-26-301-adf230	2025-04-22 08:53:26.302	2025-04-22 08:53:26.302	0	0	\N	\N
4892167d-7493-4675-a2b5-ff3728c0bd29	\N	3e38d9af-e211-45ab-808e-ca8652f8f64c	25000	deposit	Wallet funding	success	\N	ngn	paystack	10	oc16ey0eqg4epzj	23x1qt5itk	sess-id-2025-04-22-14-46-53-583-964e53	2025-04-22 13:46:53.585	2025-04-22 13:47:04.204	0	0	https://checkout.paystack.com/oc16ey0eqg4epzj	credit
59022716-be16-466c-9814-63f5255ae5d1	\N	0cd61376-e43e-4b57-ab60-de91d72b8382	2000	deposit	Wallet funding	success	\N	ngn	paystack	10	fm0scthjpw0arqb	zg32ac84ey	sess-id-2025-04-22-17-7-48-425-623b85	2025-04-22 16:07:48.426	2025-04-22 16:08:33.341	0	0	https://checkout.paystack.com/fm0scthjpw0arqb	credit
b1bcc8cd-98f8-43e6-84f8-490a4f112c25	\N	0cd61376-e43e-4b57-ab60-de91d72b8382	250	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-22-17-10-6-720-f4a43d	\N	2025-04-22 16:10:08.518	2025-04-22 16:10:08.519	0	0	\N	\N
cedb4455-d082-4b31-8826-9e3247016051	612f48bd-af14-4456-a215-49ee74e986bb	0cd61376-e43e-4b57-ab60-de91d72b8382	420	data	Data top-up	success	08146694787	ngn	wallet	0	214	gift_bill-2025-04-22-17-12-25-324-b572ed	sess-id-2025-04-22-17-12-26-667-aad68e	2025-04-22 16:12:26.669	2025-04-22 16:12:26.669	0	0	\N	\N
a6f87a6c-5357-4d5f-8247-623191a4cc69	\N	70b59c24-d647-480a-a9a9-d7ea570d9d9c	10000	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-23-8-31-23-800-7e4a4e	\N	2025-04-23 07:31:25.786	2025-04-23 07:31:25.787	0	0	\N	\N
5661ff22-3285-4d20-8d38-931a22fb5a22	\N	44852313-60a6-43e5-b3db-7b75edfff6c3	10500	deposit	Wallet funding	success	\N	ngn	paystack	10	parfrv9xd350g7a	31nfstmiou	sess-id-2025-04-23-10-57-13-740-3ea289	2025-04-23 09:57:13.741	2025-04-23 09:58:03.843	0	0	https://checkout.paystack.com/parfrv9xd350g7a	credit
ef31b3c2-3095-4a2b-a6cb-add196d2a931	\N	44852313-60a6-43e5-b3db-7b75edfff6c3	500	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-23-10-58-49-696-081528	\N	2025-04-23 09:58:50.755	2025-04-23 09:58:50.756	0	0	\N	\N
920d399e-db03-4d3b-a2a6-40a6a09c4944	1df3186d-b261-4570-905d-023b58afdea3	44852313-60a6-43e5-b3db-7b75edfff6c3	3150	data	Data top-up	success	08146694787	ngn	wallet	0	218	gift_bill-2025-04-23-11-0-24-242-1ac013	sess-id-2025-04-23-11-0-25-155-389aae	2025-04-23 10:00:25.156	2025-04-23 10:00:25.156	0	0	\N	\N
a83336f4-b6ac-44df-807a-3b9e0cacb9eb	fc270879-54a7-47dc-a5e8-93aad4cb3497	0bef0fa5-9f55-4b01-a15a-db9defeb6037	30000	deposit	Wallet funding	success	\N	ngn	paystack	10	fa5mgi5c1rrcdeu	tx45mkz9ej	sess-id-2025-04-24-20-8-19-855-c373a2	2025-04-24 19:08:19.857	2025-04-24 19:08:48.995	0	0	https://checkout.paystack.com/fa5mgi5c1rrcdeu	credit
9b5e7f53-d309-45d9-a177-3fdd40bef6f6	\N	0bef0fa5-9f55-4b01-a15a-db9defeb6037	400	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-24-20-9-40-509-0a3985	\N	2025-04-24 19:09:42.669	2025-04-24 19:09:42.67	0	0	\N	\N
da2487f6-82dc-458f-ba5f-a32ddec1929a	b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	2100	data	Data top-up	success	08146694787	ngn	wallet	0	217	gift_bill-2025-04-24-20-10-42-428-222459	sess-id-2025-04-24-20-10-43-280-f3ed65	2025-04-24 19:10:43.281	2025-04-24 19:10:43.281	0	0	\N	\N
\.


--
-- Data for Name: TransactionIcon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransactionIcon" (id, transaction_id, secure_url, public_id) FROM stdin;
e8f318cc-d800-4d36-9aa4-9a6df762525d	43fe4177-3ec4-4497-844c-7312f3c54022	paystack-icon	paystack-icon
bb0f8731-6d6d-45ed-ab2a-c83017ecbb69	f8c4ae7b-2c30-4262-9581-1df9f2f3fc85	paystack-icon	paystack-icon
18a0798f-4d57-45d3-847d-268a5d6264de	a4854e2d-3d5b-4988-9c96-b504087295fe	paystack-icon	paystack-icon
8b755778-d8f8-4956-947b-d30b2d9c6756	f5798ce8-10b5-4312-a6f1-24ffa8e4701c	paystack-icon	paystack-icon
d59dcee2-d07f-4f33-9f29-8c6b8c640d41	66929e3e-bd63-440d-8ace-735e2d9e8902	paystack-icon	paystack-icon
b2fcfd64-04e9-498c-9833-a9d9dabda1af	4fc49a1e-adc5-4c47-b07e-2ec41aba6434	paystack-icon	paystack-icon
70974153-c948-46c9-ad58-25b697e96dfa	be9e5bb2-f095-4927-81e2-d1a492d87453	paystack-icon	paystack-icon
600f5f8c-1af2-4898-b5c3-5c9339bb2a0b	d1e2dac4-d82f-49db-8ef8-86c06f96bf3f	paystack-icon	paystack-icon
af8f80d4-5641-453e-8c71-c7d3b4610784	ec2b19de-eef8-4347-a0ce-c8ea307062a5	paystack-icon	paystack-icon
eb64ebdb-59c1-4771-bb51-726098bee597	c0e32c08-685c-4d8b-9899-720fc77034cb	mtn url	mtn id public
93a90a07-00b4-4962-ae1d-88f2d599290e	f9f77903-4ed8-4c18-a7f4-629c59932f57	mtn url	mtn id public
b74e354d-a81d-4e6f-8781-4743687b122c	c9af2975-0303-4623-b4ed-cdfc341a5090	paystack-icon	paystack-icon
20bdb7b5-59ca-4eaa-9188-c93cb9bd97e4	c96308b0-a889-4c81-b6fd-16d355d9817e	mtn url	mtn id public
aad5bbb2-ede9-4fb2-88d4-d628407e217e	2fb7c78c-9c1c-4921-b8e2-01c29c8f9b03	paystack-icon	paystack-icon
5e3082c9-46ff-46ff-901e-1ea64f56345e	a8e27330-2165-4ac4-800b-a5034be67278	paystack-icon	paystack-icon
f2ce8a8e-9c3d-4c65-9a40-b83f83730530	8dd990bb-4a05-4307-a615-f1c2a56025c4	paystack-icon	paystack-icon
80c95ca1-f41a-4501-afe6-74c411b8d92d	6edbcef9-b81b-4f82-a41b-328c52706a0c	paystack-icon	paystack-icon
f3253e9d-4d0b-4c9e-be64-993f12fe3c52	612b9020-d760-4d4d-964f-f0229a60a6e9	paystack-icon	paystack-icon
a221d202-5ca5-424e-b567-68b8f656e62b	910c8664-24f8-497e-9ab2-454ce066cce5	paystack-icon	paystack-icon
de5ca634-0e26-442f-9c4e-104b41464050	6b9fe939-4def-454d-8076-f65a43309740	paystack-icon	paystack-icon
ab3f0fee-eef4-4af1-84b9-81b3f12aa250	c1ac2014-5c1a-4f45-bbd3-c5b679d13b8e	paystack-icon	paystack-icon
ebb8ef23-9016-49c9-b591-c35e02bba268	c3199521-bb56-4555-9377-04f4975a3490	paystack-icon	paystack-icon
3ce06945-24e3-49d1-a8d6-cbf6e743bb8b	e51c9842-a002-4173-b7e8-3e4d4bf09f92	paystack-icon	paystack-icon
1be95dd9-d7f1-4158-a071-bc4769714b62	5bce8ffa-b7ac-48e5-a7a7-279f09391ec8	paystack-icon	paystack-icon
0b433533-cc9b-435e-a373-b6f3b33995a5	f113cba2-ba2b-45cd-89fa-d5a2a426a480	paystack-icon	paystack-icon
766e11bd-d008-4d2c-8005-c6a19ce8d3f7	cdb5d170-d7c3-45bb-a18f-0f5567dca4e3	paystack-icon	paystack-icon
71ab0ffd-92de-45b8-a602-571557f99f69	a451e230-9345-4fcd-9e2d-fd7e86aca270	mtn url	mtn id public
d6614b38-2856-4359-93d1-b9c5b51d32ba	79192690-c658-4236-a60f-08c9dde123c7	paystack-icon	paystack-icon
0300764d-7b53-4422-8a63-11bfe48292f5	60a13033-965c-43e4-a753-575b079d1544	paystack-icon	paystack-icon
5165e616-040e-46ce-ad9e-d149acaa1823	d2cb412e-9054-4b23-9542-b7a1fb4bf3a1	paystack-icon	paystack-icon
d56dc398-06dc-43c5-b835-b5bb593013d2	d08cfed6-9fea-4bee-8645-b55940325d0c	paystack-icon	paystack-icon
dd16b8c0-2f70-43ee-bbe7-797000ee1091	47391bfe-9d76-4160-826d-099903f684ce	paystack-icon	paystack-icon
1742b72c-8adb-4893-abf7-a48c36a936ab	d18e3169-dc77-462b-8aa6-d04283f0bf5a	paystack-icon	paystack-icon
9ce57c2d-9d74-4d5c-8549-d6a7efd52861	ea8af93c-1d83-401f-97c8-aa06309a9611	paystack-icon	paystack-icon
5d79d21e-6d8e-457a-a581-7d937663ceb2	c1f494c1-cdc9-45b0-a097-2a6aa574cb9d	paystack-icon	paystack-icon
ca8741fc-a11e-49aa-84a8-816418628c14	c30f2a11-e577-4e57-bed8-4a963208a090	paystack-icon	paystack-icon
e95f76c1-ec16-4ad3-bcf6-9be75fefb288	cd43dd7b-e484-4d26-ab97-f50a3cf55d17	paystack-icon	paystack-icon
834d9598-f37b-48ef-baea-be41e7522cae	d0b2b9d6-cbae-49bc-88d3-34eb71f0eea5	paystack-icon	paystack-icon
42c30e2f-a024-4739-9a69-3594e0a4115b	6f8264fc-cf9f-470b-9a08-57a1ffd32bac	paystack-icon	paystack-icon
4c1b5c9c-4c60-45b2-9b1d-f9119ca89c6d	0115acb8-e391-481a-b81a-28c7283620b1	paystack-icon	paystack-icon
0d363014-b93d-4f25-b133-685ad57184b0	d23b81c5-9253-4953-84a6-2cd45e670f9a	paystack-icon	paystack-icon
e99251b6-3823-4179-918f-0ee8a18a86ab	97983991-3243-4967-9b53-e5f1577a3534	paystack-icon	paystack-icon
c5011638-86bd-44c0-ba4a-55ffd7f8330c	406d3ca7-6d04-408b-8e9b-378b77ca6dd9	paystack-icon	paystack-icon
5376deee-ea13-4c38-9e80-d5316399afd0	616045e2-a306-409a-a021-7f15a5a7625f	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
14b84cb7-98ea-4c79-852a-02520b0fb373	af1bd5df-de43-45f5-a304-84d22a3fc702	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
90fa9163-2bad-460b-9e04-d3094012b61d	a0ec2cd0-40de-483f-bb7a-a79dd96563ac	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
ef45ed6f-237f-4b69-bf84-bd7a159c3e78	7b792890-a30c-4fa5-9fdd-3b7904b25493	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
839aa39c-ddc5-4ffc-a96d-3fd125262918	dd5d7534-d03a-4f36-9abd-01bdef31b499	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
bec7c256-847c-4a2a-84a1-31176363bc99	e4b106f5-e490-4b4e-b5b0-3b0f3a11f6e7	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
9591df63-6eb6-497f-992b-725b1ad90a64	32cacd5d-e848-4e8d-a0bd-587da058f539	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
168d20c2-2cf5-47d2-becc-002f6c5cba23	24c4ea71-c670-4f54-a191-034f7813b162	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
0dff8720-51ec-4b1e-a58f-4074ba6a9634	55cab52f-13d7-4eec-a63b-8d7ea236b561	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
54c96752-2599-4fb0-b9bc-251414e2cac3	711680df-3b68-42ac-b8b2-e5534d30eafe	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
0d9aa264-5375-4b4f-9900-36d5575564e0	0d1dba05-0562-4d20-84dc-e9794a4dc29a	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
8720d622-f31a-4c21-98ad-7d515fe5ae5e	c4126b2e-a561-4d6d-9218-0bf044dc2e45	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
3bf7e086-93da-4299-bc5b-719694dadf78	724379bf-4e20-4677-b793-d58cbc9abb9c	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
11f35990-06b4-4bf8-8768-c6f63e4941a1	b570100a-1677-469e-9e1f-f2d647f74736	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
e5c1292e-26ef-4100-ad69-7753746ec827	c75f7515-e6d4-4993-bd4a-26fff312cc11	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
4acf7233-ee69-4742-8b30-980798ba82d9	566f1880-b468-4418-bbac-2fabd029070b	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
ebd20921-61d9-486b-ae09-7fddcd0216a1	d51f3165-324f-43f2-ba7f-54d88b127e7d	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
91137a06-4898-4a19-ac40-aeb3b68c37d1	77fa2b13-7af4-41f3-9018-9c309ccb6869	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
0b43a937-b884-4c53-86d8-c7e18ee77721	a6aa5d0f-1522-4b72-9038-c83c29beb7ee	mtn url	mtn id public
86a3a71b-0251-437a-b2ab-7e71eea11580	23d2bedc-81e1-4372-bbe7-728f33a1bf49	mtn url	mtn id public
eee645e9-e35d-4636-8802-2b6d7271f22e	756d9057-b373-41cd-9811-a1ea178719fe	mtn url	mtn id public
45268195-0d01-412d-8d0a-86353bba97de	46a4911c-16f8-46c7-a5d7-f4f3281e58f5	mtn url	mtn id public
ddd952c2-88ea-469e-9b10-e799fa26c613	f7df77c0-6835-4acd-96a5-1cad4f9cdd25	mtn url	mtn id public
88fb7d12-75a8-4fae-8331-45f182c33ed0	5a1a0647-5e45-4270-8875-a13bcfde56db	mtn url	mtn id public
2bbfa16a-7c0e-47e7-bd4f-6a1fde12f8cd	2152bb6c-8b98-4527-9328-75afb180c641	mtn url	mtn id public
5327a6d9-651f-4ea4-97af-c361c6a796cd	c6539217-1227-41b9-876e-d6757c87c106	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
70a2bd81-71be-43ba-876f-af184b0b9cb0	3e06ea3c-6417-4e1b-88ae-330f88619a74	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
19f32689-4d54-46f1-bbe1-4e3fb2b1a1b0	d7d9b20a-18c6-428e-ba30-383f53682429	mtn url	mtn id public
f9aaa749-de02-4fb6-91c6-1b08e714af43	fccc0094-2c5b-4b9e-b0b3-b55d0d5a3ef8	mtn url	mtn id public
d584597b-f8fc-4102-9bc1-92bb787e6e16	5039c0a2-a562-4228-89d8-e85f9fbab50c	mtn url	mtn id public
ccaf6831-1b7d-4c34-8615-dcf6bd3441d2	9c4db986-5a10-4f93-ba77-beb0f53fc19e	mtn url	mtn id public
5f0b5d8e-a2d6-4b5c-8b81-3c187f46612c	263b6c8f-70aa-4b1b-82d1-1b1455cc5df1	mtn url	mtn id public
7e8e024a-1817-4557-b2db-e4fbef663ada	13082814-536f-4a88-9ed0-93dd27b4ad6a	mtn url	mtn id public
17824d64-c71f-4666-a25b-b1d5d8ce67d2	d92e3f1c-c679-42ca-a662-2648b481a5cf	mtn url	mtn id public
ac40ac6e-7a99-456b-8064-a2dec474017e	c4e4fcb2-0053-47a8-a21c-683ee44d5625	mtn url	mtn id public
779fa3c8-ae35-4cc5-bb1b-605a885190ea	2c12a4c5-6868-4d4d-8abe-8a7738d80d2c	mtn url	mtn id public
1e218fd8-4683-43fe-9de6-b2f6cad8a630	368e8f87-4741-45ba-8ac3-c44b0a6d2869	mtn url	mtn id public
44427687-6f28-4a93-bb24-c03ea0f0d8b6	0c124aef-d6d8-4a03-985e-a966ca40c6df	mtn url	mtn id public
5bdcd271-a23e-4145-b49d-0b9fce6fd5a6	a6739c0a-a72a-4afe-9eb0-0a89be1188af	mtn url	mtn id public
bc92cc57-e14d-43a7-ae84-fd5089845dc5	462a3e48-59ca-4cfb-95d5-73182bf808d4	mtn url	mtn id public
49581763-7cf2-4a48-a797-1e3c9c3a7acd	247c6fcb-a92d-453f-9aaa-b489d3985e62	mtn url	mtn id public
622e8cc4-b98c-4471-b4f4-fdd545033e60	9670aa15-3754-43e2-a003-0def307fedb4	mtn url	mtn id public
585c1a5c-fd39-4074-ac3f-8ce416e62004	8904c755-61a2-44c7-9de5-b8c1bfab4532	mtn url	mtn id public
700cc919-5f33-4e8c-94ea-75cfc55787ff	e1f1213a-a94f-4bb0-bf46-083345f8aae9	mtn url	mtn id public
2d21b242-db9b-4a8a-9302-c9114a7ab2d1	d43c5148-1bd2-48f0-b23f-f39538edc21e	mtn url	mtn id public
babe38bc-1f58-4897-bf47-d5fbbda7e478	b3b1aade-5cd9-4af6-aa05-0b1f2cc5e292	mtn url	mtn id public
5380dd59-495e-4b95-b7b3-1d8af0e8d8d8	9c4c1951-72e8-4c6f-98a4-f152038171a5	mtn url	mtn id public
a141337a-09c8-451b-a799-49c2797ac262	db825b46-5f0a-4e1d-ab08-f96c6b809e10	mtn url	mtn id public
05ff924f-be64-4473-8561-1a361ec7585b	3fccaf5b-97ce-4d06-9c4c-8664beea115a	mtn url	mtn id public
a80572db-b3fb-490b-acf2-c8fb770ffe63	eb4ff512-96e0-4a1b-8c15-61c1b45d5a90	mtn url	mtn id public
243fe7ac-7de5-4287-be6d-4bb92fc9668d	dcf61c7e-37f8-4188-adf9-56ffd6a711ec	mtn url	mtn id public
72a3dbd1-909a-4e57-a3d1-a626622a7f0f	318346a0-446e-497a-b0d6-af1afc0bfb10	mtn url	mtn id public
85396262-6e32-4ba8-98ea-ffee3abbbdb4	4cc7978a-3548-455a-a5d5-d53332e23d48	mtn url	mtn id public
08fc4b4a-461b-4d94-9ff7-f8d62c40be7f	5710824b-db18-423a-83f4-5fa2d51ab795	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
df4ff17d-989f-4a0e-85b5-50cc40fa42ec	3ab45447-c6fc-49ee-bab7-134b9b001a21	mtn url	mtn id public
90e8b706-c3b1-40c9-88f6-af8c8a158ef7	773eb43a-3814-4f6a-b049-fc268bf32c9b	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
3eb5613e-dafd-4f06-afe5-48b33547ec76	63428ff7-dd6b-401c-966f-afcc415788b9	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
6e117204-ffe3-4b31-9c0b-a33d47fe77b8	f4254aa4-b2de-435f-b5ba-dc44d3338dfb	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
30fd5389-b966-42a0-a3cd-cb90a5a214c2	aa1a3a35-c060-4097-97c3-0d04df54b8c8	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
5df89d10-a306-476b-817d-d0d0efa0910d	dbd0bbe2-e0b2-429f-823c-26585f9af54c	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
3ac8db8d-37aa-4590-a9c1-76bae796f3e9	3979ee25-fbf8-4d1e-9c30-9a6f99d95476	mtn url	mtn id public
40a45bfd-6b06-4d40-b573-aae12306d932	c42ec36f-96e5-433a-8106-795e75af57f9	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
61c5087a-5d14-46ac-b5fc-cdcbd6b68fd7	d7359514-7148-47c7-8276-53de0151d80a	mtn url	mtn id public
eaf92cc7-04b5-4724-ab51-b667e8ff73ce	4892167d-7493-4675-a2b5-ff3728c0bd29	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
8dddcea8-5e19-4d6f-95e6-b92f4bf874ad	59022716-be16-466c-9814-63f5255ae5d1	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
025fd057-d9ea-4123-9638-cdab0b1d6a98	cedb4455-d082-4b31-8826-9e3247016051	mtn url	mtn id public
416300ac-e94c-46e9-96df-72ea31a203da	5661ff22-3285-4d20-8d38-931a22fb5a22	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
988b431e-7c3e-48e4-89c9-79711d800ec5	920d399e-db03-4d3b-a2a6-40a6a09c4944	mtn url	mtn id public
18d53097-3a19-4e18-864a-e68f4363bad4	a83336f4-b6ac-44df-807a-3b9e0cacb9eb	https://res.cloudinary.com/dwqurinck/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1744555901/paystack-logo_vvc184.png	paystack-icon
d1e59330-0e49-4dd3-9ba7-85ba3c70d5d7	da2487f6-82dc-458f-ba5f-a32ddec1929a	mtn url	mtn id public
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, first_name, last_name, email, hash, phone_number, password, otp, otp_expires_at, role, gender, date_of_birth, is_email_verified, "createdAt", "updatedAt", cardholder_id, "fourDigitPin") FROM stdin;
193319da-a841-4402-ab0d-a2f5d76afdc5	testing	testing	testing@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$vFh0o/Vk/3wJxgxr8Ab/SQ$mvZn1vEmadzdkUUacbb/nvzx7wwKoY/EhUlQuwWDuVU	\N	$argon2id$v=19$m=65536,t=3,p=4$vFh0o/Vk/3wJxgxr8Ab/SQ$mvZn1vEmadzdkUUacbb/nvzx7wwKoY/EhUlQuwWDuVU	3609	2025-04-17 06:28:00.157	user	\N	\N	f	2025-04-17 06:23:00.154	2025-04-17 06:23:00.158	\N	\N
70b59c24-d647-480a-a9a9-d7ea570d9d9c	Maximus	Danny	adeyeye.toyorsi@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$H9oknSy73vKTUBoAMviAlQ$6RYp5WytPG0UdTw386xFCoTTBPyut1Ry58wsbA5pgaQ	08146694787	$argon2id$v=19$m=65536,t=3,p=4$H9oknSy73vKTUBoAMviAlQ$6RYp5WytPG0UdTw386xFCoTTBPyut1Ry58wsbA5pgaQ	\N	2025-04-05 22:19:02.36	user	male	1990-01-01 00:00:00	t	2025-04-05 22:14:02.361	2025-04-05 22:14:39.32	\N	\N
a56ab61f-9396-44e4-8bf5-819ee54f0f83	Pelumi	Johnson	reeestuhgng3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$7RMHkNXzLl8pKdMMb80/kw$tz5tcIWWU7syIFalZ1n8ugllibwTVp+B5osBAJ0lQ9o	\N	$argon2id$v=19$m=65536,t=3,p=4$7RMHkNXzLl8pKdMMb80/kw$tz5tcIWWU7syIFalZ1n8ugllibwTVp+B5osBAJ0lQ9o	5925	2025-04-20 23:46:54.88	user	\N	\N	t	2025-04-20 23:41:54.859	2025-04-20 23:42:17.836	\N	\N
4b26238b-7d0a-4eb7-a637-2f3e982a73ae	Maximus	Danny	ombofficiall@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$C8cQ0Zh1WcIPyJ1dCx9deQ$FIWyeOy+H2eexCR9groVTBttH6kQjzXg8KtbYVxXNM8	\N	$argon2id$v=19$m=65536,t=3,p=4$C8cQ0Zh1WcIPyJ1dCx9deQ$FIWyeOy+H2eexCR9groVTBttH6kQjzXg8KtbYVxXNM8	8375	2025-04-10 09:52:41.93	user	\N	\N	t	2025-04-10 09:17:58.437	2025-04-10 09:48:22.904	\N	\N
0bef0fa5-9f55-4b01-a15a-db9defeb6037	Maximus	Bernard	bernardmayowaa@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$JRZsWizT79GeqWJlkk/+fQ$r3g4BreWj68jV/qmrxKI9vTWhr6RVf3cOn9xp8k54s0	08146694787	$argon2id$v=19$m=65536,t=3,p=4$JRZsWizT79GeqWJlkk/+fQ$r3g4BreWj68jV/qmrxKI9vTWhr6RVf3cOn9xp8k54s0	8435	2025-04-18 19:40:56.204	user	male	1990-01-01 00:00:00	t	2025-04-05 22:15:03.178	2025-04-18 19:36:19.688	\N	\N
636d84a6-57f0-4bfb-815f-0726d59e0f7e	Maximus	Danny	vawahi5337@bariswc.com	$argon2id$v=19$m=65536,t=3,p=4$3sEI0LNXLx71OqfVDSdl2A$+uFpwPaacpkIP7JBFbqzQKQXSGZg5j7uTYf9irx+p4c	\N	$argon2id$v=19$m=65536,t=3,p=4$3sEI0LNXLx71OqfVDSdl2A$+uFpwPaacpkIP7JBFbqzQKQXSGZg5j7uTYf9irx+p4c	6513	2025-04-10 10:12:25.353	user	\N	\N	t	2025-04-10 10:07:25.349	2025-04-10 10:09:42.93	\N	\N
54d69ac7-2f68-4dd6-8c33-9d491037b932	Taiwo	Mayowa	mayurtaiwo@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$57kxBuHDlUC8V4mw26QQIg$iISwQvGzz2V/tXb+8gqiZLjnLC890xzG47SrhHUREl0	\N	$argon2id$v=19$m=65536,t=3,p=4$57kxBuHDlUC8V4mw26QQIg$iISwQvGzz2V/tXb+8gqiZLjnLC890xzG47SrhHUREl0	7107	2025-04-17 05:57:36.445	user	\N	\N	f	2025-04-17 05:52:36.43	2025-04-17 05:52:36.446	\N	\N
087d83c9-e651-4a96-91f3-7cdc971b92e3	Jyfgytfuyg	Ghctrd67f	crtdrr@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$VW5Jphm1Wv6ipkc6XXIy0w$FIDJz5d94NINM46PmL9viajKwDNa3esaYh9GTqHN6Ik	\N	$argon2id$v=19$m=65536,t=3,p=4$VW5Jphm1Wv6ipkc6XXIy0w$FIDJz5d94NINM46PmL9viajKwDNa3esaYh9GTqHN6Ik	6386	2025-04-17 06:04:33.181	user	\N	\N	f	2025-04-17 05:59:33.177	2025-04-17 05:59:33.183	\N	\N
b58dd734-0484-4e90-8a6f-15d7fbe8ccfc	ken	morlylyy	mayowa@besttechnologiesltd.com	$argon2id$v=19$m=65536,t=3,p=4$1T1Gzi7ac7qsJPRx3XcNBg$01jviBALAR205ZINnb4YqjwF9sbKD6ureQ80N4DIXRw	\N	$argon2id$v=19$m=65536,t=3,p=4$1T1Gzi7ac7qsJPRx3XcNBg$01jviBALAR205ZINnb4YqjwF9sbKD6ureQ80N4DIXRw	9868	2025-04-10 13:25:33.222	user	\N	\N	t	2025-04-10 13:20:33.219	2025-04-10 13:22:01.247	\N	\N
368c3d88-c8e4-41c7-b960-1c5e98f898d6	Esther	Ola	demruthesther99@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$CrGln0gpTJMbzeSXtSwKpA$zm+WPbRZKslkZmKvbtPdQn6ltTFlE39/BgPdWrEF3jI	089465783645	$argon2id$v=19$m=65536,t=3,p=4$CrGln0gpTJMbzeSXtSwKpA$zm+WPbRZKslkZmKvbtPdQn6ltTFlE39/BgPdWrEF3jI	\N	2025-04-09 11:28:54.795	user	female	2025-06-13 00:00:00	t	2025-04-09 11:23:54.796	2025-04-09 11:25:41.626	\N	\N
e990f812-0b1a-452d-a342-f0133f3e4882	Maximus	Danny	omayowagold@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$JnMIGg4CKkllG21nHW1xHw$KWhWO05i4yBVcy5MzMgGASgdyPlpkEnEJ1VFWMM+d3s	08146694787	$argon2id$v=19$m=65536,t=3,p=4$JnMIGg4CKkllG21nHW1xHw$KWhWO05i4yBVcy5MzMgGASgdyPlpkEnEJ1VFWMM+d3s	1731	2025-04-09 20:16:18.306	user	male	1990-01-01 00:00:00	t	2025-04-05 22:40:29.322	2025-04-09 20:11:18.307	\N	\N
5f2d9c3c-23a1-42dc-ba59-dd6bd82e0bda	Test	Mobile	fenowa2144@anlocc.com	$argon2id$v=19$m=65536,t=3,p=4$ureAPWPONpNFkQ8LfyuYFg$DJRJa5yMTvrjiJN2IOb3FShDexQhA8eRj9oiCSqtzjU	\N	$argon2id$v=19$m=65536,t=3,p=4$ureAPWPONpNFkQ8LfyuYFg$DJRJa5yMTvrjiJN2IOb3FShDexQhA8eRj9oiCSqtzjU	7402	2025-04-10 16:30:46.501	user	\N	\N	f	2025-04-10 16:25:46.498	2025-04-10 16:25:49.165	\N	\N
a6b13196-4623-4245-b29e-a2a56100fa07	Ghchgvjyhv	Dftrctycvyt	gfdtrxr@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$mIlZRm9xAXHQFDAQ9EtzDw$uoPfctrSfEGgyg+3+7TddYUeMiZ/q0iVSudwf7Gz5Y4	\N	$argon2id$v=19$m=65536,t=3,p=4$mIlZRm9xAXHQFDAQ9EtzDw$uoPfctrSfEGgyg+3+7TddYUeMiZ/q0iVSudwf7Gz5Y4	1079	2025-04-17 06:26:24.742	user	\N	\N	f	2025-04-17 06:21:24.739	2025-04-17 06:21:24.743	\N	\N
d10e2c34-31cc-4012-be69-34e37c3c3915	lelo	Mofan	lelomof716@anlocc.com	$argon2id$v=19$m=65536,t=3,p=4$q/reY/ZIi8aQn4/BGoGR/g$0G9kHaFjYFdpk1+drMwREbL0uAlXgp99x55e3BdL5nM	\N	$argon2id$v=19$m=65536,t=3,p=4$q/reY/ZIi8aQn4/BGoGR/g$0G9kHaFjYFdpk1+drMwREbL0uAlXgp99x55e3BdL5nM	8649	2025-04-10 16:35:19.451	user	\N	\N	f	2025-04-10 16:30:19.449	2025-04-10 16:30:21.995	\N	\N
24e855fb-5546-4358-9ca0-dad0ab9ea995	testing	testing	testing2@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$LlHYh5S9HhWo7onsmWK9lw$XE8Kh5pTgVPClhhkyP+y0YGxX+azb+YfgySmU9L9Xr8	\N	$argon2id$v=19$m=65536,t=3,p=4$LlHYh5S9HhWo7onsmWK9lw$XE8Kh5pTgVPClhhkyP+y0YGxX+azb+YfgySmU9L9Xr8	9767	2025-04-17 08:14:11.772	user	\N	\N	t	2025-04-17 08:09:11.768	2025-04-17 08:09:41.498	\N	\N
c0cffcac-a054-4ca2-882d-91dbd1069a68	Kigolo	Anlocc	kiholov669@anlocc.com	$argon2id$v=19$m=65536,t=3,p=4$EFIbPQMiqIcNAfdOmVtZWQ$KivpfMPuT8Yg+ckpmMXKX3V+6eIsHfVtecfjPr5fkuM	\N	$argon2id$v=19$m=65536,t=3,p=4$EFIbPQMiqIcNAfdOmVtZWQ$KivpfMPuT8Yg+ckpmMXKX3V+6eIsHfVtecfjPr5fkuM	7514	2025-04-10 16:37:54.052	user	\N	\N	f	2025-04-10 16:32:54.051	2025-04-10 16:32:56.357	\N	\N
774153cf-c907-4303-8932-4c97779d7785	mayowa	adeyeye	testing3@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$BoUe5RRhlIWHjr36vL7KOg$LleTFCTedz+olIejsHI3Eo203Wq8HzhIu9fCNv45BLw	\N	$argon2id$v=19$m=65536,t=3,p=4$BoUe5RRhlIWHjr36vL7KOg$LleTFCTedz+olIejsHI3Eo203Wq8HzhIu9fCNv45BLw	1040	2025-04-17 10:44:52.863	user	\N	\N	f	2025-04-17 10:39:52.858	2025-04-17 10:39:52.863	\N	\N
c2fccf06-f936-40b0-a320-d15ec7e55795	Vickky	Shey	testing4@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$G6eWWx8iKIWeASdAtDqW2g$17xAj1L6SuTQVxa7ro/pG78ovSU5Bt/8K28XHGYmoNc	\N	$argon2id$v=19$m=65536,t=3,p=4$G6eWWx8iKIWeASdAtDqW2g$17xAj1L6SuTQVxa7ro/pG78ovSU5Bt/8K28XHGYmoNc	2263	2025-04-18 22:38:07.137	user	\N	\N	t	2025-04-18 22:33:07.133	2025-04-18 22:33:33.354	\N	\N
3e38d9af-e211-45ab-808e-ca8652f8f64c	Gold	Damilola	maholom846@asaption.com	$argon2id$v=19$m=65536,t=3,p=4$Q132I51UHMQWPsggxh8YYg$N/FvnTeMH/CN6LrlNHpZD1qCQElD41w1e84gRm+1ApU	\N	$argon2id$v=19$m=65536,t=3,p=4$Q132I51UHMQWPsggxh8YYg$N/FvnTeMH/CN6LrlNHpZD1qCQElD41w1e84gRm+1ApU	6224	2025-04-22 08:34:12.61	user	\N	\N	t	2025-04-22 08:29:12.606	2025-04-22 08:30:51.104	\N	\N
0cd61376-e43e-4b57-ab60-de91d72b8382	Temp 	Testing 	kayodeoluwajuwon9@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$7PluD10i7WPAAegGdThJ5Q$a3P6e2vxHa1HfzVBmMoZtdPjHY3dGIrEN4uk8Rj2ymM	\N	$argon2id$v=19$m=65536,t=3,p=4$7PluD10i7WPAAegGdThJ5Q$a3P6e2vxHa1HfzVBmMoZtdPjHY3dGIrEN4uk8Rj2ymM	7613	2025-04-22 16:07:07.784	user	\N	\N	t	2025-04-22 16:02:07.777	2025-04-22 16:04:21.719	\N	\N
44852313-60a6-43e5-b3db-7b75edfff6c3	Testing	New Latest	nebestpal@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$bSdgtjUwl+5kfNBsReVQeg$g1GNxU4mRwr8b2nz8T08IpouKBDq4L6VaU4rlapgrNI	\N	$argon2id$v=19$m=65536,t=3,p=4$bSdgtjUwl+5kfNBsReVQeg$g1GNxU4mRwr8b2nz8T08IpouKBDq4L6VaU4rlapgrNI	6013	2025-04-23 09:56:32.825	user	\N	\N	t	2025-04-23 09:51:32.82	2025-04-23 09:53:17.266	\N	\N
\.


--
-- Data for Name: Wallet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Wallet" (id, user_id, current_balance, all_time_fuunding, all_time_withdrawn, "isActive", "createdAt", "updatedAt") FROM stdin;
612f48bd-af14-4456-a215-49ee74e986bb	0cd61376-e43e-4b57-ab60-de91d72b8382	1330	2000	250	t	2025-04-22 16:02:10.233	2025-04-22 16:12:26.652
11ba84c6-97c1-4061-90b9-69715ef52db2	54d69ac7-2f68-4dd6-8c33-9d491037b932	0	0	0	t	2025-04-17 05:52:38.544	2025-04-17 05:52:38.544
31590c72-26c6-4178-bf70-bd376b553034	087d83c9-e651-4a96-91f3-7cdc971b92e3	0	0	0	t	2025-04-17 05:59:35.253	2025-04-17 05:59:35.253
90ac0145-d203-4f20-bde5-86f8731b3c07	a6b13196-4623-4245-b29e-a2a56100fa07	0	0	0	t	2025-04-17 06:21:26.804	2025-04-17 06:21:26.804
f7b6d3ab-e66a-4d7f-ab11-534db8965cb8	193319da-a841-4402-ab0d-a2f5d76afdc5	0	0	0	t	2025-04-17 06:23:02.109	2025-04-17 06:23:02.109
8d88387f-62d4-4863-b83b-378498fcb73b	24e855fb-5546-4358-9ca0-dad0ab9ea995	0	0	0	t	2025-04-17 08:09:13.796	2025-04-17 08:09:13.796
3e44aae6-fe01-4572-974c-12851406f081	774153cf-c907-4303-8932-4c97779d7785	0	0	0	t	2025-04-17 10:39:54.905	2025-04-17 10:39:54.905
c9c20a1e-3173-46d7-9b61-5bf5271dd842	70b59c24-d647-480a-a9a9-d7ea570d9d9c	536900	626300	75600	t	2025-04-05 23:47:11.195	2025-04-23 07:31:25.783
1df3186d-b261-4570-905d-023b58afdea3	44852313-60a6-43e5-b3db-7b75edfff6c3	6850	14150	3650	t	2025-04-23 09:51:35.007	2025-04-23 10:00:25.146
b1057154-5c51-42ca-9e8b-4ff26f3bc105	0bef0fa5-9f55-4b01-a15a-db9defeb6037	133485	234900	8800	t	2025-04-05 23:47:31.744	2025-04-24 19:10:43.269
287a0429-bccd-4f87-b06d-d52c310726e2	c2fccf06-f936-40b0-a320-d15ec7e55795	10850	11350	500	t	2025-04-18 22:33:09.076	2025-04-18 22:53:59.161
d3c962ce-5354-4c8c-8c15-c5a8b3600c1e	a56ab61f-9396-44e4-8bf5-819ee54f0f83	0	0	0	t	2025-04-20 23:41:56.997	2025-04-20 23:41:56.997
d9bbb952-4b8c-4492-b34d-bc2413a54e71	e990f812-0b1a-452d-a342-f0133f3e4882	314000	314000	0	t	2025-04-05 22:42:42.948	2025-04-09 15:04:57.253
42c979d8-448f-49d0-ab10-62afe6343629	4b26238b-7d0a-4eb7-a637-2f3e982a73ae	0	0	0	t	2025-04-10 09:18:00.879	2025-04-10 09:18:00.879
84e9058e-480a-44e7-8e6e-bfe2d0585ac4	368c3d88-c8e4-41c7-b960-1c5e98f898d6	22000	22000	0	t	2025-04-09 11:25:41.563	2025-04-10 10:21:21.05
d314ec18-4c23-432f-86f1-2b40c79c2a84	636d84a6-57f0-4bfb-815f-0726d59e0f7e	19400	19400	0	t	2025-04-10 10:07:27.686	2025-04-10 11:30:48.352
fb61fbdb-6149-4060-849d-9703958e8355	b58dd734-0484-4e90-8a6f-15d7fbe8ccfc	3250	5000	500	t	2025-04-10 13:20:41.696	2025-04-10 13:37:08.496
8ecef60e-7183-4055-9592-cfc002e7ddb7	5f2d9c3c-23a1-42dc-ba59-dd6bd82e0bda	0	0	0	t	2025-04-10 16:25:49.079	2025-04-10 16:25:49.079
18e7ad0e-592d-4e03-964e-0055f80885b6	d10e2c34-31cc-4012-be69-34e37c3c3915	0	0	0	t	2025-04-10 16:30:21.93	2025-04-10 16:30:21.93
952e1447-be77-4c2b-abc7-cb5d6e7b28e4	c0cffcac-a054-4ca2-882d-91dbd1069a68	0	0	0	t	2025-04-10 16:32:56.298	2025-04-10 16:32:56.298
69de0e48-bcab-495e-9033-aa9f7b6dd602	3e38d9af-e211-45ab-808e-ca8652f8f64c	25670	28000	230	t	2025-04-22 08:29:15.576	2025-04-22 13:47:04.209
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
65716f23-8a55-49dd-b4ab-da1a027635c6	dfa5a7df290e2facd12ae555823c6a1a8ea353897e31742aa2fba75d5280306e	2025-04-05 23:13:21.12506+01	20250405220201_init	\N	\N	2025-04-05 23:13:21.083828+01	1
872d0e61-a673-410c-9936-8924029d6d77	d76d6a76f3729c65de8acbd0296ee301d785d964e343cb14313e84810964eb2e	2025-04-07 23:27:25.598255+01	20250407222725_comeplete_card_schema	\N	\N	2025-04-07 23:27:25.596425+01	1
be7558da-106f-4813-8e9b-01f793de2fd2	2854af1a07b0b1c53ce40b2c7c737982ad7de89f59564732865915870af778b8	2025-04-06 21:46:36.970133+01	20250406204636_added_card_model	\N	\N	2025-04-06 21:46:36.956638+01	1
e63ce7d3-33ef-4e55-bbdf-1f54d88b0d76	ed1747c0b89e91b6aa682a9fbed58a9ca0e0984ff673b140751eabf31f658aca	2025-04-06 21:58:37.087678+01	20250406205837_added_birdge_currency_type	\N	\N	2025-04-06 21:58:37.083336+01	1
1a774ac9-4e5c-49cc-b603-ba880fbe3656	da3d438c7b9825f0e3eeb646b406f3ffa607f1086af8ed7989a008a9cd5baf44	2025-04-13 15:04:23.707052+01	20250413140423_added_enum_for_credit_debit	\N	\N	2025-04-13 15:04:23.700806+01	1
031e516e-e8d9-44dd-bf32-26ed9474c6b6	f7c0d3a603dcb939825887e197b71a97e24f70ecd3c88f6557fdfe07f53739da	2025-04-07 12:11:50.100143+01	20250407111150_added	\N	\N	2025-04-07 12:11:50.097869+01	1
ad88dfad-6b50-4750-826c-1f3e20213380	9cf91b9742e178739a32f49bdffef27e1f05b1bf9a8f70fffcda539c42d3ba19	2025-04-07 23:44:59.303202+01	20250407224459_comeplete_card_schema	\N	\N	2025-04-07 23:44:59.301353+01	1
d3859958-beb0-4fa1-b461-78ef3b514250	928ab20d531c42a1f45f62ff57942c23b9487e3ebe85b18e29c68c9837a93fb0	2025-04-07 13:37:44.499553+01	20250407123744_added	\N	\N	2025-04-07 13:37:44.486355+01	1
9a57ae5b-5313-4412-b59d-73c74b288516	9aa70f3ade628ee248d051afb95cef3e9c129653c72b03303e398ceb424541d3	2025-04-07 13:55:06.447639+01	20250407125506_edited_id_number	\N	\N	2025-04-07 13:55:06.442113+01	1
cfaed4fa-02ab-4170-a679-44689af685c6	b864641c7b200c62998752402ce0a43da0a0279a5a0c5a6e88f91139b8dd3437	2025-04-07 14:34:48.171198+01	20250407133448_edited_id_number	\N	\N	2025-04-07 14:34:48.169308+01	1
676e0748-ab57-4a31-90f0-f8d9cd6a8d20	a213b70d0c2daa3e82da58c951c2fbcf05355a52c6cc3baf3d9e9a374a9db645	2025-04-07 23:46:32.256392+01	20250407224632_comeplete_card_schema	\N	\N	2025-04-07 23:46:32.251124+01	1
03c1851b-6517-47b0-ac44-22a30d54bb99	1efc72378e16c271c3c40899fc0dd2b2d8a784c89275d7fe9dea390e60c8ef17	2025-04-07 14:49:36.416572+01	20250407134936_edited_id_number	\N	\N	2025-04-07 14:49:36.410018+01	1
4c208620-d257-4f2a-9fa9-e4a94c3c2415	b3a3d9af6303eca0dbce12b0d101b0ad465d5cdf87e8d65f844fdef8c4c73fcd	2025-04-07 15:04:14.632638+01	20250407140414_edited_id_number	\N	\N	2025-04-07 15:04:14.630008+01	1
2839fdd7-5a07-431d-af3e-ad3884b9f271	0a6807948a3a02c634819f82dd57008e3aa6cca2613c7254767a31a217170cba	2025-04-18 22:53:10.692108+01	20250418215310_added_currenc_type	\N	\N	2025-04-18 22:53:10.687119+01	1
7d7ec92d-3914-408a-abe8-42925d2650cb	1c524082737ea5b8d03de88d3bc84d388478bb045329fbe4a8bc9688b3559349	2025-04-07 16:39:42.55906+01	20250407153942_comeplete_card_schema	\N	\N	2025-04-07 16:39:42.55418+01	1
0143ed0c-f4f6-4c9d-9cbf-094539d38492	dfb707e2f6802953119516bbb81a2094c964056632bba13ca3c3bbe54fbf0375	2025-04-08 10:39:39.253763+01	20250408093939_complete_create_card_schema	\N	\N	2025-04-08 10:39:39.249596+01	1
3950daa3-49aa-444f-8da0-5019abd5d101	b970a4dc7cc996cce2ddac334b20abdab675c4708e9aa3691255e9b324672fe0	2025-04-07 16:41:59.356016+01	20250407154159_comeplete_card_schema	\N	\N	2025-04-07 16:41:59.354166+01	1
05f7d6c7-3d32-45c8-982c-46bb0dc4b63d	9d26fb4b2ff13201f74aae5e70889d6696cb1cb02ac6b3c52a56ed9f18f5bf0c	2025-04-07 16:49:22.624609+01	20250407154922_comeplete_card_schema	\N	\N	2025-04-07 16:49:22.621709+01	1
a6d394f6-f5e5-4a83-9c4d-62fac447cc1c	31b4023ab3b41ae4da67c4944898e942cc260d46f2e6684c408077022abf4c24	2025-04-14 23:55:27.725773+01	20250414225527_added_flw_tmep_acct_generation	\N	\N	2025-04-14 23:55:27.690874+01	1
2eba7f33-9a3a-4580-abe7-97386f9a6fc4	3fdde812e570230dfffbe4a0db65148cd5fff4dd66385d39d604dff1cc965820	2025-04-07 22:20:03.498105+01	20250407212003_comeplete_card_schema	\N	\N	2025-04-07 22:20:03.495943+01	1
3feafcb6-aab0-474c-9da4-3dd1ec97de2f	0ec500a79f6202ff30cfd0023a49403bd40251f452719592fe75440dfa10caf6	2025-04-09 15:41:48.098339+01	20250409144148_added_relation_to_wallet_and_user	\N	\N	2025-04-09 15:41:48.09287+01	1
4bf354d7-bafb-47d7-9138-9dd8b57303ce	c7fb08a6431dcd0d12714361e8484afd32624e83798de35ecd5e53ff34098ec2	2025-04-10 11:27:22.63075+01	20250410102722_added_paystack_auth_url	\N	\N	2025-04-10 11:27:22.627861+01	1
10381088-70dd-482c-9371-aa51b9d1ebe2	d56b63f1fd6d669fc87816dcd4852c98b51b4646e05bae4da1a6ae79a19db4b6	2025-04-17 15:04:04.207213+01	20250417140404_update_account	\N	\N	2025-04-17 15:04:04.204+01	1
97f0883a-2cea-4636-a882-8912039bb8bb	2652a4ceb61551be07107a2865d6002a23d3fef659c366bae4569e051743cfd2	2025-04-11 17:25:53.708465+01	20250411162553_added_four_digit_pin	\N	\N	2025-04-11 17:25:53.701132+01	1
f5ef7145-3970-46d7-aacb-98653e855ccd	3acb815624318ac8c1503acdb81aeb4e5dccda7c6941bd581d7e045d4b85ed35	2025-04-15 00:01:26.773133+01	20250414230126_added_order_no	\N	\N	2025-04-15 00:01:26.770584+01	1
93e1195e-8829-4e32-bd31-7bd710529270	3995f12abde1a3da3f4df4a7491bcef026385e6c6cb795a189efe6bfd88272b1	2025-04-11 17:28:36.012665+01	20250411162836_added_four_digit_pin	\N	\N	2025-04-11 17:28:36.007767+01	1
4dfb38af-9d38-4190-9d9f-6e4cf84f1b36	254a634b06e876d92e79965a418cbbb07d4ea7a58052516ba6e3c48b27dc368d	2025-04-15 00:02:34.077761+01	20250414230234_added_order_no	\N	\N	2025-04-15 00:02:34.074992+01	1
34ef0ffc-a51e-420b-b889-1fef1d3241f2	aea130223f5a65e7c100f76cf2a4c48eb9eae590f88c58481524013a37594dbb	2025-04-15 00:04:02.148878+01	20250414230402_added_order_no	\N	\N	2025-04-15 00:04:02.146934+01	1
22f1601b-9c7c-4579-b441-093a6b02f751	8918fc6bc0079e91182bec2cf1be26dafcba30fd148d87ac1f37d09c7bbf2688	2025-04-18 13:12:38.746127+01	20250418121238_added_currenc_type	\N	\N	2025-04-18 13:12:38.743335+01	1
81c7b989-63c9-4b94-a897-cae00669e667	97d158713b2b298486f8b99f90c4fdecb4ae250310eaa047534b8da7df57229b	2025-04-15 00:11:22.661427+01	20250414231122_added_order_no	\N	\N	2025-04-15 00:11:22.659365+01	1
0d6185f9-370d-4396-9fc3-d0b14b372202	ea709b6a6c3626529296473dacfc359ea33fed485b5f5282f130d520fcac3387	2025-04-18 13:29:13.643302+01	20250418122913_added_currenc_type	\N	\N	2025-04-18 13:29:13.638109+01	1
\.


--
-- Name: Bookmark_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Bookmark_id_seq"', 1, false);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: Bookmark Bookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_pkey" PRIMARY KEY (id);


--
-- Name: Card Card_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_pkey" PRIMARY KEY (id);


--
-- Name: FlwTempAcctNumber FlwTempAcctNumber_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FlwTempAcctNumber"
    ADD CONSTRAINT "FlwTempAcctNumber_pkey" PRIMARY KEY (id);


--
-- Name: KycVerification KycVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KycVerification"
    ADD CONSTRAINT "KycVerification_pkey" PRIMARY KEY (id);


--
-- Name: ProfileImage ProfileImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProfileImage"
    ADD CONSTRAINT "ProfileImage_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: SenderDetails SenderDetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SenderDetails"
    ADD CONSTRAINT "SenderDetails_pkey" PRIMARY KEY (id);


--
-- Name: TransactionHistory TransactionHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY (id);


--
-- Name: TransactionIcon TransactionIcon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionIcon"
    ADD CONSTRAINT "TransactionIcon_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Wallet Wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Wallet"
    ADD CONSTRAINT "Wallet_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Address_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Address_userId_key" ON public."Address" USING btree ("userId");


--
-- Name: KycVerification_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "KycVerification_userId_key" ON public."KycVerification" USING btree ("userId");


--
-- Name: ProfileImage_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProfileImage_userId_key" ON public."ProfileImage" USING btree ("userId");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RefreshToken_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_userId_key" ON public."RefreshToken" USING btree ("userId");


--
-- Name: SenderDetails_transaction_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SenderDetails_transaction_id_key" ON public."SenderDetails" USING btree (transaction_id);


--
-- Name: TransactionHistory_transaction_reference_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TransactionHistory_transaction_reference_key" ON public."TransactionHistory" USING btree (transaction_reference);


--
-- Name: TransactionIcon_transaction_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TransactionIcon_transaction_id_key" ON public."TransactionIcon" USING btree (transaction_id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Wallet_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Wallet_user_id_key" ON public."Wallet" USING btree (user_id);


--
-- Name: expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX expires_at_idx ON public."RefreshToken" USING btree ("expiresAt");


--
-- Name: Account Account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Address Address_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Card Card_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Card"
    ADD CONSTRAINT "Card_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FlwTempAcctNumber FlwTempAcctNumber_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FlwTempAcctNumber"
    ADD CONSTRAINT "FlwTempAcctNumber_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: KycVerification KycVerification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KycVerification"
    ADD CONSTRAINT "KycVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileImage ProfileImage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProfileImage"
    ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SenderDetails SenderDetails_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SenderDetails"
    ADD CONSTRAINT "SenderDetails_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."TransactionHistory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransactionIcon TransactionIcon_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransactionIcon"
    ADD CONSTRAINT "TransactionIcon_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."TransactionHistory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Wallet Wallet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Wallet"
    ADD CONSTRAINT "Wallet_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

