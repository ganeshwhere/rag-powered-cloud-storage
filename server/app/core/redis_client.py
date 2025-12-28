"""
Redis client for caching and session management.
"""
import json
import logging
import hashlib
from typing import Any, Optional, Dict, List
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client for caching search results and other data."""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self._connected = False
    
    async def connect(self) -> None:
        """Connect to Redis server."""
        try:
            self.redis = Redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # Test connection
            await self.redis.ping()
            self._connected = True
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self._connected = False
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Redis server."""
        if self.redis:
            await self.redis.close()
            self._connected = False
            logger.info("Disconnected from Redis")
    
    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate a cache key from prefix and parameters.
        
        Args:
            prefix: Cache key prefix
            **kwargs: Parameters to include in key
            
        Returns:
            Generated cache key
        """
        # Create a deterministic key from parameters
        key_data = json.dumps(kwargs, sort_keys=True)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()[:12]
        return f"{prefix}:{key_hash}"
    
    async def cache_search_results(
        self, 
        user_id: str, 
        query: str, 
        results: Dict[str, Any],
        document_ids: Optional[List[str]] = None,
        top_k: int = 10,
        min_score: float = 0.0
    ) -> bool:
        """
        Cache search results.
        
        Args:
            user_id: User ID
            query: Search query
            results: Search results to cache
            document_ids: Optional document ID filter
            top_k: Number of results
            min_score: Minimum score threshold
            
        Returns:
            True if cached successfully
        """
        if not self._connected or not self.redis:
            logger.warning("Redis not connected, skipping cache")
            return False
        
        try:
            cache_key = self._generate_cache_key(
                "search",
                user_id=user_id,
                query=query.lower().strip(),
                document_ids=document_ids,
                top_k=top_k,
                min_score=min_score
            )
            
            # Serialize results
            cache_data = {
                "results": results,
                "cached_at": int(time.time()),
                "query": query,
                "user_id": user_id
            }
            
            await self.redis.setex(
                cache_key,
                settings.search_cache_ttl_seconds,
                json.dumps(cache_data, default=str)
            )
            
            logger.debug(f"Cached search results for key: {cache_key}")
            return True
            
        except RedisError as e:
            logger.error(f"Error caching search results: {str(e)}")
            return False
    
    async def get_cached_search_results(
        self, 
        user_id: str, 
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 10,
        min_score: float = 0.0
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached search results.
        
        Args:
            user_id: User ID
            query: Search query
            document_ids: Optional document ID filter
            top_k: Number of results
            min_score: Minimum score threshold
            
        Returns:
            Cached results or None if not found
        """
        if not self._connected or not self.redis:
            return None
        
        try:
            cache_key = self._generate_cache_key(
                "search",
                user_id=user_id,
                query=query.lower().strip(),
                document_ids=document_ids,
                top_k=top_k,
                min_score=min_score
            )
            
            cached_data = await self.redis.get(cache_key)
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Retrieved cached search results for key: {cache_key}")
                return data["results"]
            
            return None
            
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error retrieving cached search results: {str(e)}")
            return None
    
    async def cache_user_data(
        self, 
        user_id: str, 
        data_type: str, 
        data: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache user-specific data.
        
        Args:
            user_id: User ID
            data_type: Type of data being cached
            data: Data to cache
            ttl: Time to live in seconds (defaults to cache_ttl_seconds)
            
        Returns:
            True if cached successfully
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            cache_key = f"user:{user_id}:{data_type}"
            ttl = ttl or settings.cache_ttl_seconds
            
            await self.redis.setex(
                cache_key,
                ttl,
                json.dumps(data, default=str)
            )
            
            logger.debug(f"Cached user data: {cache_key}")
            return True
            
        except RedisError as e:
            logger.error(f"Error caching user data: {str(e)}")
            return False
    
    async def get_cached_user_data(
        self, 
        user_id: str, 
        data_type: str
    ) -> Optional[Any]:
        """
        Get cached user-specific data.
        
        Args:
            user_id: User ID
            data_type: Type of data to retrieve
            
        Returns:
            Cached data or None if not found
        """
        if not self._connected or not self.redis:
            return None
        
        try:
            cache_key = f"user:{user_id}:{data_type}"
            cached_data = await self.redis.get(cache_key)
            
            if cached_data:
                logger.debug(f"Retrieved cached user data: {cache_key}")
                return json.loads(cached_data)
            
            return None
            
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error retrieving cached user data: {str(e)}")
            return None
    
    async def invalidate_user_cache(self, user_id: str, pattern: str = "*") -> int:
        """
        Invalidate cached data for a user.
        
        Args:
            user_id: User ID
            pattern: Pattern to match for deletion (default: all user data)
            
        Returns:
            Number of keys deleted
        """
        if not self._connected or not self.redis:
            return 0
        
        try:
            search_pattern = f"user:{user_id}:{pattern}"
            keys = await self.redis.keys(search_pattern)
            
            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info(f"Invalidated {deleted} cache keys for user {user_id}")
                return deleted
            
            return 0
            
        except RedisError as e:
            logger.error(f"Error invalidating user cache: {str(e)}")
            return 0
    
    async def set_with_expiry(self, key: str, value: Any, ttl: int) -> bool:
        """
        Set a key with expiry time.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            
        Returns:
            True if set successfully
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
            return True
        except RedisError as e:
            logger.error(f"Error setting key {key}: {str(e)}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value by key.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self._connected or not self.redis:
            return None
        
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error getting key {key}: {str(e)}")
            return None
    
    async def delete(self, key: str) -> bool:
        """
        Delete a key.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if deleted successfully
        """
        if not self._connected or not self.redis:
            return False
        
        try:
            result = await self.redis.delete(key)
            return result > 0
        except RedisError as e:
            logger.error(f"Error deleting key {key}: {str(e)}")
            return False
    
    async def health_check(self) -> bool:
        """
        Check Redis connection health.
        
        Returns:
            True if Redis is healthy
        """
        try:
            if not self.redis:
                return False
            await self.redis.ping()
            return True
        except Exception:
            return False


# Global Redis client instance
redis_client = RedisClient()


# Import time for caching timestamps
import time