# AI Auto-Blogging System

**Automated blog content scraping, AI rewriting, and publishing platform**

## Overview

An automated blogging system that:
1. **Scrapes** articles from BeyondChats blog (cron-based)
2. **Rewrites** them using AI/LLM with Google reference articles
3. **Publishes** both original and rewritten versions via web frontend

Perfect for content aggregation, SEO optimization, and automated content creation.

---
# Quick Start Guide
Get the entire system running in **5 minutes**.
---

## Prerequisites Checklist

```bash
# Check if you have everything installed
php --version            # PHP 8.2+
node --version           # Node.js 18+
composer --version       # Composer 2+
```

---

## Setup (3 Commands)

```bash
# 1. Clone and enter directory
git clone https://github.com/Utkarshukla/automate-blogging-ai-llm-react-php-node.git
cd automate-blogging-ai-llm-react-php-node

# 2. Setup Article Service (Laravel)
cd article-service
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --force
cd ..


# 3. Setup AI Rewriter
cd ai-rewriter-service
cp .env.example .env
# Edit .env and add your Serp (https://serpapi.com/) + LLM Model (local ollama supported)
npm install
cd ..

# 4. Setup Frontend
cd web-frontend
cp .env.example .env
npm install
cd ..
```

---

## Required Configuration

### 1. Article Service `.env`
```bash
cd article-service
nano .env  # or use your favorite editor
```

```env
# (Your Database Settings)
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=assesment_laravel_ai_db
DB_USERNAME=root
DB_PASSWORD=
```

### 2. AI Rewriter `.env`
```bash
# Open the env of nodejs and fill the variables 
cd ai-rewriter-service
nano .env
```

### 3. Frontend `.env`
```bash
cd web-frontend
nano .env
```

**Minimum required:**
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Start Services

### Option A: Individual Terminals (Recommended for Development)

```bash
# Terminal 1 - Article Service
cd article-service
php artisan serve
# Output: Server started on http://127.0.0.1:8000
```

```bash
# Terminal 2 - AI Rewriter (Optional)
cd ai-rewriter-service
npm run dev
# Output: AI Rewriter running on http://localhost:3001
```

```bash
# Terminal 3 - Frontend
cd web-frontend
npm run dev
# Output: Local: http://localhost:5173
```

## Verify Setup

### 1. Check Article Service API
```bash
curl http://localhost:8000/api/articles
# Expected: {"data":[],"meta":{...}}
```

### 2. Check Frontend
Open browser: http://localhost:5173 (or 3000 for Docker)
- Should see "No articles yet" or article list

### 3. Check AI Rewriter (Optional)
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

---

## Create Your First Article

### Method 1: Via Scraper Command
```bash
cd article-service
php artisan articles:scrape-beyondchats
```

**Output:**
```
✓ Found 15 articles on page 12
✓ Scraped: "How to Scale Your SaaS Business"
✓ Scraped: "10 Tips for Better Customer Support"
...
✓ Saved 5 new articles
```


## Rewrite an Article

### Method 1: Run Rewriter Script
```bash
cd ai-rewriter-service
npm run rewrite:latest
```

##  Automated Processing (Cron Setup)

### For Unix/Linux/macOS:

```bash
crontab -e
```

Add these lines:
```cron
# Scrape new articles daily at 2 AM
0 2 * * * cd /path/to/article-service && php artisan articles:scrape-beyondchats

# Rewrite articles every 30 minutes
*/30 * * * * cd /path/to/ai-rewriter-service && npm run rewrite:latest
```



# System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AUTO-BLOGGING SYSTEM                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Web Frontend   │────────▶│ Article Service  │◀────────│  AI Rewriter    │
│   (React)       │  REST   │    (Laravel)     │  REST   │   (Node.js)     │
│   Port: 3000    │   API   │   Port: 8000     │   API   │   Port: 3001    │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                             │
                                     │                             │
                            ┌────────┴────────┐          ┌─────────┴─────────┐
                            │                 │          │                   │
                            ▼                 ▼          ▼                   ▼
                     ┌──────────┐      ┌──────────┐   ┌─────────┐    ┌──────────┐
                     │  MySQL   │      │  Redis   │   │ OpenAI  │    │  Google  │
                     │ Database │      │  Cache   │   │   API   │    │  Search  │
                     └──────────┘      └──────────┘   └─────────┘    └──────────┘

                     ┌─────────────────────────────────────────┐
                     │           EXTERNAL SOURCES              │
                     │                                         │
                     │  ┌──────────────┐    ┌──────────────┐  │
                     │  │ BeyondChats  │    │   Reference  │  │
                     │  │     Blog     │    │   Articles   │  │
                     │  └──────────────┘    └──────────────┘  │
                     └─────────────────────────────────────────┘
```

---

## Data Flow: Scraping → Rewriting → Display

```
PHASE 1: SCRAPING (Daily @ 2 AM)
───────────────────────────────────────────────────────────────────────
┌──────────┐
│   CRON   │
└────┬─────┘
     │
     │ Trigger
     ▼
┌─────────────────┐         ┌──────────────────┐         ┌──────────┐
│ Article Service │────────▶│  BeyondChats     │────────▶│ Database │
│                 │ Scrape  │      Blog        │  Store  │          │
│  Scrape Cmd     │◀────────│                  │         │ version= │
└─────────────────┘ HTML    └──────────────────┘         │ original │
                                                          │ is_rew=0 │
                                                          └──────────┘


PHASE 2: REWRITING (Every 30 min)
───────────────────────────────────────────────────────────────────────
┌──────────┐
│   CRON   │
└────┬─────┘
     │
     │ Trigger
     ▼
┌─────────────────┐    1. GET /latest     ┌─────────────────┐
│  AI Rewriter    │◀──────────────────────│ Article Service │
│                 │                       │                 │
│                 │──────────────────────▶│                 │
└────────┬────────┘    Article Data       └─────────────────┘
         │                                         ▲
         │ 2. Search                               │
         ▼                                         │ 5. POST /articles
┌─────────────────┐                               │    (rewritten)
│ Google Search   │                               │
│      API        │                               │
└────────┬────────┘                               │
         │                                         │
         │ 3. Reference URLs                ┌──────┴─────┐
         ▼                                  │  Database  │
┌─────────────────┐                        │            │
│  Scrape Refs    │                        │  UPDATE:   │
│   (Cheerio)     │                        │ parent.    │
└────────┬────────┘                        │ is_rew=1   │
         │                                  └────────────┘
         │ 4. Rewrite
         ▼
┌─────────────────┐
│   OpenAI API    │
│   GPT-4 Model   │
└─────────────────┘


PHASE 3: DISPLAY (User Browsing)
───────────────────────────────────────────────────────────────────────
┌──────────────┐     GET /articles      ┌─────────────────┐
│     User     │◀──────────────────────▶│  Web Frontend   │
│   Browser    │    View Articles       │     (React)     │
└──────────────┘                        └────────┬────────┘
                                                 │
                                                 │ REST API
                                                 ▼
                                        ┌─────────────────┐
                                        │ Article Service │
                                        │      API        │
                                        └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │    Database     │
                                        │                 │
                                        │  • Original     │
                                        │  • Rewritten    │
                                        │  • Relations    │
                                        └─────────────────┘
```

## Utkarsh Shukla Lead Backend Engineer 
# B.Tech CSE
# Backend Team Lead # automate-blogging-ai-llm-react-php-node
