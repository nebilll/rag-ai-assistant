import axios from 'axios';
import { Document, KnowledgeBaseStats, UploadResponse, ChatResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for logging
api.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export const apiService = {
    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const response = await api.get('/health');
            return response.status === 200;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    },

    // Document management
    async uploadDocuments(files: File[]): Promise<UploadResponse> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    async getDocuments(): Promise<Document[]> {
        const response = await api.get('/documents');
        return response.data.documents;
    },

    async deleteDocument(filename: string): Promise<void> {
        await api.delete(`/documents/${filename}`);
    },

    // Chat functionality
    async sendMessage(message: string): Promise<ChatResponse> {
        const response = await api.post('/chat', { message });
        return response.data;
    },

    // Knowledge base stats
    async getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
        try {
            const response = await api.get('/stats');
            return response.data;
        } catch (error) {
            // If stats endpoint doesn't exist, return empty stats
            return {
                total_documents: 0,
                total_chunks: 0,
                total_vectors: 0,
                sources: [],
                error: 'Stats endpoint not available'
            };
        }
    }
};

export default api;