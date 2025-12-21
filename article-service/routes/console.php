<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Schedule;

/**
 * Console Routes / Scheduler Configuration
 * 
 * Register scheduled tasks here.
 * The scraping command is registered to run daily.
 * 
 * To test locally: php artisan schedule:work
 * In production: Add to crontab: * * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
 */

// Schedule the scraping command to run daily at 2 AM
// This ensures fresh content is scraped regularly without blocking API requests
Schedule::command('articles:scrape-beyondchats')
    ->dailyAt('02:00')
    ->timezone('UTC')
    ->withoutOverlapping()
    ->runInBackground();

// Optional: Add a test schedule for development
// Uncomment to run every hour during development
// Schedule::command('articles:scrape-beyondchats')->hourly();
