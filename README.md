# MedVision AI

**An AI-Integrated Healthcare Intelligence Platform for Predictive and Intelligent Diagnosis**

🔗 **Live Demo:** [medvision-ai-pink.vercel.app](https://medvision-ai-pink.vercel.app/medvision-landing.html)

---

## Overview

MedVision AI is a full-stack healthcare intelligence platform built to help small and mid-sized hospitals bring data-driven decision support to clinical workflows — without the cost of enterprise healthcare IT systems. It combines a React frontend, a Spring Boot REST API, a Python FastAPI AI engine, and a Supabase (PostgreSQL) database to deliver real-time patient risk prediction, explainable AI reporting, and voice-driven appointment booking across three role-based portals.

Originally developed as an MCA final year major project, this platform was built end-to-end — from requirements analysis and system design through implementation and testing.

## Key Features

- 🧠 **AI Risk Prediction Engine** — Scikit-learn model scores patient risk in real time, with an Explainable AI (XAI) breakdown so clinicians can see *why* a score was generated, not just the number.
- 🎙️ **Voice Appointment Booking** — NLP-driven assistant parses spoken requests and confirms appointments through a conversational card interface.
- 👥 **Three Role-Based Portals** — Separate, permissioned experiences for Admin, Doctor, and Patient users.
- 📄 **Automated PDF Reports** — Clinical risk reports, doctor performance analytics, and disease trend summaries generated on demand.
- 📊 **Real-Time Dashboards** — Risk distribution charts, outbreak detection alerts, and AI prediction audit logs for administrators.
- 🔐 **Secure by Design** — JWT authentication, Role-Based Access Control (RBAC), and PostgreSQL Row-Level Security (RLS) policies.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript-ready, Tailwind CSS |
| Backend API | Spring Boot (Java), REST |
| AI Engine | Python, FastAPI, Scikit-learn, Pandas, NumPy |
| Database | PostgreSQL via Supabase (Auth, Storage, RLS) |
| Deployment | Vercel (frontend) |

## Architecture

```
React Frontend  →  Spring Boot REST API  →  Supabase (PostgreSQL)
                          ↓
                Python FastAPI AI Engine
                (Risk Scoring + XAI + NLP)
```

Requests from the client hit the Spring Boot API for core CRUD operations (patients, doctors, appointments), while risk scoring and NLP appointment parsing are handled by a dedicated Python FastAPI service. All persistent data is stored in Supabase PostgreSQL with RLS policies enforcing per-role data access.

## Repositories

- [`medvision-ai`](https://github.com/HeenaShaikh09/medvision-ai) — Frontend (React)
- [`medvision-ai-backend`](https://github.com/HeenaShaikh09/medvision-ai-backend) — Backend (Java / Spring Boot)

## Getting Started

```bash
# Clone the frontend
git clone https://github.com/HeenaShaikh09/medvision-ai.git
cd medvision-ai
npm install
npm run dev

# Clone the backend (in a separate directory)
git clone https://github.com/HeenaShaikh09/medvision-ai-backend.git
cd medvision-ai-backend
# Configure Supabase credentials in application.properties
./mvnw spring-boot:run
```

> A Supabase project (PostgreSQL) is required. Add your Supabase URL and API key to the appropriate config files before running locally.

## Screenshots

*(Add screenshots here — e.g. patient risk report, admin dashboard, XAI factor breakdown, voice booking assistant. Pulling 3–4 images from the live demo or your dissertation figures will make this section much stronger.)*

## Author

**Heena Shaikh**
MCA, Jamia Hamdard University
[GitHub](https://github.com/HeenaShaikh09) · [LinkedIn](https://linkedin.com/in/heena-shaikh-096810259)

## License

This project was developed for academic purposes as part of an MCA final year major project. Contact the author for reuse or collaboration inquiries.
