--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Homebrew)
-- Dumped by pg_dump version 15.12 (Homebrew)

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
-- Name: AccountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AccountType" AS ENUM (
    'savings',
    'current',
    'investment'
);


ALTER TYPE public."AccountType" OWNER TO postgres;

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
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'card',
    'bank_transfer',
    'wallet',
    'ussd',
    'paystack'
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
    home_address text
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


ALTER TABLE public."Bookmark_id_seq" OWNER TO postgres;

--
-- Name: Bookmark_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Bookmark_id_seq" OWNED BY public."Bookmark".id;


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
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Wallet; Type: TABLE; Schema: public; Owner: postgres
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

COPY public."Account" (id, user_id, account_number, "accountType", currency, bank_name, bank_code, balance, "isActive", "createdAt", "updatedAt") FROM stdin;
11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	1234567890	current	ngn	First Bank	011	50000	t	2025-04-02 10:41:00.403	2025-04-02 10:41:00.403
22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	0987654321	savings	usd	Zenith Bank	057	1000	t	2025-04-02 10:41:00.403	2025-04-02 10:41:00.403
44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	4321098765	investment	eur	Access Bank	044	5000	t	2025-04-02 10:41:00.403	2025-04-02 10:41:00.403
33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	5678901234	current	ngn	GTBank	058	4200	t	2025-04-02 10:41:00.403	2025-04-04 10:51:20.312
\.


--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Address" (id, "userId", city, state, country, home_address) FROM stdin;
5af650e0-e7be-4704-abfd-e33ad9a25291	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	San Francisco	California	United States	123 Main St
49472078-33d1-4584-b10a-35d2cc8966e2	359fa178-c2f6-491a-9e9a-a2a1386e075a	San Francisco	California	United States	123 Main St
\.


--
-- Data for Name: Bookmark; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Bookmark" (id, "createdAt", "updatedAt", title, description, link) FROM stdin;
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
23a15995-3f5c-47d8-afd4-596c98c38dde	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZWY2MmQ4Yi1iNmQzLTQ0ZTQtOWY0NC04OGNhOWE1Nzk1NDQiLCJpYXQiOjE3NDM2MjI4ODIsImV4cCI6MTc0NDIyNzY4Mn0.NbEmYmNmWO99B1vnG6P4-u4fQewe-V4Ymn29fZFWzas	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2025-04-03 19:41:22.677	2025-04-02 19:41:22.679
\.


--
-- Data for Name: SenderDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SenderDetails" (id, transaction_id, sender_name, sender_bank, sender_account_number) FROM stdin;
a914f27c-b514-4abf-8633-f921cd96e286	d4cb5198-68b9-485b-a45f-926e80d24d24	ABC Company Ltd	Zenith Bank	839172757
fd088aa4-a440-46d1-ad59-5cca33b12472	dd21e0f6-15df-4cc4-b71d-4067c412d704	Jane Smith	First Bank	637115237
63238c6e-b2fb-46a1-9e41-c833388a64d0	a01e87cb-4517-4d2c-a2ba-33d9d104413c	Michael Brown	Ecobank	224281109
bfec38b2-b8ac-4eff-98aa-efd5c0d4128a	ac0d7a6d-8b58-48e4-8692-4f1a40ce63b6	Michael Brown	Stanbic IBTC	387627999
e7092d0e-cf4d-4899-af78-6b8acd028fad	5717608d-6b12-4e99-8838-049e96af09db			
d3689f1d-bd3b-463d-9ed0-dd398de55f25	393193b0-7c49-4783-bc7d-84a3346f22ec			
\.


--
-- Data for Name: TransactionHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransactionHistory" (id, account_id, user_id, amount, transaction_type, description, status, recipient_mobile, currency_type, payment_method, fee, transaction_number, transaction_reference, session_id, "createdAt", "updatedAt") FROM stdin;
84ae6cf4-7ae4-4c16-922f-81c50fe58bb0	22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	4101.62	deposit	Salary deposit	success	0809381386	usd	bank_transfer	81.93	TRX-370212	TX-557370500	sess_490940	2025-04-01 10:41:00.403	2025-04-01 10:41:00.403
e9c548ff-bb47-43d1-b461-d2cdecdc695e	11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	8813.93	airtime	Airtime purchase	failed	0806038867	ngn	wallet	69.17	TRX-169361	TX-697115347	sess_808843	2025-03-31 10:41:00.403	2025-03-31 10:41:00.403
8d63d2d8-4843-4a98-9bb5-6c2fbc341c1f	22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	4886.78	data	Mobile data bundle	cancelled	\N	usd	ussd	20.87	TRX-150915	TX-229048771	sess_238651	2025-03-30 10:41:00.403	2025-03-30 10:41:00.403
1b74171d-8b9f-4296-bd6d-173f8a1ebe81	11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	3680.87	cable	DSTV subscription	pending	0801658956	ngn	card	10.52	TRX-44871	TX-653075521	sess_476722	2025-03-29 10:41:00.403	2025-03-29 10:41:00.403
d4cb5198-68b9-485b-a45f-926e80d24d24	22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	9016.91	transfer	Money transfer to friend	success	0805050692	usd	bank_transfer	22.74	TRX-7886	TX-749064968	sess_231416	2025-03-28 10:41:00.403	2025-03-28 10:41:00.403
9228300d-2522-4c48-b549-a1f2fa4b8ed1	11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	3092.91	deposit	Salary deposit	failed	\N	ngn	wallet	68.41	TRX-426089	TX-565244598	sess_97965	2025-03-27 10:41:00.403	2025-03-27 10:41:00.403
d7727db7-fe58-44a0-a7fd-613129d1cdb0	22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	6997.77	airtime	Airtime purchase	cancelled	0807645688	usd	ussd	71.63	TRX-561141	TX-201787749	sess_802969	2025-03-26 10:41:00.403	2025-03-26 10:41:00.403
a28b3c95-00e1-474e-8973-15be22877f5b	11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	7569.3	data	Mobile data bundle	pending	0803040187	ngn	card	58.27	TRX-790482	TX-949105647	sess_380363	2025-03-25 10:41:00.403	2025-03-25 10:41:00.403
5c0f52e0-4166-4909-ba95-f0dfddd6de4b	22222222-2222-2222-2222-222222222222	359fa178-c2f6-491a-9e9a-a2a1386e075a	1754.79	cable	DSTV subscription	success	\N	usd	bank_transfer	53.06	TRX-466422	TX-619007115	sess_230702	2025-03-24 10:41:00.403	2025-03-24 10:41:00.403
dd21e0f6-15df-4cc4-b71d-4067c412d704	11111111-1111-1111-1111-111111111111	359fa178-c2f6-491a-9e9a-a2a1386e075a	6382.54	transfer	Money transfer to friend	failed	0803785844	ngn	wallet	46.53	TRX-747069	TX-664436775	sess_914863	2025-03-23 10:41:00.403	2025-03-23 10:41:00.403
7b796a83-5c01-4f0b-a7c8-70b043ad3a5e	44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	4986.4	deposit	Freelance payment	success	0806489224	eur	bank_transfer	1.79	TRX-286354	TX-82951438	sess_285565	2025-03-31 10:41:00.403	2025-03-31 10:41:00.403
7da5c03a-6264-4d20-a7cf-3a32ad6cbfd0	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2728.63	betting	Sports betting	failed	0804862637	ngn	wallet	18.45	TRX-589598	TX-246972618	sess_303826	2025-03-29 10:41:00.403	2025-03-29 10:41:00.403
a01e87cb-4517-4d2c-a2ba-33d9d104413c	44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	4625.37	education	School fees	cancelled	\N	eur	ussd	19.69	TRX-248058	TX-434971219	sess_886327	2025-03-27 10:41:00.403	2025-03-27 10:41:00.403
4d8a8c67-95d3-4585-ab20-ebdc90d9ce0d	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	529.29	cable	Gotv payment	pending	0804593743	ngn	card	19.16	TRX-710164	TX-62053671	sess_275432	2025-03-25 10:41:00.403	2025-03-25 10:41:00.403
8823160c-fdc7-41eb-a113-b56cdc92c897	44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2670.02	transfer	Family support	success	0803758283	eur	bank_transfer	38.38	TRX-261008	TX-661672401	sess_434464	2025-03-23 10:41:00.403	2025-03-23 10:41:00.403
ac0d7a6d-8b58-48e4-8692-4f1a40ce63b6	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	495.37	deposit	Freelance payment	failed	\N	ngn	wallet	26.08	TRX-496267	TX-323130679	sess_304736	2025-03-21 10:41:00.403	2025-03-21 10:41:00.403
b81e22e5-99ba-41e4-b4f8-6ae844f0aaba	44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	893.68	betting	Sports betting	cancelled	0801705143	eur	ussd	39.39	TRX-319431	TX-461928537	sess_438631	2025-03-19 10:41:00.403	2025-03-19 10:41:00.403
5717608d-6b12-4e99-8838-049e96af09db	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	81000	deposit	Wallet funding with Paystack	success	\N	ngn	paystack	10	l670og9uzjpz46g	cbwuctnsai	sess-28636981	2025-04-03 04:08:48.007	2025-04-03 05:23:06.415
784deb11-3100-4fd7-b8cb-f065dedd2cdd	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	\N	MTN	success	08146694787	ngn	paystack	0	2025040310411080939901	ckjdbcyubfoiassbncidbnodbds	\N	2025-04-03 09:41:19.155	2025-04-03 09:41:19.165
b48ca83e-98e0-4429-8cab-6332e92ccba1	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	3200	airtime	MTN	success	07031921732	ngn	wallet	0	2025040310451369093339	ref-3277ye	\N	2025-04-03 09:45:40.878	2025-04-03 09:45:40.89
3f85fe64-b450-41ad-973a-89c43d9d5b6d	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2500	data	data top up	pending	\N	ngn	paystack	0	228	gift_bill-2025-04-03-16-57-24-452-630e17	sess-id-2025-04-03-16-57-25-673-09006f	2025-04-03 15:57:25.674	2025-04-03 15:57:25.674
e6c97d36-2cc9-4677-bd8b-8260ea8ad417	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2500	data	data top up	success	\N	ngn	wallet	0	228	gift_bill-2025-04-03-17-0-26-809-3b5384	sess-id-2025-04-03-17-0-27-953-38cafe	2025-04-03 16:00:27.954	2025-04-03 16:00:27.954
a3a33297-b806-46ed-adf4-718b889f57b6	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	1300	data	data top up	success	07031921732	ngn	wallet	0	228	gift_bill-2025-04-03-17-2-46-509-5d746f	sess-id-2025-04-03-17-2-49-132-ab961b	2025-04-03 16:02:49.133	2025-04-03 16:02:49.133
80530a05-3bd4-47f3-b7ad-46936696464a	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	9800	data	Data top-up	success	07031921732	ngn	wallet	0	228	gift_bill-2025-04-04-11-43-55-98-3c31ff	sess-id-2025-04-04-11-43-56-897-71a4bc	2025-04-04 10:43:56.898	2025-04-04 10:43:56.898
02952596-150f-467a-ac45-c45533f27d80	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	9800	data	Data top-up	success	07031921732	ngn	wallet	0	228	gift_bill-2025-04-04-11-47-12-399-4c2486	sess-id-2025-04-04-11-47-13-538-73b2a4	2025-04-04 10:47:13.54	2025-04-04 10:47:13.54
19e256a2-b3af-4a10-a853-689d9f4884f5	33333333-3333-3333-3333-333333333333	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	1200	data	Data top-up	success	07031921732	ngn	wallet	0	228	gift_bill-2025-04-04-11-51-18-360-b9ed3c	sess-id-2025-04-04-11-51-20-313-1c0bd0	2025-04-04 10:51:20.314	2025-04-04 10:51:20.314
2435e474-5062-4bcf-908a-fe2ddb967d15	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	500	airtime	MTN	success	08146694787	ngn	wallet	0	2025040512152009134797	gift_bill-2025-04-05-12-15-42-672-806579	\N	2025-04-05 11:15:44.038	2025-04-05 11:15:44.047
3359af1a-93d5-44bc-aa6a-dd60b2ad2ef6	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	600	airtime	9MOBILE	success	08146694787	ngn	wallet	0	202504051218242948688	gift_bill-2025-04-05-12-18-58-416-483b57	\N	2025-04-05 11:18:59.221	2025-04-05 11:18:59.222
b03b1481-4b3f-484d-ba29-0e99bd01f58b	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	1000	airtime	MTN	success	09289228783	ngn	wallet	0	202504051221989937807	gift_bill-2025-04-05-12-21-44-376-a31500	\N	2025-04-05 11:21:45.125	2025-04-05 11:21:45.126
b7cfb8ce-eea9-4f6e-a743-490877095cf4	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	100	airtime	MTN	success	08146694787	ngn	wallet	0	202504051354854616964	gift_bill-2025-04-05-13-54-51-274-c17941	\N	2025-04-05 12:54:52.099	2025-04-05 12:54:52.1
b9a2ae46-10fd-4171-93ef-54f7aa7de407	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2999	airtime	MTN	success	9884563728	ngn	wallet	0	202504051401387383001	gift_bill-2025-04-05-14-1-48-803-a238b1	\N	2025-04-05 13:01:49.729	2025-04-05 13:01:49.73
e35a6895-a268-416e-9e65-f2e6a4ee2f53	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	200	airtime	MTN	success	08146694787	ngn	wallet	0	2025040514132062407162	gift_bill-2025-04-05-14-13-39-167-bac644	\N	2025-04-05 13:13:40.748	2025-04-05 13:13:40.749
cc6e3bcf-9460-4cc5-b70a-dcfb0fbee983	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	airtime	MTN	success	08146694787	ngn	wallet	0	2025040514161984963466	gift_bill-2025-04-05-14-16-19-887-897c0f	\N	2025-04-05 13:16:21.314	2025-04-05 13:16:21.315
7ae6b546-3fcf-454d-86f9-e50092dcaecf	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	699	airtime	9MOBILE	success	09836257283	ngn	wallet	0	202504051419682620950	gift_bill-2025-04-05-14-19-5-830-ba3518	\N	2025-04-05 13:19:07.432	2025-04-05 13:19:07.433
e1de235c-31cf-494c-87ce-a24360ef1e3c	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	600	airtime	MTN	success	09378936752	ngn	wallet	0	2025040514231845693013	gift_bill-2025-04-05-14-23-4-284-8fbe06	\N	2025-04-05 13:23:05.952	2025-04-05 13:23:05.953
8d62c58a-4446-4a46-8bc7-8e9edcf97132	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	300	airtime	MTN	success	756483923	ngn	wallet	0	202504051439147444747	gift_bill-2025-04-05-14-39-31-138-2fd201	\N	2025-04-05 13:39:32.252	2025-04-05 13:39:32.253
8b0dba30-3b0c-44c0-bd05-16350d59bbc5	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	300	airtime	MTN	success	83456732	ngn	wallet	0	202504051441795805408	gift_bill-2025-04-05-14-41-4-188-5567e1	\N	2025-04-05 13:41:04.877	2025-04-05 13:41:04.878
38acfc8d-fbf1-4e9d-89d5-21fa605272c3	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	320	airtime	MTN	success	0812334568	ngn	wallet	0	2025040514531219659883	gift_bill-2025-04-05-14-53-24-8-8a543f	\N	2025-04-05 13:53:25.124	2025-04-05 13:53:25.125
783a939f-9e91-4ba0-9385-9524edcfdb72	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	airtime	MTN	success	4657383298	ngn	wallet	0	202504051454363465936	gift_bill-2025-04-05-14-54-11-546-fc41e4	\N	2025-04-05 13:54:12.274	2025-04-05 13:54:12.275
63c30665-8b16-4ca3-b181-f38c85d4104b	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	2003	airtime	MTN	success	645372837463	ngn	wallet	0	202504051456557411319	gift_bill-2025-04-05-14-56-11-341-979f5c	\N	2025-04-05 13:56:12.206	2025-04-05 13:56:12.207
c9fe4f1e-7374-4d8d-a2ce-5940d30ddbae	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	6555	airtime	MTN	success	8765645634535667	ngn	wallet	0	2025040514571278827101	gift_bill-2025-04-05-14-57-42-524-b7793b	\N	2025-04-05 13:57:43.251	2025-04-05 13:57:43.252
d6a12c55-77bb-4a4c-bc02-f19f43d716f6	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	3444	airtime	MTN	success	35243625	ngn	wallet	0	2025040514591589963511	gift_bill-2025-04-05-14-59-5-449-9884ee	\N	2025-04-05 13:59:06.431	2025-04-05 13:59:06.431
e649b483-4e46-4a18-8e63-ae78a48308ed	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	422	airtime	MTN	success	54667890	ngn	wallet	0	2025040515001626719163	gift_bill-2025-04-05-15-0-50-331-f9c04a	\N	2025-04-05 14:00:51.297	2025-04-05 14:00:51.306
e7bea708-5ebf-47e7-b326-037c434bdae6	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	300	airtime	MTN	success	09123456789	ngn	wallet	0	202504051510551277653	gift_bill-2025-04-05-15-10-5-979-235ab2	\N	2025-04-05 14:10:07.001	2025-04-05 14:10:07.002
2b93f4f2-1634-48e6-b4fa-ab55a05c5574	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	airtime	MTN	success	646276453737	ngn	wallet	0	202504051510662169853	gift_bill-2025-04-05-15-10-40-448-0f2606	\N	2025-04-05 14:10:41.552	2025-04-05 14:10:41.553
8d228d4a-0d04-41bb-b741-24ede685eeab	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	544334554	airtime	MTN	success	646276453737	ngn	wallet	0	\N	gift_bill-2025-04-05-15-14-21-533-00b425	\N	2025-04-05 14:14:22.337	2025-04-05 14:14:22.346
b26860b1-af3a-49c7-a5f9-d21794091b0b	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	544334554	airtime	MTN	success	646276453737	ngn	wallet	0	\N	gift_bill-2025-04-05-15-14-50-718-f00ddc	\N	2025-04-05 14:14:51.515	2025-04-05 14:14:51.516
d9e5ddc6-974b-4c64-bca9-7cd5c647e4e5	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	544334554	airtime	MTN	success	646276453737	ngn	wallet	0	\N	gift_bill-2025-04-05-15-15-42-901-5ea4ae	\N	2025-04-05 14:15:43.602	2025-04-05 14:15:43.603
36a95c9b-4fc9-4f02-9b5c-10d257ee8526	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	300	airtime	MTN	success	646276453737	ngn	wallet	0	\N	gift_bill-2025-04-05-15-16-9-638-96e647	\N	2025-04-05 14:16:10.574	2025-04-05 14:16:10.575
131e5fa5-e195-42de-95fd-9477135615fc	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	airtime	MTN	success	4847463746	ngn	wallet	0	\N	gift_bill-2025-04-05-15-21-56-82-a171ca	\N	2025-04-05 14:21:57.07	2025-04-05 14:21:57.071
859259be-2576-4880-8444-4c35cec0935f	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	400	airtime	MTN	success	7823427282	ngn	wallet	0	\N	gift_bill-2025-04-05-15-22-38-874-e7c6ad	\N	2025-04-05 14:22:39.595	2025-04-05 14:22:39.596
68c80abd-e520-4dbf-bccb-0d85dadb1262	\N	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	3400	airtime	MTN	success	08146694787	ngn	wallet	0	\N	gift_bill-2025-04-05-17-7-14-988-34c8e8	\N	2025-04-05 16:07:15.985	2025-04-05 16:07:15.985
393193b0-7c49-4783-bc7d-84a3346f22ec	44444444-4444-4444-4444-444444444444	3ef62d8b-b6d3-44e4-9f44-88ca9a579544	81000	deposit	Wallet funding with Paystack	pending	\N	ngn	paystack	10	cr1ef7y9flf2rw8	3zvguizihe	sess-id-2025-04-05-20-45-21-139-8c14da	2025-04-05 19:45:21.14	2025-04-05 19:45:21.14
\.


--
-- Data for Name: TransactionIcon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TransactionIcon" (id, transaction_id, secure_url, public_id) FROM stdin;
345f2095-7a27-4539-ab1e-0a82cb0aa43f	84ae6cf4-7ae4-4c16-922f-81c50fe58bb0	https://example.com/icons/deposit.png	icon_TX-557370500
6255f181-c15b-4f99-9710-277a185d1f3e	e9c548ff-bb47-43d1-b461-d2cdecdc695e	https://example.com/icons/airtime.png	icon_TX-697115347
0c4e7b0c-70ad-4fd4-b20d-519fc66f54c4	8d63d2d8-4843-4a98-9bb5-6c2fbc341c1f	https://example.com/icons/data.png	icon_TX-229048771
9c50f7b3-4025-44c6-9eb3-43e438c16c6e	1b74171d-8b9f-4296-bd6d-173f8a1ebe81	https://example.com/icons/cable.png	icon_TX-653075521
b643a1fa-c64d-41a0-aec3-0075b9dc05cb	d4cb5198-68b9-485b-a45f-926e80d24d24	https://example.com/icons/transfer.png	icon_TX-749064968
849048e4-f187-4690-9560-c677a9728a8d	9228300d-2522-4c48-b549-a1f2fa4b8ed1	https://example.com/icons/deposit.png	icon_TX-565244598
c09814a5-e0ab-46e3-b958-bdd0c63c814f	d7727db7-fe58-44a0-a7fd-613129d1cdb0	https://example.com/icons/airtime.png	icon_TX-201787749
2b927fa2-712c-4ee1-8ed2-7f7e869eefca	a28b3c95-00e1-474e-8973-15be22877f5b	https://example.com/icons/data.png	icon_TX-949105647
c1f7d716-3156-4949-afe0-2d8adac60e6d	5c0f52e0-4166-4909-ba95-f0dfddd6de4b	https://example.com/icons/cable.png	icon_TX-619007115
730629b5-cda6-4a07-ba30-3b40c5111d63	dd21e0f6-15df-4cc4-b71d-4067c412d704	https://example.com/icons/transfer.png	icon_TX-664436775
0771468f-010b-45ec-8b57-e32cf0e944e6	7b796a83-5c01-4f0b-a7c8-70b043ad3a5e	https://example.com/icons/deposit.png	icon_TX-82951438
270715b2-2aa7-47ab-b2a5-242a3def3afd	7da5c03a-6264-4d20-a7cf-3a32ad6cbfd0	https://example.com/icons/betting.png	icon_TX-246972618
76e7f1ab-8677-4b91-a72f-9c5d9d53b9a1	a01e87cb-4517-4d2c-a2ba-33d9d104413c	https://example.com/icons/education.png	icon_TX-434971219
798b1a86-f079-46a3-b4e8-ce95dc411446	4d8a8c67-95d3-4585-ab20-ebdc90d9ce0d	https://example.com/icons/cable.png	icon_TX-62053671
83d7fae3-fb40-46e8-9349-aa6dd9366444	8823160c-fdc7-41eb-a113-b56cdc92c897	https://example.com/icons/transfer.png	icon_TX-661672401
aefa084d-65cb-412a-8a6d-317e4574fad5	ac0d7a6d-8b58-48e4-8692-4f1a40ce63b6	https://example.com/icons/deposit.png	icon_TX-323130679
1571858c-df18-472f-94e8-96502e76bfeb	b81e22e5-99ba-41e4-b4f8-6ae844f0aaba	https://example.com/icons/betting.png	icon_TX-461928537
24bd199c-7907-4e8f-be00-c6468ecc6200	5717608d-6b12-4e99-8838-049e96af09db	paystack-icon	paystack-icon
be33310c-ab1b-4a63-8513-7b3e753c4adc	3f85fe64-b450-41ad-973a-89c43d9d5b6d	mtn url	mtn id public
3c7b4f34-3d79-4952-99df-09beaa1de7c6	e6c97d36-2cc9-4677-bd8b-8260ea8ad417	mtn url	mtn id public
60a96036-6dbc-41e0-aff6-498c3252f5db	a3a33297-b806-46ed-adf4-718b889f57b6	mtn url	mtn id public
d3c813ef-d19c-4c90-87a5-7975d81f06e7	80530a05-3bd4-47f3-b7ad-46936696464a	mtn url	mtn id public
47f274fc-b785-4bcb-ae82-57c39f1a3e0d	02952596-150f-467a-ac45-c45533f27d80	mtn url	mtn id public
6e0bd69d-74b5-411e-9dd0-4b333e9bbb80	19e256a2-b3af-4a10-a853-689d9f4884f5	mtn url	mtn id public
9d695cd6-05e5-4659-a3d5-b05950fb357b	393193b0-7c49-4783-bc7d-84a3346f22ec	paystack-icon	paystack-icon
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, first_name, last_name, email, hash, phone_number, password, otp, otp_expires_at, role, gender, date_of_birth, is_email_verified, "createdAt", "updatedAt") FROM stdin;
3ef62d8b-b6d3-44e4-9f44-88ca9a579544	Maximus	Bernard	bernardmayowaa@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$X0dNYQKn3bnI4L8W/qrUXg$zGnH5n7rUfx6OvSZUlQopPchD8Arax6XL5sSL57kIJg	08146694787	$argon2id$v=19$m=65536,t=3,p=4$X0dNYQKn3bnI4L8W/qrUXg$zGnH5n7rUfx6OvSZUlQopPchD8Arax6XL5sSL57kIJg	\N	2025-04-02 09:33:19.089	user	male	1990-01-01 00:00:00	t	2025-04-02 09:28:19.09	2025-04-02 09:28:34.028
359fa178-c2f6-491a-9e9a-a2a1386e075a	Maximus	Bernard	adeyeye.toyorsi@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$sMSF5tR7mUYA546a/CKB4g$knP1bpTnoRkQpL0Dh/yghg9b+SQVwIWhVMIpBKUE08s	08146694787	$argon2id$v=19$m=65536,t=3,p=4$sMSF5tR7mUYA546a/CKB4g$knP1bpTnoRkQpL0Dh/yghg9b+SQVwIWhVMIpBKUE08s	\N	2025-04-02 09:34:11.234	user	male	1990-01-01 00:00:00	t	2025-04-02 09:29:11.234	2025-04-02 09:30:25.729
\.


--
-- Data for Name: Wallet; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Wallet" (id, user_id, currency, balance, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b4557f0d-bd07-4060-ba57-590b2c4f82d1	0f5725c14e78e5edc1bda125d2ad867e0c90d672b37004bcd9397f50e104f5e7	2025-04-02 10:23:56.039657+01	20250402092356_init	\N	\N	2025-04-02 10:23:56.008914+01	1
f760a2eb-30c8-4bcb-96ba-0d3cfb08834d	677ba2f4f646fd4555dd239c815c9504d0e1d90d997e5414e76fef2cbc63ed44	2025-04-02 15:12:02.980101+01	20250402141202_fix_user_account_relation	\N	\N	2025-04-02 15:12:02.977214+01	1
e7f7ce60-7c4f-4a32-99fc-194f73fb701e	7b3c654ef520d222669e7615e53e33a43ddd99242fbafdd8775bacd86d958660	\N	20250402144124_fix_user_account_relation	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250402144124_fix_user_account_relation\n\nDatabase error code: 55P04\n\nDatabase error:\nERROR: unsafe use of new value "paystack" of enum type "PaymentMethod"\nHINT: New enum values must be committed before they can be used.\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E55P04), message: "unsafe use of new value \\"paystack\\" of enum type \\"PaymentMethod\\"", detail: None, hint: Some("New enum values must be committed before they can be used."), position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("enum.c"), line: Some(102), routine: Some("check_safe_enum_use") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250402144124_fix_user_account_relation"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20250402144124_fix_user_account_relation"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:225	2025-04-02 15:59:27.307283+01	2025-04-02 15:41:24.822447+01	0
75d8bf39-b687-46da-ae54-0449871a35f8	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2025-04-02 15:59:27.308504+01	20250402144124_fix_user_account_relation		\N	2025-04-02 15:59:27.308504+01	0
3f1c7dc8-cd7d-4b4d-88cd-e3da6e9dd4e5	5b97f9b67836a9f53eabc44891668e4ec18874c5712353ddd30327920cbd2266	2025-04-02 16:03:11.819107+01	20250402160246_full_schema		\N	2025-04-02 16:03:11.819107+01	0
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
-- Name: Account_account_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_account_number_key" ON public."Account" USING btree (account_number);


--
-- Name: Address_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Address_userId_key" ON public."Address" USING btree ("userId");


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
-- PostgreSQL database dump complete
--

