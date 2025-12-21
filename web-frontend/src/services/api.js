/**
 * API Service
 * 
 * Handles all API calls to the Article Service
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const articleService = {
  /**
   * Get all articles
   * @param {Object} params - Query parameters (page, per_page, version)
   * @returns {Promise}
   */
  getAll: (params = {}) => {
    return api.get('/api/articles', { params });
  },

  /**
   * Get article by ID
   * @param {number} id - Article ID
   * @returns {Promise}
   */
  getById: (id) => {
    return api.get(`/api/articles/${id}`);
  },

  /**
   * Get latest article
   * @returns {Promise}
   */
  getLatest: () => {
    return api.get('/api/articles/latest');
  },
};

export default api;

