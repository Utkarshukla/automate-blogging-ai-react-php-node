/**
 * Rewrite Latest Article Script
 * @author Utkarsh Shukla
 * @version 1.0.1
 * This script:
 * 1. Fetches the latest article from Article Service
 * 2. Searches Google for related articles
 * 3. Scrapes the first two non-BeyondChats articles
 * 4. Uses LLM to rewrite the original article
 * 5. Publishes the rewritten article back to Article Service
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const ARTICLE_SERVICE_BASE_URL = process.env.ARTICLE_SERVICE_BASE_URL || 'http://localhost:8000';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'google').toLowerCase().trim();
const SERP_API_KEY = process.env.SERP_API_KEY;

// LLM API Keys
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Initialize provider
let openai = null;
if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('Using OpenAI API');
} else if (LLM_PROVIDER === 'google' && GOOGLE_AI_API_KEY) {
  console.log('Using Google Gemini API');
} else if (LLM_PROVIDER === 'ollama') {
  console.log(`Using Ollama (${OLLAMA_BASE_URL}/${OLLAMA_MODEL})`);
} else {
  console.error('ERROR: Invalid LLM_PROVIDER or missing API key');
  console.error('Set LLM_PROVIDER=google|openai|ollama and corresponding API key');
  process.exit(1);
}

/**
 * Main function to rewrite the latest article
 */
export async function rewriteLatest() {
  try {
    console.log('Starting article rewriting process...');

    // Step 1: Fetch latest article
    const article = await fetchLatestArticle();
    if (!article) {
      console.log('No articles found to rewrite');
      return { success: false, message: 'No articles found' };
    }

    console.log(`Fetched article: ${article.data.title}`);

    // Step 2: Search Google for related articles
    const searchResults = await googleSearch(article.data.title);
    console.log(`Found ${searchResults.length} search results`);

    // Step 3: Scrape reference articles
    const references = await scrapeReferenceArticles(searchResults);
    console.log(`Scraped ${references.length} reference articles`);

    if (references.length === 0) {
      console.log('No reference articles found, skipping rewrite');
      return { success: false, message: 'No reference articles found' };
    }

    // Step 4: Rewrite article using LLM
    const rewrittenContent = await rewriteWithLLM(
      article.data,
      references
    );
    console.log('Article rewritten successfully');

    // Step 5: Publish rewritten article
    const published = await publishArticle({
      title: article.data.title + ' (Rewritten)',
      content: rewrittenContent,
      version: 'rewritten',
      parent_article_id: article.data.id,
      references: references.map(ref => ref.url),
    });

    console.log('Rewritten article published successfully');
    return {
      success: true,
      originalArticleId: article.data.id,
      rewrittenArticleId: published.data.id,
    };
  } catch (error) {
    console.error('Error during rewriting:', error.message);
    throw error;
  }
}

/**
 * Check if URL is from BeyondChats website
 * 
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is from BeyondChats
 */
function isBeyondChatsUrl(url) {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return urlLower.includes('beyondchats.com') || 
         urlLower.includes('beyondchats') ||
         urlLower.includes('www.beyondchats.com');
}

/**
 * Fetch the latest article from Article Service
 * 
 * @returns {Promise<Object>} Article data
 */
async function fetchLatestArticle() {
  try {
    const response = await axios.get(`${ARTICLE_SERVICE_BASE_URL}/api/articles/latest`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch latest article: ${error.message}`);
  }
}

/**
 * Search Google for articles related to the title
 * 
 * This function searches Google and returns the first two blog/article URLs
 * from other websites (excluding BeyondChats).
 * 
 * Implementation options:
 * 1. SerpAPI (recommended for production) - requires API key
 * 2. Google Custom Search API (free tier available)
 * 3. DuckDuckGo HTML scraping (demo/fallback)
 * 
 * @param {string} query - Search query (article title)
 * @returns {Promise<Array>} Array of search result URLs
 */
async function googleSearch(query) {
  try {
    console.log(`Searching Google for: "${query}"`);
    
    if (SERP_API_KEY) {
      return await searchWithSerpAPI(query, SERP_API_KEY);
    }
    
    console.warn('WARNING: SERP_API_KEY not set. Using DuckDuckGo fallback (demo only).');
    return await searchWithDuckDuckGo(query);
    
  } catch (error) {
    console.error('Error during Google search:', error.message);
    return [];
  }
}

async function searchWithSerpAPI(query, apiKey) {
  const response = await axios.get('https://serpapi.com/search', {
    params: { engine: 'google', q: query, api_key: apiKey, num: 10 },
  });

  const urls = [];
  for (const result of response.data.organic_results || []) {
    const url = result.link;
    if (url && !isBeyondChatsUrl(url) && !url.includes('google.com') && !url.includes('youtube.com') &&
        (url.includes('/blog/') || url.includes('/article/') || url.includes('/post/'))) {
      urls.push(url);
      console.log(`  Found: ${result.title || url}`);
      if (urls.length >= 2) break;
    }
  }
  console.log(`Found ${urls.length} relevant articles via SerpAPI`);
  return urls;
}


/**
 * Fallback: Search using DuckDuckGo HTML scraping (demo only)
 * NOTE: This is for demonstration. Production should use proper APIs.
 * 
 * DuckDuckGo doesn't require API keys but results may be limited.
 * For production, use SerpAPI or Google Custom Search API.
 */
async function searchWithDuckDuckGo(query) {
  try {
    // Use DuckDuckGo HTML interface
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const urls = [];

    // Extract result links - try multiple selectors
    const linkSelectors = [
      '.result__a',
      'a.result__a',
      '.web-result a',
      '.result a',
    ];

    for (const selector of linkSelectors) {
      $(selector).each((i, element) => {
        if (urls.length >= 2) return false; // Stop after 2
        
        const href = $(element).attr('href');
        if (href) {
          let cleanUrl = href;
          
          // Handle DuckDuckGo redirect URLs
          if (href.includes('uddg=')) {
            try {
              const match = href.match(/uddg=([^&]+)/);
              if (match) {
                cleanUrl = decodeURIComponent(match[1]);
              }
            } catch (e) {
              // If decoding fails, try to extract from URL
              cleanUrl = href;
            }
          }
          
          // Ensure URL is absolute
          if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
          }
          
          // Filter: Only blog/article URLs, exclude BeyondChats and search engines
          if (!isBeyondChatsUrl(cleanUrl) &&
              !cleanUrl.includes('duckduckgo.com') &&
              !cleanUrl.includes('google.com') &&
              (cleanUrl.includes('/blog/') || 
               cleanUrl.includes('/article/') || 
               cleanUrl.includes('/post/') ||
               cleanUrl.match(/\/\d{4}\/\d{2}\//))) { // Date-based URLs (common for blogs)
            if (!urls.includes(cleanUrl)) {
              urls.push(cleanUrl);
            }
          }
        }
      });
      
      if (urls.length >= 2) break;
    }

    // If still not enough, try extracting from result titles
    if (urls.length < 2) {
      $('.result').each((i, element) => {
        if (urls.length >= 2) return false;
        
        const resultLink = $(element).find('a').first().attr('href');
        if (resultLink) {
          let cleanUrl = resultLink;
          if (resultLink.includes('uddg=')) {
            const match = resultLink.match(/uddg=([^&]+)/);
            if (match) {
              cleanUrl = decodeURIComponent(match[1]);
            }
          }
          
          if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
          }
          
          if (!isBeyondChatsUrl(cleanUrl) &&
              !cleanUrl.includes('duckduckgo.com') &&
              (cleanUrl.includes('/blog/') || cleanUrl.includes('/article/') || cleanUrl.includes('/post/'))) {
            if (!urls.includes(cleanUrl)) {
              urls.push(cleanUrl);
            }
          }
        }
      });
    }

    console.log(`Found ${urls.length} relevant articles via DuckDuckGo (demo)`);
    if (urls.length > 0) {
      urls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    }
    return urls.slice(0, 2); // Return max 2
  } catch (error) {
    console.error('DuckDuckGo search failed:', error.message);
    return [];
  }
}

/**
 * Scrape content from reference articles
 * 
 * Fetches the first two non-BeyondChats blog/article URLs from Google search results
 * and scrapes their main content.
 * 
 * @param {Array<string>} urls - Array of article URLs from Google search
 * @returns {Promise<Array>} Array of scraped article content with title, content, and URL
 */
async function scrapeReferenceArticles(urls) {
  const references = [];
  
  // Filter out BeyondChats URLs and ensure we have blog/article links
  const filteredUrls = urls
    .filter(url => 
      url && 
      !isBeyondChatsUrl(url) &&
      (url.includes('/blog/') || url.includes('/article/') || url.includes('/post/'))
    )
    .slice(0, 2); // Get first two non-BeyondChats articles

  if (filteredUrls.length === 0) {
    console.warn('No valid blog/article URLs found in search results');
    return [];
  }

  console.log(`Scraping ${filteredUrls.length} reference articles...`);

  for (const url of filteredUrls) {
    try {
      console.log(`  Scraping: ${url}`);
      const content = await scrapeArticle(url);
      if (content && content.content && content.content.length > 100) {
        references.push({
          url,
          title: content.title || 'Untitled Article',
          content: content.content,
        });
        console.log(`  ✓ Successfully scraped: ${content.title}`);
      } else {
        console.warn(`  ✗ Insufficient content scraped from: ${url}`);
      }
    } catch (error) {
      console.warn(`  ✗ Failed to scrape ${url}: ${error.message}`);
    }
  }

  return references;
}

/**
 * Scrape article content from a URL
 * 
 * Extracts the main content and title from a blog/article URL.
 * Tries multiple selectors to find the article content.
 * 
 * @param {string} url - Article URL
 * @returns {Promise<Object>} Scraped article data with title and content
 */
async function scrapeArticle(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Extract title - try multiple selectors
    let title = '';
    const titleSelectors = [
      'h1.entry-title',
      'h1.post-title',
      'article h1',
      'h1',
      '.entry-title',
      '.post-title',
      'title',
    ];

    for (const selector of titleSelectors) {
      const titleElement = $(selector).first();
      if (titleElement.length > 0) {
        title = titleElement.text().trim();
        // Remove site name if present (e.g., "Title | Site Name")
        title = title.split('|')[0].split('-')[0].trim();
        if (title.length > 10) break; // Good title found
      }
    }

    if (!title || title.length < 5) {
      title = $('title').text().trim().split('|')[0].split('-')[0].trim();
    }

    // Extract main content - try multiple selectors in order of preference
    let content = '';
    const contentSelectors = [
      'article .entry-content',
      'article .post-content',
      'article .article-content',
      '.entry-content',
      '.post-content',
      '.article-content',
      'article',
      'main article',
      'main .content',
      '.content',
      'main',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Remove unwanted elements
        element.find('script, style, nav, footer, aside, .advertisement, .ads').remove();
        content = element.text().trim();
        
        // Check if we got meaningful content
        if (content.length > 200) {
          break;
        }
      }
    }

    // Fallback: get body text but exclude navigation/footer
    if (!content || content.length < 200) {
      $('body').find('nav, footer, header, aside, script, style').remove();
      content = $('body').text().trim();
    }

    // Clean up content
    // Remove excessive whitespace but preserve paragraph breaks
    content = content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single
      .trim();

    if (!content || content.length < 100) {
      throw new Error('Insufficient content extracted');
    }

    return { 
      title: title || 'Untitled Article', 
      content: content 
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    throw new Error(`Failed to scrape article: ${error.message}`);
  }
}

/**
 * Rewrite article using LLM
 * 
 * This function:
 * 1. Analyzes the reference articles' style, tone, and formatting
 * 2. Rewrites the original article to match that style
 * 3. Preserves the original intent and key information
 * 4. Ensures content is original (not plagiarized)
 * 5. Adds a "References" section at the bottom with proper citations
 * 
 * @param {Object} originalArticle - Original article data
 * @param {Array} references - Reference articles with title, content, and URL
 * @returns {Promise<string>} Rewritten content
 */
async function rewriteWithLLM(originalArticle, references) {
  try {
    // Build reference content summary (first 800 chars of each for context)
    const referenceSummary = references
      .map((ref, index) => {
        return `Reference Article ${index + 1}:
Title: ${ref.title}
URL: ${ref.url}
Content Sample: ${ref.content.substring(0, 800)}...`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are an expert content writer and SEO specialist. Your task is to rewrite the following article to improve its quality, formatting, and match the style of top-ranking articles on Google.

INSTRUCTIONS:
1. Analyze the writing style, tone, and formatting of the reference articles
2. Rewrite the original article to match that style while preserving all key information
3. Improve formatting with proper headings, paragraphs, and structure
4. Use original phrasing - DO NOT copy sentences from reference articles
5. Maintain the original article's intent and core message
6. Make the content more engaging and professional
7. Add a "References" section at the very bottom with proper citations

Original Article to Rewrite:
Title: ${originalArticle.title}

Content:
${originalArticle.content}

Reference Articles (Study their style, tone, and formatting):
${referenceSummary}

IMPORTANT:
- The rewritten article must be original and not plagiarized
- Match the professional tone and formatting style of the reference articles
- Preserve all important information from the original article
- Add a "References" section at the end with these URLs:
${references.map((ref, i) => `${i + 1}. ${ref.url}`).join('\n')}

Now rewrite the article:`;

    let rewrittenContent;
    
    if (LLM_PROVIDER === 'google') {
      rewrittenContent = await rewriteWithGoogleGemini(prompt);
    } else if (LLM_PROVIDER === 'openai') {
      rewrittenContent = await rewriteWithOpenAI(prompt);
    } else if (LLM_PROVIDER === 'ollama') {
      rewrittenContent = await rewriteWithOllama(prompt);
    } else {
      throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
    }
    
    // Ensure References section is at the bottom
    if (!rewrittenContent.toLowerCase().includes('references')) {
      rewrittenContent += `\n\n## References\n\n${references.map((ref, i) => `${i + 1}. [${ref.title}](${ref.url})`).join('\n')}`;
    }
    
    return rewrittenContent;
  } catch (error) {
    throw new Error(`LLM rewriting failed: ${error.message}`);
  }
}

async function rewriteWithOpenAI(prompt) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert content writer specializing in article rewriting and SEO optimization.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });
  return completion.choices[0].message.content.trim();
}

async function rewriteWithGoogleGemini(prompt, retries = 3) {
  const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash-exp';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(
        apiUrl,
        {
          contents: [{ parts: [{ text: `You are an expert content writer specializing in article rewriting and SEO optimization.\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 3000 },
        },
        { headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GOOGLE_AI_API_KEY } }
      );

      if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Google Gemini API');
      }

      console.log('--------------:)------------------');
      console.log(response.data.candidates[0].content.parts[0].text.trim());
      console.log('--------------------------------');
      return response.data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 10000;
        console.log(`Rate limited. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

async function rewriteWithOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: `You are an expert content writer specializing in article rewriting and SEO optimization.\n\n${prompt}`,
      stream: false,
      options: { temperature: 0.7, num_predict: 3000 },
    },
    { timeout: 120000 }
  );
  return response.data.response.trim();
}

/**
 * Publish rewritten article to Article Service
 * 
 * @param {Object} articleData - Article data to publish
 * @returns {Promise<Object>} Published article data
 */
async function publishArticle(articleData) {
  try {
    const response = await axios.post(
      `${ARTICLE_SERVICE_BASE_URL}/api/articles`,
      articleData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to publish article: ${error.message}`);
  }
}

// If run directly, execute the rewrite process
if (import.meta.url === `file://${process.argv[1]}`) {
  rewriteLatest()
    .then(result => {
      console.log('Rewrite process completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Rewrite process failed:', error);
      process.exit(1);
    });
}

