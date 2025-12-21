# AI Rewriter Service (NodeJS)

Service that rewrites articles using AI/LLM, fetching reference articles from Google search.

## Overview

This service:
- Fetches the latest article from Article Service
- Searches Google for related articles
- Scrapes reference articles
- Uses OpenAI (or other LLM) to rewrite the article
- Publishes rewritten article back to Article Service

## Why Google Scraping is Demo-Only

1. **Terms of Service**: Google's ToS prohibit automated scraping
2. **Legal Issues**: Scraping can violate copyright and terms
3. **Reliability**: Scraping is fragile and breaks easily
4. **Rate Limiting**: Google blocks automated requests

**Production Solution**: Use official APIs:
- Google Custom Search API
- SerpAPI
- Bing Search API
- Custom search index

## How This Would Scale in Production

1. **Search API**: Replace scraping with official Google Custom Search API
2. **Queue System**: Use RabbitMQ/Kafka for async processing
3. **Multiple LLM Providers**: Support OpenAI, Anthropic, etc.
4. **Caching**: Cache search results and rewritten content
5. **Rate Limiting**: Implement proper rate limiting
6. **Cost Optimization**: Token limits, model selection, caching
7. **Error Handling**: Retry logic, fallback mechanisms
8. **Monitoring**: Track costs, success rates, processing times

## Why This is Async / Cron-Based

1. **Performance**: LLM calls take 30+ seconds
2. **Non-blocking**: Doesn't block other operations
3. **Batch Processing**: Can process multiple articles
4. **Error Recovery**: Better retry mechanisms
5. **Cost Control**: Can schedule during off-peak hours
6. **Scalability**: Can be distributed across workers

## Environment Variables

```env
# Required
ARTICLE_SERVICE_BASE_URL=http://article-service:8000
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Search API (recommended for production)
# Option 1: SerpAPI (recommended - easiest to use)
SERP_API_KEY=your_serpapi_key_here

# Option 2: Google Custom Search API (free tier available)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CX=your_search_engine_id_here

# If no search API is set, will use DuckDuckGo fallback (demo only)
NODE_ENV=development
PORT=3001
```

### Getting Search API Keys

**SerpAPI (Recommended)**:
1. Sign up at https://serpapi.com/
2. Get your API key from dashboard
3. Add `SERP_API_KEY=your_key` to `.env`

**Google Custom Search API**:
1. Create project at https://console.cloud.google.com/
2. Enable Custom Search API
3. Create Custom Search Engine at https://programmablesearchengine.google.com/
4. Get API key and CX (Search Engine ID)
5. Add both to `.env`

## Usage

### Run as Script (Cron)
```bash
npm run rewrite:latest
```

### Run as Service
```bash
npm run dev
```

### Manual Trigger (if service is running)
```bash
curl -X POST http://localhost:3001/rewrite/latest
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

3. Set `OPENAI_API_KEY` in `.env`

4. Run:
```bash
npm run rewrite:latest
```

## Docker

See `/infra/docker-compose.yml` for Docker configuration.

## Notes

- Google search is currently a placeholder - replace with actual API
- LLM model can be changed in `rewriteWithLLM()` function
- Add retry logic for production use
- Implement proper error handling and logging

