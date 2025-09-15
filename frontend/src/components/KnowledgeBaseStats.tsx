import React from 'react';
import { Database, FileText, Layers, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { KnowledgeBaseStats as StatsType } from '../types';
import './KnowledgeBaseStats.css';

interface KnowledgeBaseStatsProps {
    stats: StatsType | null;
}

const KnowledgeBaseStats: React.FC<KnowledgeBaseStatsProps> = ({ stats }) => {
    if (!stats) {
        return (
            <div className="knowledge-base-stats">
                <div className="stats-header">
                    <h2>Knowledge Base Statistics</h2>
                    <p>Loading knowledge base information...</p>
                </div>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Fetching statistics...</p>
                </div>
            </div>
        );
    }

    if (stats.error) {
        return (
            <div className="knowledge-base-stats">
                <div className="stats-header">
                    <h2>Knowledge Base Statistics</h2>
                    <p>Unable to load knowledge base information</p>
                </div>
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h3>Error Loading Stats</h3>
                    <p>{stats.error}</p>
                </div>
            </div>
        );
    }

    const statsCards = [
        {
            title: 'Total Documents',
            value: stats.total_documents,
            icon: FileText,
            color: '#3b82f6',
            description: 'Documents in knowledge base'
        },
        {
            title: 'Text Chunks',
            value: stats.total_chunks,
            icon: Layers,
            color: '#10b981',
            description: 'Processed text segments'
        },
        {
            title: 'Vector Embeddings',
            value: stats.total_vectors,
            icon: Database,
            color: '#8b5cf6',
            description: 'AI searchable vectors'
        }
    ];

    const getHealthStatus = () => {
        if (stats.total_documents === 0) {
            return { status: 'empty', message: 'No documents uploaded', color: '#f59e0b' };
        } else if (stats.total_chunks === 0) {
            return { status: 'processing', message: 'Documents being processed', color: '#3b82f6' };
        } else {
            return { status: 'ready', message: 'Knowledge base ready', color: '#10b981' };
        }
    };

    const healthStatus = getHealthStatus();

    return (
        <div className="knowledge-base-stats">
            <div className="stats-header">
                <h2>Knowledge Base Statistics</h2>
                <p>Overview of your AI knowledge base</p>
            </div>

            <div className="health-status">
                <div className="health-indicator" style={{ backgroundColor: healthStatus.color }}>
                    <div className="health-dot"></div>
                </div>
                <div className="health-info">
                    <h3>Status: {healthStatus.message}</h3>
                    <p>
                        {healthStatus.status === 'empty' && 'Upload documents to start building your knowledge base'}
                        {healthStatus.status === 'processing' && 'Your documents are being processed and indexed'}
                        {healthStatus.status === 'ready' && 'Your knowledge base is ready for AI queries'}
                    </p>
                </div>
            </div>

            <div className="stats-grid">
                {statsCards.map((card, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: card.color }}>
                            <card.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>{card.value.toLocaleString()}</h3>
                            <h4>{card.title}</h4>
                            <p>{card.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {stats.sources.length > 0 && (
                <div className="sources-section">
                    <div className="sources-header">
                        <BookOpen size={20} />
                        <h3>Document Sources</h3>
                    </div>
                    <div className="sources-list">
                        {stats.sources.map((source, index) => (
                            <div key={index} className="source-item">
                                <FileText size={16} />
                                <span>{source}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="performance-tips">
                <TrendingUp size={20} />
                <div>
                    <h4>Performance Tips</h4>
                    <ul>
                        <li>Upload documents in PDF, DOC, or TXT format for best results</li>
                        <li>Larger documents are automatically split into manageable chunks</li>
                        <li>More documents provide better context for AI responses</li>
                        <li>Regular updates keep your knowledge base current</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBaseStats;