import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { apiService } from '../api';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';
import './ChatInterface.css';

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            content: "Hello! I'm Contexter, your AI document assistant. Upload some documents and ask me questions about them!",
            isUser: false,
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: inputMessage.trim(),
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await apiService.sendMessage(userMessage.content);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: response.response,
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: `Sorry, I encountered an error: ${error.response?.data?.detail || error.message}`,
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <h2>Chat with Contexter</h2>
                <p>Ask questions about your uploaded documents</p>
            </div>

            <div className="chat-messages">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
                    >
                        <div className="message-avatar">
                            {message.isUser ? (
                                <User size={20} />
                            ) : (
                                <Bot size={20} />
                            )}
                        </div>
                        <div className="message-content">
                            <div className="message-text">
                                {message.isUser ? (
                                    <p>{message.content}</p>
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p>{children}</p>,
                                            code: ({ children }) => (
                                                <code className="inline-code">{children}</code>
                                            ),
                                            pre: ({ children }) => (
                                                <pre className="code-block">{children}</pre>
                                            ),
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                            <div className="message-time">
                                {formatTime(message.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message ai-message">
                        <div className="message-avatar">
                            <Bot size={20} />
                        </div>
                        <div className="message-content">
                            <div className="message-text">
                                <div className="typing-indicator">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Contexter is thinking...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <div className="input-container">
          <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your documents..."
              rows={1}
              disabled={isLoading}
              className="message-input"
          />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        className="send-button"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <div className="input-hint">
                    Press Enter to send, Shift+Enter for new line
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;