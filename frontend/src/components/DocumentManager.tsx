import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Document } from '../types';
import './DocumentManager.css';

interface DocumentManagerProps {
    documents: Document[];
    onUpload: (files: File[]) => void;
    onDelete: (filename: string) => void;
    isLoading: boolean;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
                                                             documents,
                                                             onUpload,
                                                             onDelete,
                                                             isLoading
                                                         }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        onUpload(acceptedFiles);
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        },
        multiple: true,
        disabled: isLoading
    });

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFileIcon = (filename: string) => {
        const extension = filename.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return '��';
            case 'doc':
            case 'docx':
                return '📝';
            case 'txt':
                return '📃';
            default:
                return '📄';
        }
    };

    return (
        <div className="document-manager">
            <div className="document-header">
                <h2>Document Management</h2>
                <p>Upload PDF, DOC, DOCX, or TXT files to build your knowledge base</p>
            </div>

            <div className="upload-section">
                <div
                    {...getRootProps()}
                    className={`upload-dropzone ${isDragActive ? 'drag-active' : ''} ${isLoading ? 'disabled' : ''}`}
                >
                    <input {...getInputProps()} />
                    <div className="upload-content">
                        {isLoading ? (
                            <>
                                <Loader2 size={48} className="animate-spin" />
                                <h3>Processing documents...</h3>
                                <p>Please wait while we process your files</p>
                            </>
                        ) : (
                            <>
                                <Upload size={48} />
                                <h3>
                                    {isDragActive ? 'Drop files here' : 'Upload Documents'}
                                </h3>
                                <p>
                                    Drag and drop files here, or click to select files
                                </p>
                                <div className="supported-formats">
                                    <span>Supported: PDF, DOC, DOCX, TXT</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="documents-section">
                <div className="documents-header">
                    <h3>Uploaded Documents ({documents.length})</h3>
                    {documents.length > 0 && (
                        <div className="documents-stats">
                            <CheckCircle size={16} />
                            <span>Ready for AI queries</span>
                        </div>
                    )}
                </div>

                {documents.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={64} />
                        <h4>No documents uploaded yet</h4>
                        <p>Upload some documents to start building your knowledge base</p>
                    </div>
                ) : (
                    <div className="documents-list">
                        {documents.map((doc) => (
                            <div key={doc.name} className="document-item">
                                <div className="document-info">
                                    <div className="document-icon">
                                        {getFileIcon(doc.name)}
                                    </div>
                                    <div className="document-details">
                                        <h4 className="document-name">{doc.name}</h4>
                                        <div className="document-meta">
                                            <span className="file-size">{formatFileSize(doc.size)}</span>
                                            <span className="separator">•</span>
                                            <span className="upload-date">{formatDate(doc.modified)}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDelete(doc.name)}
                                    className="delete-button"
                                    title="Delete document"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {documents.length > 0 && (
                <div className="knowledge-base-tip">
                    <AlertCircle size={20} />
                    <div>
                        <h4>Knowledge Base Ready!</h4>
                        <p>
                            Your documents have been processed and indexed.
                            Go to the Chat tab to start asking questions about your documents.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentManager;