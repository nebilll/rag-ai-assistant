from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path
from typing import List, Optional
import uvicorn

from rag import RAGProcessor
from ingest import DocumentIngester

app = FastAPI(title="Contexter API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
rag_processor = RAGProcessor()
document_ingester = DocumentIngester()

# Ensure data directories exist
DATA_DIR = Path("data")
SOURCES_DIR = DATA_DIR / "sources"
INDEX_DIR = DATA_DIR / "index"

SOURCES_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Contexter API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API is operational"}

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload and process documents for the knowledge base"""
    try:
        uploaded_files = []

        for file in files:
            # Validate file type
            if not file.filename.lower().endswith(('.pdf', '.doc', '.docx', '.txt')):
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")

            # Save file to sources directory
            file_path = SOURCES_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            uploaded_files.append(file.filename)

        # Process documents and update vector database
        await document_ingester.process_documents(SOURCES_DIR, INDEX_DIR)

        return JSONResponse(
            status_code=200,
            content={
                "message": f"Successfully uploaded and processed {len(uploaded_files)} files",
                "files": uploaded_files
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(message: dict):
    """Chat with the AI assistant using RAG"""
    try:
        user_message = message.get("message", "")
        if not user_message:
            raise HTTPException(status_code=400, detail="Message is required")

        # Process the query using RAG
        response = await rag_processor.process_query(
            query=user_message,
            index_path=INDEX_DIR
        )

        return JSONResponse(
            status_code=200,
            content={
                "response": response,
                "query": user_message
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """List all uploaded documents"""
    try:
        documents = []
        for file_path in SOURCES_DIR.glob("*"):
            if file_path.is_file():
                documents.append({
                    "name": file_path.name,
                    "size": file_path.stat().st_size,
                    "modified": file_path.stat().st_mtime
                })

        return JSONResponse(
            status_code=200,
            content={"documents": documents}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Delete a specific document"""
    try:
        file_path = SOURCES_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")

        file_path.unlink()

        # Reprocess documents to update vector database
        await document_ingester.process_documents(SOURCES_DIR, INDEX_DIR)

        return JSONResponse(
            status_code=200,
            content={"message": f"Document {filename} deleted successfully"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)