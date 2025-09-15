export interface Document {
    name: string;
    size: number;
    modified: number;
}

export interface ChatMessage {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

export interface KnowledgeBaseStats {
    total_documents: number;
    total_chunks: number;
    total_vectors: number;
    sources: string[];
    error?: string;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface UploadResponse {
    message: string;
    files: string[];
}

export interface ChatResponse {
    response: string;
    query: string;
}