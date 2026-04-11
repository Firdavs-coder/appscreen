# Appscreen Backend

Django fullstack backend for Appscreen with PostgreSQL persistence, session-based auth, project snapshots, and usage tracking.

The backend also serves the Django templates from the repository-level `templates/` folder and static assets from `static/`.

## What it stores

- User accounts with email/password registration and login
- Active user sessions (token + expiration) for authenticated requests
- Full project payloads as JSONB so the frontend can save complete editor state
- Usage events for AI token spend, screenshots generated, and any future metrics

## Run locally

1. Install and run PostgreSQL locally (database: `appscreen`)
2. Copy `.env.example` to `.env`
3. Install packages and run the Django server:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

The app runs on `http://localhost:8000`.

- Main page: `http://localhost:8000/`
- Register page: `http://localhost:8000/register/`
- Editor page: `http://localhost:8000/editor/`
- Admin page: `http://localhost:8000/admin/`

## Auth style

- Login/Register uses Django session cookies
- `POST /api/auth/logout/` clears the current session

## Core endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
- `GET /api/projects/`
- `POST /api/projects/`
- `POST /api/usage/events/`
- `GET /api/usage/summary/`
