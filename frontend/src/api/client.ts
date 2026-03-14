import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(config => {
    const token = localStorage.getItem('ci_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

client.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('ci_token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export default client;
