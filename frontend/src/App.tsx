import React, { useState, useEffect } from 'react';
import { Upload, MessageCircle, FileText, Brain, Settings, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { apiService } from './api';
import { Document, ChatMessage, KnowledgeBaseStats as StatsType } from './types';
import ChatInterface from './components/ChatInterface';
import DocumentManager from './components/DocumentManager';
import KnowledgeBaseStats from './components/KnowledgeBaseStats';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'stats'>('chat');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [stats, setStats] = useState<StatsType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load initial data
    useEffect(() => {
        loadDocuments();
        loadStats();
    }, []);

    const loadDocuments = async () => {
        try {
            const docs = await apiService.getDocuments();
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents:', error);
        }
    };

    const loadStats = async () => {
        try {
            const statsData = await apiService.getKnowledgeBaseStats();
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleFileUpload = async (files: File[]) => {
        setIsLoading(true);
        setError(null);

        try {
            await apiService.uploadDocuments(files);
            await loadDocuments();
            await loadStats();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Failed to upload documents');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (filename: string) => {
        try {
            await apiService.deleteDocument(filename);
            await loadDocuments();
            await loadStats();
        } catch (error: any) {
            setError(error.response?.data?.detail || 'Failed to delete document');
        }
    };

    const tabs = [
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'stats', label: 'Knowledge Base', icon: Brain },
    ] as const;

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-content">
                    <div className="logo">
                        <Brain className="logo-icon" />
                        <h1>AI Mentor Habib</h1>
                        <span className="subtitle">RAG AI Assistant</span>
                    </div>
                    <nav className="nav-tabs">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                className={`nav-tab ${activeTab === id ? 'active' : ''}`}
                                onClick={() => setActiveTab(id)}
                            >
                                <Icon size={20} />
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="app-main">
                {error && (
                    <div className="error-banner">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {activeTab === 'chat' && (
                    <ChatInterface />
                )}

                {activeTab === 'documents' && (
                    <DocumentManager
                        documents={documents}
                        onUpload={handleFileUpload}
                        onDelete={handleDeleteDocument}
                        isLoading={isLoading}
                    />
                )}

                {activeTab === 'stats' && (
                    <KnowledgeBaseStats stats={stats} />
                )}
            </main>

            <footer className="app-footer">
                <p>Powered by FastAPI, React, and OpenAI</p>
            </footer>
        </div>
    );
}

export default App;