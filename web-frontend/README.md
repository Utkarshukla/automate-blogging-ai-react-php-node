# Web Frontend (React + Vite)

Read-only frontend for viewing articles with Original and Rewritten versions.

## Overview

This is a simple, clean React application that:
- Lists all articles with pagination
- Shows article details with tabs for Original/Rewritten versions
- Displays references when available
- Responsive design with Tailwind CSS

## Features

- **Article List**: Paginated list of all articles
- **Article Detail**: View article with tabs for Original/Rewritten
- **References**: Display reference URLs
- **Responsive**: Works on mobile and desktop

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Set `VITE_API_BASE_URL` in `.env`

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Docker

See `/infra/docker-compose.yml` for Docker configuration.

## Pages

- `/articles` - Article list
- `/articles/:id` - Article detail with tabs
