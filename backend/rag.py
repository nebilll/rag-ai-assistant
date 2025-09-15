import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import asyncio

# Vector database and embeddings
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import pickle

# LLM integration
import openai
from openai import AsyncOpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGProcessor:
    def __init__(self,
                 embedding_model: str = "all-MiniLM-L6-v2",
                 openai_api_key: Optional[str] = None,
                 openai_model: str = "gpt-3.5-turbo"):
        """Initialize RAG processor with embedding model and LLM"""
        self.embedding_model = SentenceTransformer(embedding_model)
        self.embedding_dim = 384  # Dimension for all-MiniLM-L6-v2

        # Initialize OpenAI client
        api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OpenAI API key not found. Using mock responses.")
            self.openai_client = None
        else:
            self.openai_client = AsyncOpenAI(api_key=api_key)

        self.openai_model = openai_model
        self.max_context_length = 4000  # Maximum context length for the model
        self.top_k = 5  # Number of relevant chunks to retrieve

    def load_index(self, index_path: Path) -> tuple[Optional[faiss.Index], List[Dict]]:
        """Load FAISS index and metadata"""
        try:
            index_file = index_path / "faiss_index.bin"
            metadata_file = index_path / "metadata.pkl"

            if not index_file.exists() or not metadata_file.exists():
                logger.warning("No index found. Please upload and process documents first.")
                return None, []

            # Load FAISS index
            index = faiss.read_index(str(index_file))

            # Load metadata
            with open(metadata_file, "rb") as f:
                metadata = pickle.load(f)

            logger.info(f"Loaded index with {index.ntotal} vectors")
            return index, metadata

        except Exception as e:
            logger.error(f"Error loading index: {e}")
            return None, []

    def create_query_embedding(self, query: str) -> np.ndarray:
        """Create embedding for the query"""
        try:
            embedding = self.embedding_model.encode([query])
            return embedding.astype('float32')
        except Exception as e:
            logger.error(f"Error creating query embedding: {e}")
            return np.array([])

    def retrieve_relevant_chunks(self,
                                 query: str,
                                 index: faiss.Index,
                                 metadata: List[Dict],
                                 chunks: List[str]) -> List[Dict]:
        """Retrieve most relevant chunks for the query"""
        try:
            # Create query embedding
            query_embedding = self.create_query_embedding(query)
            if query_embedding.size == 0:
                return []

            # Search for similar vectors
            scores, indices = index.search(query_embedding, min(self.top_k, index.ntotal))

            relevant_chunks = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(chunks) and idx < len(metadata):
                    relevant_chunks.append({
                        'text': chunks[idx],
                        'metadata': metadata[idx],
                        'score': float(score)
                    })

            # Sort by score (higher is better for cosine similarity)
            relevant_chunks.sort(key=lambda x: x['score'], reverse=True)

            return relevant_chunks

        except Exception as e:
            logger.error(f"Error retrieving relevant chunks: {e}")
            return []

    def load_chunks(self, index_path: Path) -> List[str]:
        """Load text chunks from the processed documents"""
        try:
            chunks_file = index_path / "chunks.pkl"
            if not chunks_file.exists():
                logger.warning("No chunks file found")
                return []

            with open(chunks_file, "rb") as f:
                chunks = pickle.load(f)

            return chunks

        except Exception as e:
            logger.error(f"Error loading chunks: {e}")
            return []

    async def generate_response(self, query: str, context_chunks: List[Dict]) -> str:
        """Generate response using LLM with retrieved context"""
        try:
            if not self.openai_client:
                # Mock response when OpenAI is not available
                return self._generate_mock_response(query, context_chunks)

            # Prepare context from retrieved chunks
            context = "\n\n".join([chunk['text'] for chunk in context_chunks])

            # Create prompt
            system_prompt = """You are an AI assistant that helps users by answering questions based on the provided context. 
            Use only the information from the context to answer questions. If the context doesn't contain enough information 
            to answer the question, say so clearly. Be helpful, accurate, and concise in your responses."""

            user_prompt = f"""Context:
{context}

Question: {query}

Please provide a helpful answer based on the context above."""

            # Generate response using OpenAI
            response = await self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"I apologize, but I encountered an error while generating a response: {str(e)}"

    def _generate_mock_response(self, query: str, context_chunks: List[Dict]) -> str:
        """Generate a mock response when OpenAI is not available"""
        if not context_chunks:
            return "I don't have enough information in my knowledge base to answer your question. Please upload some documents first."

        # Simple mock response based on context
        context_summary = " ".join([chunk['text'][:200] for chunk in context_chunks[:2]])

        return f"""Based on the documents in my knowledge base, here's what I found related to your question: "{query}"

{context_summary[:300]}...

Note: This is a mock response. To get more accurate answers, please configure your OpenAI API key in the environment variables."""

    async def process_query(self, query: str, index_path: Path) -> str:
        """Main method to process a query using RAG"""
        try:
            logger.info(f"Processing query: {query}")

            # Load index and metadata
            index, metadata = self.load_index(index_path)
            if index is None:
                return "No knowledge base found. Please upload and process some documents first."

            # Load chunks
            chunks = self.load_chunks(index_path)
            if not chunks:
                return "No text chunks found. Please re-process your documents."

            # Retrieve relevant chunks
            relevant_chunks = self.retrieve_relevant_chunks(query, index, metadata, chunks)

            if not relevant_chunks:
                return "I couldn't find relevant information in my knowledge base to answer your question."

            # Generate response
            response = await self.generate_response(query, relevant_chunks)

            logger.info("Query processed successfully")
            return response

        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return f"I apologize, but I encountered an error while processing your question: {str(e)}"

    def get_knowledge_base_stats(self, index_path: Path) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        try:
            index, metadata = self.load_index(index_path)
            chunks = self.load_chunks(index_path)

            if index is None:
                return {
                    "total_documents": 0,
                    "total_chunks": 0,
                    "total_vectors": 0,
                    "sources": []
                }

            # Count unique sources
            sources = list(set([m.get('source', 'Unknown') for m in metadata]))

            return {
                "total_documents": len(sources),
                "total_chunks": len(chunks),
                "total_vectors": index.ntotal,
                "sources": sources
            }

        except Exception as e:
            logger.error(f"Error getting knowledge base stats: {e}")
            return {
                "total_documents": 0,
                "total_chunks": 0,
                "total_vectors": 0,
                "sources": [],
                "error": str(e)
            }