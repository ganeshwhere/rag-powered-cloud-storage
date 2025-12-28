"""
Document processing pipeline for text extraction, chunking, and embedding generation.
"""
import logging
import tempfile
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import tiktoken
import asyncio
from concurrent.futures import ThreadPoolExecutor

from langchain_text_splitters import RecursiveCharacterTextSplitter
from unstructured.partition.auto import partition
try:
    from unstructured.partition.pdf import partition_pdf
except ImportError:
    partition_pdf = None
try:
    from unstructured.partition.docx import partition_docx
except ImportError:
    partition_docx = None
try:
    from unstructured.partition.text import partition_text
except ImportError:
    partition_text = None
try:
    from unstructured.partition.csv import partition_csv
except ImportError:
    partition_csv = None
try:
    from unstructured.partition.xlsx import partition_xlsx
except ImportError:
    partition_xlsx = None
import openai

from app.core.config import settings
from app.core.s3 import S3Client
from app.core.vector_store import PineconeClient

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Document processor for extracting text, chunking, and preparing content for embedding.
    """
    
    def __init__(self):
        self.s3_client = S3Client()
        self.vector_store = PineconeClient()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        # Initialize tokenizer for token counting
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        except Exception:
            # Fallback to a basic tokenizer if model-specific one fails
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Initialize OpenAI client
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key is required for embedding generation")
        
        self.openai_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        self._executor = ThreadPoolExecutor(max_workers=4)
    
    async def process_document(
        self, 
        s3_key: str, 
        s3_bucket: str, 
        file_type: str,
        original_name: str
    ) -> Dict[str, Any]:
        """
        Process a document: download, extract text, and create chunks.
        
        Args:
            s3_key: S3 object key
            s3_bucket: S3 bucket name
            file_type: File extension (pdf, docx, txt, etc.)
            original_name: Original filename
            
        Returns:
            Dict containing extracted text chunks and metadata
        """
        try:
            logger.info(f"Starting document processing for {original_name} (type: {file_type})")
            
            # Download file from S3 to temporary location
            with tempfile.NamedTemporaryFile(suffix=f".{file_type}", delete=False) as temp_file:
                temp_path = temp_file.name
                
            try:
                # Download file content from S3
                file_content = await self.s3_client.download_file(s3_key)
                if file_content is None:
                    raise ValueError(f"Failed to download file from S3: {s3_key}")
                
                # Write content to temporary file
                with open(temp_path, 'wb') as temp_file:
                    temp_file.write(file_content)
                logger.info(f"Downloaded file to temporary location: {temp_path}")
                
                # Extract text based on file type
                extracted_text = await self._extract_text(temp_path, file_type)
                logger.info(f"Extracted {len(extracted_text)} characters of text")
                
                if not extracted_text.strip():
                    raise ValueError("No text content could be extracted from the document")
                
                # Create text chunks
                chunks = await self._create_chunks(extracted_text)
                logger.info(f"Created {len(chunks)} text chunks")
                
                # Calculate total tokens
                total_tokens = sum(self._count_tokens(chunk) for chunk in chunks)
                logger.info(f"Total tokens across all chunks: {total_tokens}")
                
                return {
                    "chunks": chunks,
                    "chunk_count": len(chunks),
                    "total_tokens": total_tokens,
                    "original_text_length": len(extracted_text)
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    logger.debug(f"Cleaned up temporary file: {temp_path}")
                    
        except Exception as e:
            logger.error(f"Error processing document {original_name}: {str(e)}")
            raise
    
    async def process_and_store_embeddings(
        self,
        s3_key: str,
        s3_bucket: str,
        file_type: str,
        original_name: str,
        document_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Complete document processing pipeline: extract text, create chunks, generate embeddings, and store in vector database.
        
        Args:
            s3_key: S3 object key
            s3_bucket: S3 bucket name
            file_type: File extension
            original_name: Original filename
            document_id: Document UUID
            user_id: User UUID
            
        Returns:
            Dict containing processing results and metadata
        """
        try:
            # Process document to get chunks
            processing_result = await self.process_document(s3_key, s3_bucket, file_type, original_name)
            chunks = processing_result["chunks"]
            
            # Generate embeddings for all chunks
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            embeddings = await self._generate_embeddings(chunks)
            
            # Store embeddings in vector database
            chunk_indices = list(range(len(chunks)))
            vector_ids = await self.vector_store.upsert_embeddings(
                embeddings=embeddings,
                chunks=chunks,
                document_id=document_id,
                user_id=user_id,
                chunk_indices=chunk_indices
            )
            
            logger.info(f"Successfully stored {len(vector_ids)} embeddings for document {document_id}")
            
            return {
                "chunks": chunks,
                "chunk_count": len(chunks),
                "total_tokens": processing_result["total_tokens"],
                "original_text_length": processing_result["original_text_length"],
                "vector_ids": vector_ids,
                "embeddings_count": len(embeddings)
            }
            
        except Exception as e:
            logger.error(f"Error in complete processing pipeline for {original_name}: {str(e)}")
            raise
    
    async def _extract_text(self, file_path: str, file_type: str) -> str:
        """
        Extract text from a file based on its type.
        
        Args:
            file_path: Path to the file
            file_type: File extension
            
        Returns:
            Extracted text content
        """
        try:
            file_type = file_type.lower()
            
            if file_type == "pdf" and partition_pdf:
                elements = partition_pdf(filename=file_path)
            elif file_type == "docx" and partition_docx:
                elements = partition_docx(filename=file_path)
            elif file_type in ["txt", "md"] and partition_text:
                elements = partition_text(filename=file_path)
            elif file_type == "csv" and partition_csv:
                elements = partition_csv(filename=file_path)
            elif file_type == "xlsx" and partition_xlsx:
                elements = partition_xlsx(filename=file_path)
            else:
                # Fallback to auto-detection
                logger.warning(f"Using auto-detection for file type {file_type}")
                elements = partition(filename=file_path)
            
            # Combine all text elements
            text_content = []
            for element in elements:
                if hasattr(element, 'text') and element.text:
                    text_content.append(element.text.strip())
            
            return "\n\n".join(text_content)
            
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise ValueError(f"Failed to extract text from file: {str(e)}")
    
    async def _create_chunks(self, text: str) -> List[str]:
        """
        Split text into chunks using LangChain's RecursiveCharacterTextSplitter.
        
        Args:
            text: Input text to chunk
            
        Returns:
            List of text chunks
        """
        try:
            chunks = self.text_splitter.split_text(text)
            
            # Filter out very small chunks (less than 50 characters)
            filtered_chunks = [chunk.strip() for chunk in chunks if len(chunk.strip()) >= 50]
            
            if not filtered_chunks:
                # If all chunks are too small, return the original text as a single chunk
                logger.warning("All chunks were too small, returning original text as single chunk")
                return [text.strip()]
            
            return filtered_chunks
            
        except Exception as e:
            logger.error(f"Error creating text chunks: {str(e)}")
            raise ValueError(f"Failed to create text chunks: {str(e)}")
    
    def _count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Number of tokens
        """
        try:
            return len(self.tokenizer.encode(text))
        except Exception as e:
            logger.warning(f"Error counting tokens, using character-based estimate: {str(e)}")
            # Fallback to rough character-based estimate (1 token ≈ 4 characters)
            return len(text) // 4
    
    async def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using OpenAI API.
        
        Args:
            texts: List of text chunks to embed
            
        Returns:
            List of embedding vectors
        """
        try:
            # Process in batches to avoid API limits
            batch_size = 100
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                logger.debug(f"Generating embeddings for batch {i//batch_size + 1} ({len(batch)} texts)")
                
                response = await self.openai_client.embeddings.create(
                    model=settings.embedding_model,
                    input=batch
                )
                
                batch_embeddings = [embedding.embedding for embedding in response.data]
                all_embeddings.extend(batch_embeddings)
                
                # Small delay to respect rate limits
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
            
            logger.info(f"Generated {len(all_embeddings)} embeddings")
            return all_embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise ValueError(f"Failed to generate embeddings: {str(e)}")
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        try:
            response = await self.openai_client.embeddings.create(
                model=settings.embedding_model,
                input=[query]
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {str(e)}")
            raise ValueError(f"Failed to generate query embedding: {str(e)}")
    
    async def delete_document_from_vector_store(self, document_id: str) -> bool:
        """
        Delete all embeddings for a document from the vector store.
        
        Args:
            document_id: Document UUID
            
        Returns:
            True if successful
        """
        try:
            return await self.vector_store.delete_document_embeddings(document_id)
        except Exception as e:
            logger.error(f"Error deleting document from vector store: {str(e)}")
            return False
    
    def get_supported_file_types(self) -> List[str]:
        """
        Get list of supported file types.
        
        Returns:
            List of supported file extensions
        """
        return settings.supported_file_types.copy()
    
    def validate_file_type(self, file_type: str) -> bool:
        """
        Validate if a file type is supported.
        
        Args:
            file_type: File extension to validate
            
        Returns:
            True if supported, False otherwise
        """
        return file_type.lower() in [ft.lower() for ft in settings.supported_file_types]
    
    def __del__(self):
        """Clean up thread pool executor."""
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)