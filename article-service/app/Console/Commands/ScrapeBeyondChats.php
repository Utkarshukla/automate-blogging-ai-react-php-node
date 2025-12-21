<?php

namespace App\Console\Commands;

use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\DomCrawler\Crawler;

/**
 * Scrape BeyondChats Articles Page Command
 * 
 * This command scrapes articles from https://beyondchats.com/blogs/
 * 
 * Flow:
 * 1. Navigate to the blog listing page
 * 2. Find the last pagination page
 * 3. Fetch the 5 oldest articles from that page
 * 4. Scrape title and main content from each article
 * 5. Store as 'original' version articles
 * 6. Skip duplicates using source_url
 * 
 * Why scraping is done via cron:
 * - Scraping is a time-consuming operation
 * - Cron allows async processing without blocking API requests
 * - Can be scheduled to run during off-peak hours
 * - Provides better error recovery and retry mechanisms
 * 
 * Why this service owns the database:
 * - Single source of truth for article data
 * - Centralized data validation and integrity
 * - Easier to maintain relationships (parent-child for rewritten articles)
 * - Other services (AI Rewriter, Frontend) are consumers, not data owners
 */
class ScrapeBeyondChats extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'articles:scrape-beyondchats';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape the 5 oldest articles from BeyondChats blog';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting BeyondChats scraping...');

        try {
            $baseUrl = 'https://beyondchats.com/blogs/';
            
            // Step 1: Find the last pagination page
            $lastPage = $this->findLastPage($baseUrl);
            $this->info("Found last page: {$lastPage}");

            // Step 2: Collect articles starting from last page, going backwards until we have 5
            $articleUrls = [];
            $currentPage = $lastPage;
            $targetCount = 5;
            
            while (count($articleUrls) < $targetCount && $currentPage >= 1) {
                // Use correct pagination format: /blogs/page/15/
                $pageUrl = $currentPage == 1 
                    ? $baseUrl 
                    : rtrim($baseUrl, '/') . "/page/{$currentPage}/";
                
                $this->info("Fetching articles from page {$currentPage} (URL: {$pageUrl})...");
                
                $pageArticles = $this->getArticleUrlsFromPage($pageUrl);
                
                if (empty($pageArticles)) {
                    $this->warn("No articles found on page {$currentPage}");
                    $currentPage--;
                    continue;
                }
                
                // Calculate how many articles we still need
                $needed = $targetCount - count($articleUrls);
                
                if ($needed > 0) {
                    // If this is the last page (oldest), take the LAST articles (oldest ones)
                    // If we need articles from a previous page, take the LAST articles from that page too
                    $articlesToAdd = array_slice($pageArticles, -$needed);
                    
                    // Add articles from this page (avoiding duplicates)
                    foreach ($articlesToAdd as $url) {
                        if (!in_array($url, $articleUrls) && count($articleUrls) < $targetCount) {
                            $articleUrls[] = $url;
                        }
                    }
                }
                
                $this->info("Found " . count($pageArticles) . " articles on page {$currentPage}, added " . count($articlesToAdd ?? []) . ", total collected: " . count($articleUrls));
                
                // If we still need more articles, go to previous page
                if (count($articleUrls) < $targetCount) {
                    $currentPage--;
                }
            }
            
            if (empty($articleUrls)) {
                $this->warn('No articles found');
                return Command::FAILURE;
            }

            // Step 3: Limit to exactly 5 articles (oldest ones)
            $articleUrls = array_slice($articleUrls, 0, $targetCount);
            $this->info('Collected ' . count($articleUrls) . ' articles to scrape (from pages ' . ($lastPage - ($currentPage)) . ' to ' . $lastPage . ')');

            // Step 4: Scrape each article
            $scraped = 0;
            $skipped = 0;

            foreach ($articleUrls as $url) {
                // Check if article already exists by source_url
                if (Article::where('source_url', $url)->exists()) {
                    $this->warn("Skipping duplicate (source_url): {$url}");
                    $skipped++;
                    continue;
                }

                $articleData = $this->scrapeArticle($url);
                
                if ($articleData) {
                    // Generate unique slug
                    $baseSlug = Str::slug($articleData['title']);
                    $slug = $this->generateUniqueSlug($baseSlug);
                    
                    // Double-check slug doesn't exist (safety check)
                    if (Article::where('slug', $slug)->exists()) {
                        $this->warn("Skipping duplicate (slug): {$slug} from {$url}");
                        $skipped++;
                        continue;
                    }

                    try {
                        Article::create([
                            'title' => $articleData['title'],
                            'slug' => $slug,
                            'content' => $articleData['content'],
                            'source_url' => $url,
                            'version' => 'original',
                            'published_at' => $articleData['published_at'] ?? now(),
                        ]);

                        $this->info("Scraped: {$articleData['title']}");
                        $scraped++;
                    } catch (\Illuminate\Database\QueryException $e) {
                        // Handle duplicate entry errors gracefully
                        if ($e->getCode() == 23000) {
                            $this->warn("Skipping duplicate entry: {$articleData['title']}");
                            $skipped++;
                        } else {
                            throw $e;
                        }
                    }
                } else {
                    $this->warn("Failed to scrape: {$url}");
                }
            }

            $this->info("Scraping complete! Scraped: {$scraped}, Skipped: {$skipped}");
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Error during scraping: " . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Find the last pagination page number
     * 
     * Uses DOM crawler to find pagination links more reliably.
     * Handles Elementor-based pagination.
     * Falls back to regex if DOM parsing fails.
     * 
     * @param string $baseUrl
     * @return int
     */
    private function findLastPage(string $baseUrl): int
    {
        try {
            $response = Http::timeout(30)->get($baseUrl);
            
            if (!$response->successful()) {
                $this->warn('Could not fetch base page, defaulting to page 1');
                return 1;
            }

            $html = $response->body();
            $crawler = new Crawler($html);
            
            $maxPage = 1;
            
            // Try multiple pagination selectors (including ct-pagination)
            $selectors = [
                '.ct-pagination a',                    // Blocksy theme pagination
                '.ct-pagination .page-numbers',       // Blocksy page numbers
                'a[href*="page"]',                    // Any link with "page"
                '.pagination a',                      // Standard pagination
                '.page-numbers a',                    // WordPress page numbers
                '.elementor-pagination a',            // Elementor pagination
                '.elementor-posts-navigation a',      // Elementor posts navigation
                'nav a[href*="page"]',                // Navigation links
            ];

            foreach ($selectors as $selector) {
                try {
                    $crawler->filter($selector)->each(function ($node) use (&$maxPage) {
                        $href = $node->attr('href');
                        $text = trim($node->text());
                        
                        // Extract page number from href (supports both ?page= and /page/)
                        if (preg_match('/(?:[?&]page[=\/]|\/page\/)(\d+)/i', $href, $matches)) {
                            $pageNum = intval($matches[1]);
                            $maxPage = max($maxPage, $pageNum);
                        }
                        
                        // Also check if link text is a number (like "15" for last page)
                        if (is_numeric($text) && intval($text) > $maxPage) {
                            $maxPage = intval($text);
                        }
                    });
                } catch (\Exception $e) {
                    // Continue with next selector
                    continue;
                }
            }

            // Fallback to regex if DOM crawler didn't find anything
            if ($maxPage === 1) {
                // Look for page numbers in URLs (supports both formats)
                preg_match_all('/(?:[?&]page[=\/]|\/page\/)(\d+)/i', $html, $matches);
                if (!empty($matches[1])) {
                    $maxPage = max(array_map('intval', $matches[1]));
                }
                
                // Also look for "Last" or "Next" links that might indicate total pages
                if (preg_match('/page[\/=](\d+)[^0-9]*["\']>.*(?:last|end)/i', $html, $matches)) {
                    $maxPage = max($maxPage, intval($matches[1]));
                }
            }

            $this->info("Detected last page: {$maxPage}");
            return max(1, $maxPage);
        } catch (\Exception $e) {
            $this->warn("Error finding last page: " . $e->getMessage());
            return 1;
        }
    }

    /**
     * Get article URLs from a specific page
     * 
     * Uses DOM crawler to find article links more reliably.
     * Handles Elementor-based blog structure with deep nesting.
     * 
     * @param string $pageUrl
     * @return array
     */
    private function getArticleUrlsFromPage(string $pageUrl): array
    {
        try {
            $response = Http::timeout(30)->get($pageUrl);
            
            if (!$response->successful()) {
                $this->warn("Failed to fetch page: {$pageUrl} (Status: " . $response->status() . ")");
                return [];
            }

            $html = $response->body();
            
            // Debug: Check if page has blog content
            if (strpos($html, '/blogs/') === false && strpos($html, 'entry-card') === false) {
                $this->warn("Page HTML doesn't contain '/blogs/' links or entry-card elements. URL: {$pageUrl}");
            }
            
            $crawler = new Crawler($html);
            $urls = [];

            // Try selectors for Blocksy theme blog structure
            $selectors = [
                // Blocksy theme specific (most specific first)
                '.entries article.entry-card .entry-title a',  // Entry title links
                '.entries .entry-card .entry-title a',         // Alternative selector
                '.entries article a[href*="/blogs/"]',          // Any link in entries
                '.entries .entry-card a[href*="/blogs/"]',     // Entry card links
                
                // Fallback selectors
                'article.entry-card a[href*="/blogs/"]',       // Entry card articles
                '.entry-title a[href*="/blogs/"]',             // Entry title links
                'article a[href*="/blogs/"]',                  // Article tags
                '.post a[href*="/blogs/"]',                    // Post links
                
                // Generic blog links
                'a[href*="/blogs/"]',                         // Any blog link
            ];

            foreach ($selectors as $selector) {
                try {
                    $found = 0;
                    $crawler->filter($selector)->each(function ($node) use (&$urls, &$found, $crawler) {
                        $url = $node->attr('href');
                        if ($url) {
                            // Convert relative URLs to absolute
                            if (strpos($url, 'http') !== 0) {
                                $url = 'https://beyondchats.com' . ltrim($url, '/');
                            }
                            
                            // Only include blog/article URLs, exclude category/tag pages and pagination
                            if (strpos($url, '/blogs/') !== false && 
                                strpos($url, '?page=') === false &&
                                strpos($url, '/page/') === false &&  // Exclude pagination links
                                strpos($url, '/category/') === false &&
                                strpos($url, '/tag/') === false &&
                                strpos($url, '/author/') === false &&  // Exclude author links
                                strpos($url, '#') === false &&  // Exclude anchor links
                                !in_array($url, $urls)) {
                                
                                // Try to get article title for logging
                                $title = 'Unknown';
                                try {
                                    // Get title from the link text or parent article
                                    $linkText = trim($node->text());
                                    if (!empty($linkText)) {
                                        $title = $linkText;
                                    } else {
                                        // Try to get from parent article
                                        $parentArticle = $node->closest('article');
                                        if ($parentArticle->count() > 0) {
                                            $titleNode = $parentArticle->filter('.entry-title');
                                            if ($titleNode->count() > 0) {
                                                $title = trim($titleNode->text());
                                            }
                                        }
                                    }
                                } catch (\Exception $e) {
                                    // Title extraction failed, use URL
                                    $title = basename($url);
                                }
                                
                                $urls[] = $url;
                                $found++;
                                $this->info("  ✓ Found: {$title}");
                            }
                        }
                    });
                    
                    if ($found > 0) {
                        $this->info("Found {$found} articles using selector: {$selector}");
                        break; // Stop if we found articles with this selector
                    }
                } catch (\Exception $e) {
                    // Continue with next selector
                    continue;
                }
            }

            // Fallback to regex if DOM crawler didn't find anything
            if (empty($urls)) {
                $this->warn("No articles found with CSS selectors, trying regex fallback...");
                // Look for /blogs/ URLs in href attributes
                preg_match_all('/href=["\']([^"\']*\/blogs\/[^"\']+)["\']/i', $html, $matches);
                if (!empty($matches[1])) {
                    foreach ($matches[1] as $url) {
                        // Skip pagination and category links
                        if (strpos($url, '?page=') !== false || 
                            strpos($url, '/page/') !== false ||
                            strpos($url, '/category/') !== false ||
                            strpos($url, '/tag/') !== false ||
                            strpos($url, '/author/') !== false ||
                            strpos($url, '#') !== false) {
                            continue;
                        }
                        
                        if (strpos($url, 'http') !== 0) {
                            $url = 'https://beyondchats.com' . ltrim($url, '/');
                        }
                        if (strpos($url, '/blogs/') !== false && !in_array($url, $urls)) {
                            $urls[] = $url;
                            $this->info("  ✓ Found via regex: " . basename($url));
                        }
                    }
                    if (!empty($urls)) {
                        $this->info("Found " . count($urls) . " articles using regex fallback");
                    }
                }
            }

            // Debug: Log all found URLs
            if (!empty($urls)) {
                $this->info("Total unique article URLs found: " . count($urls));
            } else {
                $this->warn("No article URLs found on this page. Page might be empty or structure changed.");
            }

            return array_unique($urls);
        } catch (\Exception $e) {
            $this->warn("Error fetching article URLs: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Scrape title and content from an article URL
     * 
     * Uses DOM crawler for more reliable HTML parsing.
     * 
     * @param string $url
     * @return array|null
     */
    private function scrapeArticle(string $url): ?array
    {
        try {
            $response = Http::timeout(30)->get($url);
            
            if (!$response->successful()) {
                return null;
            }

            $html = $response->body();
            $crawler = new Crawler($html);

            // Extract title using DOM crawler
            $title = null;
            try {
                $titleNode = $crawler->filter('h1, article h1, .post-title, .entry-title')->first();
                if ($titleNode->count() > 0) {
                    $title = trim($titleNode->text());
                } else {
                    // Fallback to page title
                    $titleNode = $crawler->filter('title')->first();
                    if ($titleNode->count() > 0) {
                        $title = trim($titleNode->text());
                        // Remove site name if present
                        $title = preg_replace('/\s*[-|]\s*.*$/', '', $title);
                    }
                }
            } catch (\Exception $e) {
                // Fallback to regex
                if (preg_match('/<h1[^>]*>(.*?)<\/h1>/is', $html, $matches)) {
                    $title = strip_tags(trim($matches[1]));
                }
            }

            // Extract main content using DOM crawler
            $content = null;
            try {
                $contentNode = $crawler->filter('article, .post-content, .entry-content, .article-content')->first();
                if ($contentNode->count() > 0) {
                    $content = $this->cleanHtml($contentNode->html());
                } else {
                    // Try to find main content area
                    $contentNode = $crawler->filter('main, .main-content, #content')->first();
                    if ($contentNode->count() > 0) {
                        $content = $this->cleanHtml($contentNode->html());
                    }
                }
            } catch (\Exception $e) {
                // Fallback to regex
                if (preg_match('/<article[^>]*>(.*?)<\/article>/is', $html, $matches)) {
                    $content = $this->cleanHtml($matches[1]);
                }
            }

            if (!$title || !$content || strlen($content) < 100) {
                $this->warn("Insufficient content scraped from: {$url}");
                return null;
            }

            // Try to extract published date
            $publishedAt = null;
            try {
                $dateNode = $crawler->filter('time[datetime], .published-date, .post-date')->first();
                if ($dateNode->count() > 0) {
                    $publishedAt = $dateNode->attr('datetime') ?? $dateNode->text();
                }
            } catch (\Exception $e) {
                // Fallback to regex
                if (preg_match('/<time[^>]*datetime=["\']([^"\']+)["\']/i', $html, $matches)) {
                    $publishedAt = $matches[1];
                }
            }

            return [
                'title' => $title,
                'content' => $content,
                'published_at' => $publishedAt ? date('Y-m-d H:i:s', strtotime($publishedAt)) : null,
            ];
        } catch (\Exception $e) {
            $this->warn("Error scraping article {$url}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Generate a unique slug by appending a number if needed
     * 
     * @param string $baseSlug
     * @return string
     */
    private function generateUniqueSlug(string $baseSlug): string
    {
        $slug = $baseSlug;
        $counter = 1;

        while (Article::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Clean HTML content - remove scripts, styles, and extract text
     * 
     * @param string $html
     * @return string
     */
    private function cleanHtml(string $html): string
    {
        // Remove script and style tags
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);
        $html = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $html);
        
        // Convert common HTML tags to newlines for readability
        $html = preg_replace('/<\/p>/i', "\n\n", $html);
        $html = preg_replace('/<\/div>/i', "\n", $html);
        $html = preg_replace('/<\/h[1-6]>/i', "\n\n", $html);
        
        // Remove all HTML tags
        $html = strip_tags($html);
        
        // Clean up whitespace
        $html = preg_replace('/\n\s*\n\s*\n/', "\n\n", $html);
        $html = trim($html);
        
        return $html;
    }
}
