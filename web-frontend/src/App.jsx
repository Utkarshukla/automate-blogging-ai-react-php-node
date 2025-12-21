import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import ArticleList from './pages/ArticleList';
import ArticleDetail from './pages/ArticleDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-md border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/articles" className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    BeyondChats Articles
                  </h1>
                  <p className="text-xs text-gray-500">Original & AI-Rewritten Content</p>
                </div>
              </Link>
              <nav className="flex items-center space-x-4">
                <Link
                  to="/articles"
                  className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Browse Articles
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/articles" replace />} />
            <Route path="/articles" element={<ArticleList />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-sm text-gray-500">
              © 2025 BeyondChats Articles. Original content and AI-enhanced rewrites.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
