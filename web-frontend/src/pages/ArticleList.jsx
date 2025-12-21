import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { articleService } from '../services/api';

const VersionBadge = ({ version }) => {
  const base =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border';

  if (version === 'original') {
    return (
      <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
        Original
      </span>
    );
  }

  return (
    <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
      AI Rewritten
    </span>
  );
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border border-gray-200 p-6">
    <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
    <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-4/6" />
    </div>
  </div>
);

export default function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 12,
    last_page: 1,
  });

  useEffect(() => {
    fetchArticles();
  }, [pagination.current_page, filter]);

  const fetchArticles = async () => {
    try {
      setLoading(true);

      const response = await articleService.getAll({
        page: pagination.current_page,
        per_page: pagination.per_page,
        version: filter !== 'all' ? filter : undefined,
      });

      setArticles(response.data.data);
      setPagination(response.data.meta);
    } finally {
      setLoading(false);
    }
  };

  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }),
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Knowledge Articles
        </h1>

        <div className="flex gap-2">
          {['all', 'original', 'rewritten'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setPagination((p) => ({ ...p, current_page: 1 }));
                setFilter(type);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === type
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No articles found.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (

              <div
                style={{
                  background: "linear-gradient(135deg, #f8fafc 60%, #d1d5db 100%)",
                  padding: "16px",
                  borderRadius: "18px",
                  margin: "14px 8px",
                  border: "1.5px solid #cbd5e1",
                  boxShadow: "0 4px 18px 0 rgba(41, 43, 80, 0.08)",
                  transition: "transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.16s",
                  cursor: "pointer"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.035)";
                  e.currentTarget.style.boxShadow = "0 8px 32px 0 rgba(41,43,80,0.13)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 18px 0 rgba(41,43,80,0.08)";
                }}
              >
                <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className="group block rounded-xl border border-gray-200 bg-white hover:shadow-lg transition"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <VersionBadge version={article.version} />
                    {article.published_at && (
                      <span className="text-xs text-gray-500">
                        {formatter.format(new Date(article.published_at))}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition mb-3 line-clamp-2">
                    {article.title}
                  </h2>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-6">
                    {article.content.slice(0, 160)}…
                  </p>

                  <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                    {article.references?.length > 0 && (
                      <span>{article.references.length} references</span>
                    )}

                    {article.version === 'rewritten' && (
                      <span className="text-emerald-600 font-medium">
                        Enhanced
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10">
              <button
                disabled={pagination.current_page === 1}
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    current_page: p.current_page - 1,
                  }))
                }
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.current_page} of {pagination.last_page}
              </span>

              <button
                disabled={pagination.current_page === pagination.last_page}
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    current_page: p.current_page + 1,
                  }))
                }
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
