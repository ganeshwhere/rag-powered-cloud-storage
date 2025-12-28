"""
AWS S3 client for file storage operations.
Provides upload, download, delete, and presigned URL functionality.
"""
import logging
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Client:
    """AWS S3 client for document storage operations."""
    
    def __init__(self):
        """Initialize S3 client with configuration."""
        try:
            # Configure boto3 with retry settings
            config = Config(
                region_name=settings.aws_region,
                retries={
                    'max_attempts': 3,
                    'mode': 'adaptive'
                }
            )
            
            # Initialize S3 client
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                    config=config
                )
            else:
                # Use default credential chain (IAM roles, environment, etc.)
                self.s3_client = boto3.client('s3', config=config)
                
            self.bucket_name = settings.s3_bucket_name
            logger.info(f"S3 client initialized for bucket: {self.bucket_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise
    
    def generate_s3_key(self, user_id: str, document_id: str, filename: str) -> str:
        """
        Generate S3 key with organized structure.
        
        Args:
            user_id: User identifier
            document_id: Document identifier
            filename: Original filename
            
        Returns:
            S3 key path
        """
        # Sanitize filename to remove problematic characters
        safe_filename = filename.replace(" ", "_").replace("/", "_")
        return f"users/{user_id}/documents/{document_id}/{safe_filename}"
    
    async def upload_file(
        self, 
        file_obj: BinaryIO, 
        s3_key: str, 
        content_type: Optional[str] = None
    ) -> bool:
        """
        Upload file to S3.
        
        Args:
            file_obj: File object to upload
            s3_key: S3 key for the file
            content_type: MIME type of the file
            
        Returns:
            True if upload successful, False otherwise
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # Add metadata
            extra_args['Metadata'] = {
                'uploaded_at': datetime.utcnow().isoformat(),
                'service': 'rag-document-system'
            }
            
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during S3 upload: {e}")
            return False
    
    async def download_file(self, s3_key: str) -> Optional[bytes]:
        """
        Download file from S3.
        
        Args:
            s3_key: S3 key of the file to download
            
        Returns:
            File content as bytes, or None if failed
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            content = response['Body'].read()
            logger.info(f"Successfully downloaded file from S3: {s3_key}")
            return content
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"File not found in S3: {s3_key}")
            else:
                logger.error(f"Failed to download file from S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during S3 download: {e}")
            return None
    
    async def delete_file(self, s3_key: str) -> bool:
        """
        Delete file from S3.
        
        Args:
            s3_key: S3 key of the file to delete
            
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during S3 deletion: {e}")
            return False
    
    async def generate_presigned_upload_url(
        self, 
        s3_key: str, 
        content_type: Optional[str] = None,
        expires_in: int = 3600
    ) -> Optional[dict]:
        """
        Generate presigned URL for file upload.
        
        Args:
            s3_key: S3 key for the file
            content_type: MIME type of the file
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Dictionary with presigned URL and fields, or None if failed
        """
        try:
            conditions = []
            fields = {}
            
            if content_type:
                conditions.append({"Content-Type": content_type})
                fields['Content-Type'] = content_type
            
            # Add file size limit (100MB as per requirements)
            max_size = settings.max_file_size_mb * 1024 * 1024
            conditions.append(["content-length-range", 1, max_size])
            
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields=fields,
                Conditions=conditions,
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned upload URL for: {s3_key}")
            return response
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned upload URL: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned upload URL: {e}")
            return None
    
    async def generate_presigned_download_url(
        self, 
        s3_key: str, 
        expires_in: int = 3600
    ) -> Optional[str]:
        """
        Generate presigned URL for file download.
        
        Args:
            s3_key: S3 key of the file
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned download URL, or None if failed
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned download URL for: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned download URL: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned download URL: {e}")
            return None
    
    async def file_exists(self, s3_key: str) -> bool:
        """
        Check if file exists in S3.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error(f"Error checking file existence: {e}")
                return False
        except Exception as e:
            logger.error(f"Unexpected error checking file existence: {e}")
            return False
    
    async def get_file_metadata(self, s3_key: str) -> Optional[dict]:
        """
        Get file metadata from S3.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            File metadata dictionary, or None if failed
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            metadata = {
                'size': response.get('ContentLength'),
                'content_type': response.get('ContentType'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag'),
                'metadata': response.get('Metadata', {})
            }
            
            return metadata
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.warning(f"File not found in S3: {s3_key}")
            else:
                logger.error(f"Failed to get file metadata: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting file metadata: {e}")
            return None


# Global S3 client instance
s3_client = S3Client()