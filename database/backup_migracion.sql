--
-- PostgreSQL database dump
--


-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Data for Name: ipads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ipads (id, nombre, marca, modelo, created_at, updated_at) FROM stdin;
4350d216-143b-44e5-892b-3f007071b4a9	Ipad 1	Apple	iPad Pro 12.9 (6ª gen)	2026-03-08 16:08:41.816955+01	2026-03-08 17:04:59.790491+01
bcfde7d2-6e00-48a0-9f8c-e1950e6727b8	iPad2	Apple	iPad Pro 13.9 (5ª gen)	2026-03-08 17:05:11.393785+01	2026-03-08 17:05:11.393785+01
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, email, password_hash, nombre, role, created_at, updated_at) FROM stdin;
f0572c65-b06e-4343-9515-1335736bb901	maria.j.luque@uv.es	$2a$12$CKuBYZyL0Sn.Sf/nJQNy8uxe3BZvPtxU1/oSUDIR2MnsQ.wP9WUwy	maria.j.luque@uv.es	administrador	2026-03-08 16:27:31.118358+01	2026-03-08 16:29:26.54622+01
19eb3080-0869-4798-ab53-f409a7965f45	clinico1@clinico.com	$2a$12$ZwEhAZFwhD60dATZZNuRjuHVsw67/AdE7KlJ3sj1DzVYmcSM2JQru	Clínico 1	clinico	2026-03-08 16:31:21.676857+01	2026-03-08 16:31:21.676857+01
a4e47b1a-556f-4caa-ad12-6276270b0525	clinico2@clinico.com	$2a$12$RG3otrs148aG1O8O3uj4Ee6D.WKEcxCCMGXk4XyVdUQKMjy74xqTy	Clinico 2	clinico	2026-03-08 16:31:41.578496+01	2026-03-08 16:31:41.578496+01
\.


--
-- Data for Name: ipad_clinico; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ipad_clinico (ipad_id, usuario_id, created_at) FROM stdin;
4350d216-143b-44e5-892b-3f007071b4a9	19eb3080-0869-4798-ab53-f409a7965f45	2026-03-08 17:04:59.816995+01
bcfde7d2-6e00-48a0-9f8c-e1950e6727b8	19eb3080-0869-4798-ab53-f409a7965f45	2026-03-08 17:05:11.417658+01
bcfde7d2-6e00-48a0-9f8c-e1950e6727b8	a4e47b1a-556f-4caa-ad12-6276270b0525	2026-03-08 17:05:11.419019+01
\.


--
-- Data for Name: pacientes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pacientes (id, id_paciente, nombre, genero, genero_otro, fecha_nacimiento, telefono, email, graduacion_od, graduacion_oi, observaciones, registrado_por, created_at, updated_at) FROM stdin;
b45ae192-a9e3-41da-aa3e-758ba7d955b3	CLI1	Clienta1	femenino	\N	1993-03-03	\N	\N	\N	\N	\N	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:05:55.044099+01	2026-03-08 17:05:55.044099+01
54dbfe35-ce6f-47fb-9746-0f7067016d42	JJ1	Luis Andrés Gómez	masculino	\N	1988-02-01	612378655	\N	\N	\N	\N	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:06:25.125202+01	2026-03-08 17:06:25.125202+01
39db80d1-df03-485b-a9e1-c89b525d4197	P1	Paco Pepe	otro	Fluido	1996-02-06	1233	\N	\N	\N	Un pesao	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:06:50.157273+01	2026-03-08 17:06:50.157273+01
50dc8783-dfbc-4fd3-9c12-e5fe87e2c802	A2	Juan	masculino	\N	2000-02-13	\N	\N	\N	\N	\N	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:07:32.789529+01	2026-03-08 17:07:32.789529+01
8ccbce6d-45d4-4248-b8f4-c92a7d1e23b9	AA1	Mj	femenino	\N	1982-03-01	\N	aa@mail.com	-3D,×90°0.5D	0	\N	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:07:59.640343+01	2026-03-08 17:07:59.640343+01
fd426cf6-244a-496f-860c-0a6eb61b3470	ID11	Antonio	masculino	\N	1942-04-01	\N	\N	0,1	1,3	\N	f0572c65-b06e-4343-9515-1335736bb901	2026-03-08 17:08:25.373571+01	2026-03-08 17:08:25.373571+01
\.


--
-- Data for Name: test_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_configs (id, tipo_test, nombre, descripcion, ipad_id, created_at, updated_at) FROM stdin;
cbdfa87b-d6db-45ab-801a-f71832bf7b05	rejilla_amsler	Rejilla de Amsler	Test para detectar distorsiones en la visiÃ³n central	4350d216-143b-44e5-892b-3f007071b4a9	2026-03-08 16:08:41.821487+01	2026-03-08 16:08:41.821487+01
22d6124a-9ee4-456a-93a8-34e8dc8961e9	agudeza_visual	Agudeza Visual	MediciÃ³n de la agudeza visual	4350d216-143b-44e5-892b-3f007071b4a9	2026-03-08 16:08:41.824197+01	2026-03-08 16:08:41.824197+01
d2c7dbae-c487-48b2-aea2-29733a7a202b	optopad_color	Optopad Color	Test de percepciÃ³n de colores	4350d216-143b-44e5-892b-3f007071b4a9	2026-03-08 16:08:41.825186+01	2026-03-08 16:08:41.825186+01
b4700ec1-36bc-4590-9160-21e2886a8425	optopad_csf	Optopad CSF	Test de sensibilidad al contraste	4350d216-143b-44e5-892b-3f007071b4a9	2026-03-08 16:08:41.825988+01	2026-03-08 16:08:41.825988+01
\.


--
-- Data for Name: test_pasos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_pasos (id, test_config_id, orden, nombre_archivo, ruta_archivo, url_publica, descripcion, valores_correctos, valor_decimal, created_at) FROM stdin;
\.


--
-- Data for Name: test_resultados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.test_resultados (id, paciente_id, test_config_id, paso_actual, datos_respuesta, fecha_realizacion, created_at, updated_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict GVrYUTddpbRKhcXyA6v6mDwrczOaflq9WeRBkOOuB1zNH1f81SCxhFMq1OlXm66

