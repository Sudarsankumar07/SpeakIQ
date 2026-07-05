import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('speakiq_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to capture Rate Limit Quotas
export interface ModelQuotas {
  g35Limit: number;
  g35Remaining: number;
  g25Limit: number;
  g25Remaining: number;
}

let lastQuotas: ModelQuotas = {
  g35Limit: 3,
  g35Remaining: 3,
  g25Limit: 10,
  g25Remaining: 10,
};

export const getCachedQuotas = (): ModelQuotas => {
  return lastQuotas;
};

api.interceptors.response.use(
  (response) => {
    const g35Limit = response.headers['x-ratelimit-limit-gemini35'];
    const g35Remaining = response.headers['x-ratelimit-remaining-gemini35'];
    const g25Limit = response.headers['x-ratelimit-limit-gemini25'];
    const g25Remaining = response.headers['x-ratelimit-remaining-gemini25'];

    if (g35Limit && g35Remaining && g25Limit && g25Remaining) {
      lastQuotas = {
        g35Limit: parseInt(g35Limit, 10),
        g35Remaining: Math.max(0, parseInt(g35Remaining, 10)),
        g25Limit: parseInt(g25Limit, 10),
        g25Remaining: Math.max(0, parseInt(g25Remaining, 10)),
      };
    }
    return response;
  },
  (error) => {
    // If the response is a 429, it will also carry rate limit headers in error.response
    if (error.response && error.response.headers) {
      const headers = error.response.headers;
      const g35Limit = headers['x-ratelimit-limit-gemini35'];
      const g35Remaining = headers['x-ratelimit-remaining-gemini35'];
      const g25Limit = headers['x-ratelimit-limit-gemini25'];
      const g25Remaining = headers['x-ratelimit-remaining-gemini25'];

      if (g35Limit && g35Remaining && g25Limit && g25Remaining) {
        lastQuotas = {
          g35Limit: parseInt(g35Limit, 10),
          g35Remaining: Math.max(0, parseInt(g35Remaining, 10)),
          g25Limit: parseInt(g25Limit, 10),
          g25Remaining: Math.max(0, parseInt(g25Remaining, 10)),
        };
      }
    }
    return Promise.reject(error);
  }
);

export default api;
