---
title: Valer Cobranza API
emoji: 👞
colorFrom: red
colorTo: brown
sdk: docker
app_port: 7860
pinned: false
---

# Sistema de Cobranza a Colaboradores VALER E.I.R.L - Backend API

API REST construida con FastAPI y PostgreSQL (Neon DB).

## Variables de Entorno requeridas en Hugging Face Spaces
En la configuración de tu Space (**Settings** -> **Variables and secrets** -> **New secret**):
- `DATABASE_URL`: Tu cadena de conexión PostgreSQL de Neon DB (`postgresql://...`).
