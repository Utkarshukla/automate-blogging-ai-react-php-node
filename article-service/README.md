# Article Service (Laravel)

Backend service for managing articles - handles scraping, CRUD operations, and data persistence.

## Overview

This service is responsible for:
- **Data Ownership**: Owns the articles database (single source of truth)
- **Web Scraping**: Scrapes articles from BeyondChats blog via cron job
- **API Endpoints**: Provides RESTful API for article management
- **Data Validation**: Ensures data integrity and prevents duplicates

## Why Scraping is Done via Cron

1. **Performance**: Scraping is time-consuming and would block API requests
2. **Reliability**: Cron allows retry mechanisms and error recovery
3. **Scheduling**: Can run during off-peak hours to reduce server load
4. **Separation of Concerns**: Keeps scraping logic separate from API logic
5. **Scalability**: Can be moved to a queue system (RabbitMQ/Kafka) in production

## Why This Service Owns the Database

1. **Single Source of Truth**: Centralized data management prevents inconsistencies
2. **Data Integrity**: Foreign key constraints and validation rules are enforced here
3. **Relationships**: Manages parent-child relationships between original and rewritten articles
4. **Consistency**: Other services (AI Rewriter, Frontend) are consumers, not data owners
5. **Simplified Architecture**: Reduces complexity of data synchronization

## Database Schema

The `articles` table includes:
- `id`: Primary key
- `title`: Article title
- `slug`: URL-friendly slug (auto-generated)
- `content`: Full article content (longText)
- `source_url`: Original article URL (unique, prevents duplicates)
- `version`: Enum ('original' or 'rewritten')
- `parent_article_id`: Links rewritten articles to originals
- `references`: JSON array of reference URLs
- `published_at`: Publication timestamp
- `timestamps`: created_at, updated_at

## API Endpoints

All endpoints are prefixed with `/api`:

- `GET /api/articles` - List all articles (with pagination)
- `GET /api/articles/{id}` - Get article by ID
- `GET /api/articles/latest` - Get latest original article (used by AI Rewriter)
- `POST /api/articles` - Create new article
- `PUT /api/articles/{id}` - Update article
- `DELETE /api/articles/{id}` - Delete article

## Environment Variables

```env
DB_CONNECTION=mysql
DB_HOST=mysql  # Use service name in Docker, localhost for local dev
DB_PORT=3306
DB_DATABASE=assesment_laravel_ai_db
DB_USERNAME=root
DB_PASSWORD=root

REDIS_HOST=redis
REDIS_PORT=6379

APP_ENV=local
APP_DEBUG=true
```

## Commands

### Scraping Command
```bash
php artisan articles:scrape-beyondchats
```

This command:
1. Finds the last pagination page on BeyondChats blog
2. Fetches the 5 oldest articles from that page
3. Scrapes title and content from each article
4. Stores them as 'original' version articles
5. Skips duplicates using source_url

### Scheduler

The scraping command is registered in `routes/console.php` to run daily at 2 AM UTC.

To test locally:
```bash
php artisan schedule:work
```

## Local Development

1. Install dependencies:
```bash
composer install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure database in `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=assesment_laravel_ai_db
DB_USERNAME=root
DB_PASSWORD=
```

4. Run migrations:
```bash
php artisan migrate
```

5. Start server:
```bash
php artisan serve
```

## Testing

```bash
# Run tests
php artisan test

# Create test articles using factory
php artisan tinker
>>> Article::factory()->count(5)->create()
```

## Docker

See `/infra/docker-compose.yml` for Docker configuration.

The service automatically:
- Runs migrations on startup
- Starts the Laravel development server
- Connects to MySQL and Redis services
