import os
import logging
from pathlib import Path
from typing import List, Optional
import asyncio

# Document processing
import PyPDF2
import docx
from docx import Document

# Vector database and embeddings
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import pickle

# Text processing
import re
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentIngester:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the document ingester with embedding model"""
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = 384  # Dimension for all-MiniLM-L6-v2
        self.chunk_size = 1000
        self.chunk_overlap = 200

    def extract_text_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                logger.info(f"PDF has {len(pdf_reader.pages)} pages")
                
                for i, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        text += page_text + "\n"
                        logger.info(f"Extracted {len(page_text)} characters from page {i+1}")
                    else:
                        logger.warning(f"No text found on page {i+1}")
                
                logger.info(f"Total extracted text length: {len(text)}")
                return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            return ""

    def extract_text_from_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX {file_path}: {e}")
            return ""

    def extract_text_from_txt(self, file_path: Path) -> str:
        """Extract text from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            logger.error(f"Error extracting text from TXT {file_path}: {e}")
            return ""

    def extract_text(self, file_path: Path) -> str:
        """Extract text from various document formats"""
        file_extension = file_path.suffix.lower()

        if file_extension == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_extension in ['.docx', '.doc']:
            return self.extract_text_from_docx(file_path)
        elif file_extension == '.txt':
            return self.extract_text_from_txt(file_path)
        else:
            logger.warning(f"Unsupported file format: {file_extension}")
            return ""

    def clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)]', '', text)
        return text.strip()

    def chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size

            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                sentence_end = text.rfind('.', start, end)
                if sentence_end > start + self.chunk_size - 100:
                    end = sentence_end + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - self.chunk_overlap

            if start >= len(text):
                break

        return chunks

    def create_embeddings(self, texts: List[str]) -> np.ndarray:
        """Create embeddings for text chunks"""
        try:
            embeddings = self.model.encode(texts, show_progress_bar=True)
            return embeddings.astype('float32')
        except Exception as e:
            logger.error(f"Error creating embeddings: {e}")
            return np.array([])

    def save_index(self, index: faiss.Index, metadata: List[Dict], index_path: Path):
        """Save FAISS index and metadata"""
        try:
            # Save FAISS index
            faiss.write_index(index, str(index_path / "faiss_index.bin"))

            # Save metadata
            with open(index_path / "metadata.pkl", "wb") as f:
                pickle.dump(metadata, f)

            logger.info(f"Index saved to {index_path}")
        except Exception as e:
            logger.error(f"Error saving index: {e}")

    def load_index(self, index_path: Path) -> tuple[Optional[faiss.Index], List[Dict]]:
        """Load existing FAISS index and metadata"""
        try:
            index_file = index_path / "faiss_index.bin"
            metadata_file = index_path / "metadata.pkl"

            if not index_file.exists() or not metadata_file.exists():
                return None, []

            # Load FAISS index
            index = faiss.read_index(str(index_file))

            # Load metadata
            with open(metadata_file, "rb") as f:
                metadata = pickle.load(f)

            logger.info(f"Index loaded from {index_path}")
            return index, metadata

        except Exception as e:
            logger.error(f"Error loading index: {e}")
            return None, []

    async def process_documents(self, sources_dir: Path, index_dir: Path):
        """Process all documents in sources directory and create/update vector index"""
        try:
            logger.info("Starting document processing...")

            # Get all supported files
            supported_extensions = ['.pdf', '.docx', '.doc', '.txt']
            files = []
            for ext in supported_extensions:
                files.extend(sources_dir.glob(f"*{ext}"))

            if not files:
                logger.warning("No supported documents found in sources directory")
                return

            logger.info(f"Found {len(files)} documents to process")

            # Load existing index if available
            existing_index, existing_metadata = self.load_index(index_dir)

            all_chunks = []
            all_metadata = []

            # Process each document
            for file_path in files:
                logger.info(f"Processing {file_path.name}...")

                # Extract text
                text = self.extract_text(file_path)
                logger.info(f"Extracted {len(text)} characters from {file_path.name}")
                if not text:
                    logger.warning(f"No text extracted from {file_path.name} - skipping")
                    continue

                # Clean text
                text = self.clean_text(text)

                # Chunk text
                chunks = self.chunk_text(text)
                logger.info(f"Created {len(chunks)} chunks from {file_path.name}")

                # Create metadata for each chunk
                for i, chunk in enumerate(chunks):
                    all_chunks.append(chunk)
                    all_metadata.append({
                        'source': file_path.name,
                        'chunk_id': i,
                        'total_chunks': len(chunks),
                        'text_length': len(chunk)
                    })

            if not all_chunks:
                logger.warning("No text chunks created from documents")
                return

            logger.info(f"Created {len(all_chunks)} text chunks")

            # Create embeddings
            logger.info("Creating embeddings...")
            embeddings = self.create_embeddings(all_chunks)

            if embeddings.size == 0:
                logger.error("Failed to create embeddings")
                return

            # Create or update FAISS index
            if existing_index is not None:
                # Add new embeddings to existing index
                existing_index.add(embeddings)
                all_metadata = existing_metadata + all_metadata
                index = existing_index
            else:
                # Create new index
                index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product for cosine similarity
                index.add(embeddings)

            # Save index and metadata
            self.save_index(index, all_metadata, index_dir)

            logger.info(f"Successfully processed {len(files)} documents and created index with {index.ntotal} vectors")

        except Exception as e:
            logger.error(f"Error processing documents: {e}")
            raise