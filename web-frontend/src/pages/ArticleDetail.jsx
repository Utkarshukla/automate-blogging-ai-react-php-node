/**
 * Article Detail Page
 * 
 * Enhanced UI with side-by-side comparison of Original vs Rewritten
 * Clear visual differentiation and better UX
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { articleService } from '../services/api';

export default function ArticleDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [originalArticle, setOriginalArticle] = useState(null);
  const [rewrittenVersions, setRewrittenVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'compare'

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await articleService.getById(id);
      const articleData = response.data.data;
      setArticle(articleData);
      
      // Determine original and rewritten articles
      if (articleData.version === 'rewritten' && articleData.parent) {
        setOriginalArticle(articleData.parent);
        setRewrittenVersions([articleData]);
      } else if (articleData.version === 'original') {
        setOriginalArticle(articleData);
        if (articleData.rewritten_versions) {
          setRewrittenVersions(articleData.rewritten_versions);
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content) => {
    return content
      .split('\n')
      .map((para, i) => para.trim() && `<p class="mb-4">${para.trim()}</p>`)
      .filter(Boolean)
      .join('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl">{error || 'Article not found'}</div>
        <Link to="/articles" className="ml-4 text-blue-500 hover:underline">
          Back to Articles
        </Link>
      </div>
    );
  }

  const hasBothVersions = originalArticle && rewrittenVersions.length > 0;
  const currentRewritten = rewrittenVersions[0];

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/articles"
        className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-6 transition-colors"
      >
        <svg style={{width:'50px' }} style={{width:'50px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Articles
      </Link>

      {/* Header with Version Badge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-gray-800">{article.title}</h1>
          <div className="flex items-center gap-3">
            {article.version === 'original' ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border-2 border-blue-300">
                <svg style={{width:'50px' }} className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Original Article
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-300">
                <svg style={{width:'50px' }} className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                AI Rewritten
              </span>
            )}
          </div>
        </div>

        {article.published_at && (
          <div className="text-sm text-gray-500 mb-4">
            Published: {new Date(article.published_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        )}

        {/* View Mode Toggle */}
        {hasBothVersions && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setViewMode('single')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Single View
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'compare'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Compare View
            </button>
          </div>
        )}
      </div>

      {/* Content Display */}
      {viewMode === 'compare' && hasBothVersions ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Article */}
          <div className="bg-white rounded-lg shadow-lg border-l-4 border-blue-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-blue-800">Original</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                Source
              </span>
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{
                __html: formatContent(originalArticle.content),
              }}
            />
            {originalArticle.source_url && (
              <div className="mt-4 pt-4 border-t">
                <a
                  href={originalArticle.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  View Source →
                </a>
              </div>
            )}
          </div>

          {/* Rewritten Article */}
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg shadow-lg border-l-4 border-green-500 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-800">AI Rewritten</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                Enhanced
              </span>
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{
                __html: formatContent(currentRewritten.content),
              }}
            />
            {currentRewritten.references && currentRewritten.references.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-2">References:</p>
                <ul className="text-xs space-y-1">
                  {currentRewritten.references.slice(0, 3).map((ref, i) => (
                    <li key={i}>
                      <a href={ref} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                        {ref.substring(0, 50)}...
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-lg shadow-lg p-8 mb-6 ${
          article.version === 'original'
            ? 'bg-white border-l-4 border-blue-500'
            : 'bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500'
        }`}>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: formatContent(article.content),
            }}
          />
        </div>
      )}

      {/* References Section */}
      {article.references && article.references.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <svg style={{width:'50px' }} className="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            References
          </h2>
          <ul className="space-y-2">
            {article.references.map((ref, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <a
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                >
                  {ref}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Articles */}
      {hasBothVersions && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Related Versions</h3>
          <div className="space-y-2">
            {originalArticle && (
              <Link
                to={`/articles/${originalArticle.id}`}
                className="block p-3 bg-white rounded hover:shadow-md transition-shadow"
              >
                <span className="text-sm font-medium text-blue-600">Original Article</span>
                <p className="text-sm text-gray-600 mt-1">{originalArticle.title}</p>
              </Link>
            )}
            {rewrittenVersions.map((rewritten) => (
              <Link
                key={rewritten.id}
                to={`/articles/${rewritten.id}`}
                className="block p-3 bg-white rounded hover:shadow-md transition-shadow"
              >
                <span className="text-sm font-medium text-green-600">AI Rewritten Version</span>
                <p className="text-sm text-gray-600 mt-1">{rewritten.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Source URL */}
      {article.source_url && (
        <div className="mt-6 text-sm text-gray-500">
          <strong>Source:</strong>{' '}
          <a
            href={article.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {article.source_url}
          </a>
        </div>
      )}
    </div>
  );
}

