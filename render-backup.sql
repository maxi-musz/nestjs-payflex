--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 16.8 (Debian 16.8-1.pgdg120+1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: db_payflex_latest_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO db_payflex_latest_user;

--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."AccountType" AS ENUM (
    'savings',
    'current',
    'investment'
);


ALTER TYPE public."AccountType" OWNER TO db_payflex_latest_user;

--
-- Name: CurrencyType; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."CurrencyType" AS ENUM (
    'ngn',
    'usd',
    'gbp',
    'eur'
);


ALTER TYPE public."CurrencyType" OWNER TO db_payflex_latest_user;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."Gender" AS ENUM (
    'male',
    'female'
);


ALTER TYPE public."Gender" OWNER TO db_payflex_latest_user;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'paystack',
    'card',
    'bank_transfer',
    'wallet',
    'ussd'
);


ALTER TYPE public."PaymentMethod" OWNER TO db_payflex_latest_user;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."Role" AS ENUM (
    'user',
    'admin',
    'super_admin'
);


ALTER TYPE public."Role" OWNER TO db_payflex_latest_user;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'pending',
    'success',
    'failed',
    'cancelled'
);


ALTER TYPE public."TransactionStatus" OWNER TO db_payflex_latest_user;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: db_payflex_latest_user
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


ALTER TYPE public."TransactionType" OWNER TO db_payflex_latest_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    user_id text NOT NULL,
    account_number text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    currency public."CurrencyType" NOT NULL,
    bank_name text NOT NULL,
    bank_code text NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Account" OWNER TO db_payflex_latest_user;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "userId" text NOT NULL,
    city text,
    state text,
    country text,
    home_address text
);


ALTER TABLE public."Address" OWNER TO db_payflex_latest_user;

--
-- Name: Bookmark; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."Bookmark" (
    id integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    link text NOT NULL
);


ALTER TABLE public."Bookmark" OWNER TO db_payflex_latest_user;

--
-- Name: Bookmark_id_seq; Type: SEQUENCE; Schema: public; Owner: db_payflex_latest_user
--

CREATE SEQUENCE public."Bookmark_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Bookmark_id_seq" OWNER TO db_payflex_latest_user;

--
-- Name: Bookmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: db_payflex_latest_user
--

ALTER SEQUENCE public."Bookmark_id_seq" OWNED BY public."Bookmark".id;


--
-- Name: ProfileImage; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."ProfileImage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    secure_url text NOT NULL,
    public_id text NOT NULL
);


ALTER TABLE public."ProfileImage" OWNER TO db_payflex_latest_user;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO db_payflex_latest_user;

--
-- Name: SenderDetails; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."SenderDetails" (
    id text NOT NULL,
    transaction_id text NOT NULL,
    sender_name text NOT NULL,
    sender_bank text NOT NULL,
    sender_account_number text NOT NULL
);


ALTER TABLE public."SenderDetails" OWNER TO db_payflex_latest_user;

--
-- Name: TransactionHistory; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
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
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TransactionHistory" OWNER TO db_payflex_latest_user;

--
-- Name: TransactionIcon; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."TransactionIcon" (
    id text NOT NULL,
    transaction_id text NOT NULL,
    secure_url text NOT NULL,
    public_id text NOT NULL
);


ALTER TABLE public."TransactionIcon" OWNER TO db_payflex_latest_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
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
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO db_payflex_latest_user;

--
-- Name: Wallet; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
--

CREATE TABLE public."Wallet" (
    id text NOT NULL,
    user_id text NOT NULL,
    currency public."CurrencyType" NOT NULL,
    balance double precision DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Wallet" OWNER TO db_payflex_latest_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: db_payflex_latest_user
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


ALTER TABLE public._prisma_migrations OWNER TO db_payflex_latest_user;

--
-- Name: Bookmark id; Type: DEFAULT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Bookmark" ALTER COLUMN id SET DEFAULT nextval('public."Bookmark_id_seq"'::regclass);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."Account" (id, user_id, account_number, "accountType", currency, bank_name, bank_code, balance, "isActive", "createdAt", "updatedAt") FROM stdin;
b2c3d4e5-6789-0123-4567-890123456789	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	0987654321	savings	usd	Chase Bank	CHAS	2000	t	2025-04-02 16:59:50.794	2025-04-02 16:59:50.794
a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	1234567890	current	ngn	First Bank	011	49000	t	2025-04-02 16:59:50.794	2025-04-02 16:59:50.794
\.


--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."Address" (id, "userId", city, state, country, home_address) FROM stdin;
4fdfc083-0855-4eeb-9af0-d9e251bcdc70	d71197a4-d62c-4334-9bdb-882a70f8cb33	San Francisco	California	United States	123 Main St
495431cf-0993-4d57-a27d-d52c653eaf8f	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	San Francisco	California	United States	123 Main St
ee9c23fe-b952-4fa3-9f43-50c4616077fd	29a44e7d-2678-4557-9b5e-e5c9d34f6a8c	Awka	Anambra	Nigeria	12 Pat-Clara close GRA Awka
\.


--
-- Data for Name: Bookmark; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."Bookmark" (id, "createdAt", "updatedAt", title, description, link) FROM stdin;
\.


--
-- Data for Name: ProfileImage; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."ProfileImage" (id, "userId", secure_url, public_id) FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
1c5d9add-76cd-41c5-9188-f58df4f74b46	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNzExOTdhNC1kNjJjLTQzMzQtOWJkYi04ODJhNzBmOGNiMzMiLCJpYXQiOjE3NDM2MTQ1NzksImV4cCI6MTc0NDIxOTM3OX0.puICtI-qonfq06zrfpKsnvJ--VmkOsgNgezWgTdErIs	d71197a4-d62c-4334-9bdb-882a70f8cb33	2025-04-03 17:22:59.462	2025-04-02 17:22:59.464
\.


--
-- Data for Name: SenderDetails; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."SenderDetails" (id, transaction_id, sender_name, sender_bank, sender_account_number) FROM stdin;
a0653a9a-b17e-4806-811e-be9963e8c10e	3e2a49f5-c20b-4c0c-ba7f-c71aa3e6eaec	Jane Smith	Zenith Bank	001000000001
b9fdf987-2f60-4a1a-90c0-e17c2290aee2	ec82928c-9231-4d63-a91c-68ac10a35f24	John Doe	GTBank	001000000006
840438c5-1734-471e-80de-60fcf5d715f4	7c0bdbcd-a647-4fa5-baa5-826ad5be2edc	Sarah Johnson	Barclays	112000000003
b95dfa17-8302-4410-a6f4-691382d8a1fe	3b2a42cc-9327-422e-a130-b08a8f3afeac	Sarah Johnson	Barclays	112000000007
\.


--
-- Data for Name: TransactionHistory; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."TransactionHistory" (id, account_id, user_id, amount, transaction_type, description, status, recipient_mobile, currency_type, payment_method, fee, transaction_number, transaction_reference, session_id, "createdAt", "updatedAt") FROM stdin;
3e2a49f5-c20b-4c0c-ba7f-c71aa3e6eaec	\N	d71197a4-d62c-4334-9bdb-882a70f8cb33	1500	transfer	Transfer to friend	success	08012345671	usd	bank_transfer	10	TRX-1-1743613190.793734	TX-1743613191-1	session_1	2025-04-01 16:59:50.794	2025-04-01 16:59:50.794
8f209be5-808c-468b-ac52-afb4f8ad5dfb	a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	2000	airtime	Airtime purchase	failed	08012345672	eur	wallet	20	TRX-2-1743613190.793734	TX-1743613191-2	session_2	2025-03-31 16:59:50.794	2025-03-31 16:59:50.794
4614ba3f-7eb7-48e9-82ae-4aae37321dfb	\N	d71197a4-d62c-4334-9bdb-882a70f8cb33	2500	data	Mobile data	cancelled	\N	ngn	ussd	30	TRX-3-1743613190.793734	TX-1743613191-3	session_3	2025-03-30 16:59:50.794	2025-03-30 16:59:50.794
50de62bb-962c-4374-910b-0231d91fd085	a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	3000	cable	DSTV subscription	pending	08012345674	usd	card	40	TRX-4-1743613190.793734	TX-1743613191-4	session_4	2025-03-29 16:59:50.794	2025-03-29 16:59:50.794
39e44685-b403-499f-9601-07fe80cb140a	\N	d71197a4-d62c-4334-9bdb-882a70f8cb33	3500	deposit	Salary deposit	success	08012345675	eur	bank_transfer	50	TRX-5-1743613190.793734	TX-1743613191-5	session_5	2025-03-28 16:59:50.794	2025-03-28 16:59:50.794
ec82928c-9231-4d63-a91c-68ac10a35f24	a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	4000	transfer	Transfer to friend	failed	\N	ngn	wallet	60	TRX-6-1743613190.793734	TX-1743613191-6	session_6	2025-03-27 16:59:50.794	2025-03-27 16:59:50.794
fd2e8d16-88ce-46db-a51f-be148d38c6b2	\N	d71197a4-d62c-4334-9bdb-882a70f8cb33	4500	airtime	Airtime purchase	cancelled	08012345677	usd	ussd	70	TRX-7-1743613190.793734	TX-1743613191-7	session_7	2025-03-26 16:59:50.794	2025-03-26 16:59:50.794
ab48b4b3-accf-4943-bf22-01d84bc03d4f	a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	5000	data	Mobile data	pending	08012345678	eur	card	80	TRX-8-1743613190.793734	TX-1743613191-8	session_8	2025-03-25 16:59:50.794	2025-03-25 16:59:50.794
b4d3c6fe-8de3-4b4b-b819-a5dfadbbf1d8	\N	d71197a4-d62c-4334-9bdb-882a70f8cb33	5500	cable	DSTV subscription	success	\N	ngn	bank_transfer	90	TRX-9-1743613190.793734	TX-1743613191-9	session_9	2025-03-24 16:59:50.794	2025-03-24 16:59:50.794
e221edec-28b1-41be-9633-ef3de87d0399	a1b2c3d4-5678-9012-3456-789012345678	d71197a4-d62c-4334-9bdb-882a70f8cb33	6000	deposit	Salary deposit	failed	08012345670	usd	wallet	100	TRX-10-1743613190.793734	TX-1743613191-10	session_10	2025-03-23 16:59:50.794	2025-03-23 16:59:50.794
7d17bb6e-4bc3-41b3-bec5-bad5d5fdfe06	\N	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	700	education	School fees	success	08076543211	gbp	bank_transfer	5	TRX-11-1743613190.793734	TX-1743613191-11	session_11	2025-03-31 16:59:50.794	2025-03-31 16:59:50.794
f35d5bfb-a1f8-4bc8-ae79-7e836858ae91	b2c3d4e5-6789-0123-4567-890123456789	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	900	betting	Sports betting	failed	\N	usd	wallet	10	TRX-12-1743613190.793734	TX-1743613191-12	session_12	2025-03-29 16:59:50.794	2025-03-29 16:59:50.794
7c0bdbcd-a647-4fa5-baa5-826ad5be2edc	\N	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	1100	transfer	Money transfer	pending	08076543213	gbp	card	15	TRX-13-1743613190.793734	TX-1743613191-13	session_13	2025-03-27 16:59:50.794	2025-03-27 16:59:50.794
fbe93fed-dbec-446b-8825-9ea7f9821ec1	b2c3d4e5-6789-0123-4567-890123456789	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	1300	deposit	Freelance payment	success	\N	usd	bank_transfer	20	TRX-14-1743613190.793734	TX-1743613191-14	session_14	2025-03-25 16:59:50.794	2025-03-25 16:59:50.794
3fcab09f-1012-479b-87ee-6fedda520e91	\N	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	1500	education	School fees	failed	08076543215	gbp	wallet	25	TRX-15-1743613190.793734	TX-1743613191-15	session_15	2025-03-23 16:59:50.794	2025-03-23 16:59:50.794
c05b6529-0d85-44c7-adb1-75fc2576c48c	b2c3d4e5-6789-0123-4567-890123456789	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	1700	betting	Sports betting	pending	\N	usd	card	30	TRX-16-1743613190.793734	TX-1743613191-16	session_16	2025-03-21 16:59:50.794	2025-03-21 16:59:50.794
3b2a42cc-9327-422e-a130-b08a8f3afeac	\N	4b1819a9-39f7-4f1d-b129-956d33a4d5f2	1900	transfer	Money transfer	success	08076543217	gbp	bank_transfer	35	TRX-17-1743613190.793734	TX-1743613191-17	session_17	2025-03-19 16:59:50.794	2025-03-19 16:59:50.794
\.


--
-- Data for Name: TransactionIcon; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."TransactionIcon" (id, transaction_id, secure_url, public_id) FROM stdin;
a41e56c6-bd0e-41ad-8056-c06ef8a5d5ca	3e2a49f5-c20b-4c0c-ba7f-c71aa3e6eaec	https://example.com/icons/tx-1.png	icon_tx_1
e1ebd731-0430-49c8-94ac-96976cd7e479	8f209be5-808c-468b-ac52-afb4f8ad5dfb	https://example.com/icons/tx-2.png	icon_tx_2
ad3e63ef-18b0-4b0a-b1bb-717588001ddc	4614ba3f-7eb7-48e9-82ae-4aae37321dfb	https://example.com/icons/tx-3.png	icon_tx_3
9cd5d5e5-5a1a-44f6-9c05-d64486a574f7	50de62bb-962c-4374-910b-0231d91fd085	https://example.com/icons/tx-4.png	icon_tx_4
0c2ea005-beae-49c3-852f-86393b4697dd	39e44685-b403-499f-9601-07fe80cb140a	https://example.com/icons/tx-5.png	icon_tx_5
68ba05ba-fca7-4102-95b3-e29636d140b3	ec82928c-9231-4d63-a91c-68ac10a35f24	https://example.com/icons/tx-6.png	icon_tx_6
a87b41c5-3faa-4941-97cc-7a0c925a3a7d	fd2e8d16-88ce-46db-a51f-be148d38c6b2	https://example.com/icons/tx-7.png	icon_tx_7
c7dd3731-88c9-49ef-a942-a8c829603d28	ab48b4b3-accf-4943-bf22-01d84bc03d4f	https://example.com/icons/tx-8.png	icon_tx_8
129139c5-abde-4121-ad55-f8807509e6a2	b4d3c6fe-8de3-4b4b-b819-a5dfadbbf1d8	https://example.com/icons/tx-9.png	icon_tx_9
8927e5dd-6d4b-4496-888d-6f061a55e337	e221edec-28b1-41be-9633-ef3de87d0399	https://example.com/icons/tx-10.png	icon_tx_10
14f43462-46a8-4979-82d5-37875e961c72	7d17bb6e-4bc3-41b3-bec5-bad5d5fdfe06	https://example.com/icons/tx-11.png	icon_tx_11
9952328a-56a2-4dc3-9bd8-0fce1b711265	f35d5bfb-a1f8-4bc8-ae79-7e836858ae91	https://example.com/icons/tx-12.png	icon_tx_12
c3bce811-636b-490a-be17-a1b694cbbf51	7c0bdbcd-a647-4fa5-baa5-826ad5be2edc	https://example.com/icons/tx-13.png	icon_tx_13
c718d105-fe59-47c2-a334-4667a0015f76	fbe93fed-dbec-446b-8825-9ea7f9821ec1	https://example.com/icons/tx-14.png	icon_tx_14
047d7b25-d3bc-484c-8553-8d0ba43d7996	3fcab09f-1012-479b-87ee-6fedda520e91	https://example.com/icons/tx-15.png	icon_tx_15
d0798e35-8110-4812-bd94-47c4c7238ae7	c05b6529-0d85-44c7-adb1-75fc2576c48c	https://example.com/icons/tx-16.png	icon_tx_16
e195fb32-ec9b-46d6-919b-6e70f07ae8d7	3b2a42cc-9327-422e-a130-b08a8f3afeac	https://example.com/icons/tx-17.png	icon_tx_17
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."User" (id, first_name, last_name, email, hash, phone_number, password, otp, otp_expires_at, role, gender, date_of_birth, is_email_verified, "createdAt", "updatedAt") FROM stdin;
d71197a4-d62c-4334-9bdb-882a70f8cb33	Mayowa	Bernard	bernardmayowaa@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$w6DONU18NeoT91/lV3HV6g$0PFqfzWEvBPInzep/tW/B5FRtqHWZG4YOdRzYx8MSIU	08146694787	$argon2id$v=19$m=65536,t=3,p=4$w6DONU18NeoT91/lV3HV6g$0PFqfzWEvBPInzep/tW/B5FRtqHWZG4YOdRzYx8MSIU	\N	2025-04-02 16:51:38.436	user	male	1990-01-01 00:00:00	t	2025-04-02 16:46:38.438	2025-04-02 16:50:18.461
4b1819a9-39f7-4f1d-b129-956d33a4d5f2	Maximus	Danny	adeyeye.toyorsi@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$H6K30FVHIb4GKConJbK96w$sAOW7q0DCPLhJ/BGMXUFOiaardACevhhvJ3Iq0STb/k	08146694787	$argon2id$v=19$m=65536,t=3,p=4$H6K30FVHIb4GKConJbK96w$sAOW7q0DCPLhJ/BGMXUFOiaardACevhhvJ3Iq0STb/k	\N	2025-04-02 16:55:46.194	user	male	1990-01-01 00:00:00	t	2025-04-02 16:50:46.195	2025-04-02 16:51:46.561
29a44e7d-2678-4557-9b5e-e5c9d34f6a8c	Viikthor	Okoye	victor.c.okoye@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$J55ztBLIXc+4GOBggGCHbA$f5tkAtFTj/DjrDoZRjzvrNByd8f8cWuF0GPK/bZKtcA	08028845693	$argon2id$v=19$m=65536,t=3,p=4$J55ztBLIXc+4GOBggGCHbA$f5tkAtFTj/DjrDoZRjzvrNByd8f8cWuF0GPK/bZKtcA	\N	2025-04-03 11:14:10.238	user	male	2023-12-06 00:00:00	t	2025-04-03 10:46:11.599	2025-04-03 11:09:47.035
8009d291-7735-4418-bd8d-2bcd2250da9b	\N	\N	erryyrtt@gmail.com	\N	\N	\N	6046	2025-04-04 09:45:20.414	user	\N	\N	f	2025-04-04 09:40:20.454	2025-04-04 09:40:20.454
\.


--
-- Data for Name: Wallet; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public."Wallet" (id, user_id, currency, balance, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: db_payflex_latest_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c9c52049-ab61-490c-a6bf-937fba6870a4	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2025-04-02 16:35:50.379403+00	20250402092356_init	\N	\N	2025-04-02 16:35:48.937621+00	1
6aee0f38-9ea7-4a07-bd57-642f3ae4349a	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2025-04-02 16:35:53.019081+00	20250402141202_fix_user_account_relation	\N	\N	2025-04-02 16:35:50.962941+00	1
34ac471d-c05e-433b-9b56-fa4a1a40406b	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2025-04-02 16:35:55.035926+00	20250402144124_fix_user_account_relation	\N	\N	2025-04-02 16:35:53.586042+00	1
3661bab3-9cff-48a3-aa70-5b3ec3e0ecc6	5b97f9b67836a9f53eabc44891668e4ec18874c5712353ddd30327920cbd2266	2025-04-02 16:35:57.693757+00	20250402160246_full_schema	\N	\N	2025-04-02 16:35:55.593976+00	1
\.


--
-- Name: Bookmark_id_seq; Type: SEQUENCE SET; Schema: public; Owner: db_payflex_latest_user
--

SELECT pg_catalog.setval('public."Bookmark_id_seq"', 1, false);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: Bookmark Bookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_pkey" PRIMARY KEY (id);


--
-- Name: ProfileImage ProfileImage_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."ProfileImage"
    ADD CONSTRAINT "ProfileImage_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: SenderDetails SenderDetails_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."SenderDetails"
    ADD CONSTRAINT "SenderDetails_pkey" PRIMARY KEY (id);


--
-- Name: TransactionHistory TransactionHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."TransactionHistory"
    ADD CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY (id);


--
-- Name: TransactionIcon TransactionIcon_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."TransactionIcon"
    ADD CONSTRAINT "TransactionIcon_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Wallet Wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Wallet"
    ADD CONSTRAINT "Wallet_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_account_number_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "Account_account_number_key" ON public."Account" USING btree (account_number);


--
-- Name: Address_userId_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "Address_userId_key" ON public."Address" USING btree ("userId");


--
-- Name: ProfileImage_userId_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "ProfileImage_userId_key" ON public."ProfileImage" USING btree ("userId");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: RefreshToken_userId_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "RefreshToken_userId_key" ON public."RefreshToken" USING btree ("userId");


--
-- Name: SenderDetails_transaction_id_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "SenderDetails_transaction_id_key" ON public."SenderDetails" USING btree (transaction_id);


--
-- Name: TransactionHistory_transaction_reference_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "TransactionHistory_transaction_reference_key" ON public."TransactionHistory" USING btree (transaction_reference);


--
-- Name: TransactionIcon_transaction_id_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "TransactionIcon_transaction_id_key" ON public."TransactionIcon" USING btree (transaction_id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: expires_at_idx; Type: INDEX; Schema: public; Owner: db_payflex_latest_user
--

CREATE INDEX expires_at_idx ON public."RefreshToken" USING btree ("expiresAt");


--
-- Name: Account Account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Address Address_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProfileImage ProfileImage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."ProfileImage"
    ADD CONSTRAINT "ProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SenderDetails SenderDetails_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."SenderDetails"
    ADD CONSTRAINT "SenderDetails_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."TransactionHistory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransactionIcon TransactionIcon_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_payflex_latest_user
--

ALTER TABLE ONLY public."TransactionIcon"
    ADD CONSTRAINT "TransactionIcon_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public."TransactionHistory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO db_payflex_latest_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO db_payflex_latest_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO db_payflex_latest_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO db_payflex_latest_user;


--
-- PostgreSQL database dump complete
--

