"""
Unit tests for Redis client functionality.
"""
import pytest
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.redis_client import RedisClient


class TestRedisClient:
    """Test cases for RedisClient."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis connection."""
        mock_redis = AsyncMock()
        mock_redis.ping.return_value = True
        mock_redis.setex.return_value = True
        mock_redis.get.return_value = None
        mock_redis.delete.return_value = 1
        mock_redis.keys.return_value = []
        mock_redis.close.return_value = None
        return mock_redis
    
    @pytest.fixture
    def redis_client(self, mock_redis):
        """Create RedisClient with mocked Redis connection."""
        client = RedisClient()
        client.redis = mock_redis
        client._connected = True
        return client
    
    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test successful Redis connection."""
        with patch('app.core.redis_client.Redis') as mock_redis_class:
            mock_redis = AsyncMock()
            mock_redis.ping.return_value = True
            mock_redis_class.from_url.return_value = mock_redis
            
            client = RedisClient()
            await client.connect()
            
            assert client._connected is True
            assert client.redis is mock_redis
            mock_redis.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_connect_failure(self):
        """Test Redis connection failure."""
        with patch('app.core.redis_client.Redis') as mock_redis_class:
            mock_redis = AsyncMock()
            mock_redis.ping.side_effect = Exception("Connection failed")
            mock_redis_class.from_url.return_value = mock_redis
            
            client = RedisClient()
            
            with pytest.raises(Exception, match="Connection failed"):
                await client.connect()
            
            assert client._connected is False
    
    @pytest.mark.asyncio
    async def test_disconnect(self, redis_client, mock_redis):
        """Test Redis disconnection."""
        await redis_client.disconnect()
        
        mock_redis.close.assert_called_once()
        assert redis_client._connected is False
    
    def test_generate_cache_key(self, redis_client):
        """Test cache key generation."""
        key = redis_client._generate_cache_key(
            "search",
            user_id="user123",
            query="test query",
            top_k=10
        )
        
        assert key.startswith("search:")
        assert len(key.split(":")) == 2
        
        # Same parameters should generate same key
        key2 = redis_client._generate_cache_key(
            "search",
            user_id="user123",
            query="test query",
            top_k=10
        )
        assert key == key2
        
        # Different parameters should generate different key
        key3 = redis_client._generate_cache_key(
            "search",
            user_id="user123",
            query="different query",
            top_k=10
        )
        assert key != key3
    
    @pytest.mark.asyncio
    async def test_cache_search_results_success(self, redis_client, mock_redis):
        """Test successful search result caching."""
        results = {
            "query": "test query",
            "answer": "test answer",
            "chunks": [],
            "total_results": 0
        }
        
        success = await redis_client.cache_search_results(
            user_id="user123",
            query="test query",
            results=results,
            top_k=10
        )
        
        assert success is True
        mock_redis.setex.assert_called_once()
        
        # Verify the cached data structure
        call_args = mock_redis.setex.call_args
        cache_key = call_args[0][0]
        ttl = call_args[0][1]
        cached_data = json.loads(call_args[0][2])
        
        assert cache_key.startswith("search:")
        assert ttl > 0
        assert cached_data["results"] == results
        assert cached_data["query"] == "test query"
        assert cached_data["user_id"] == "user123"
        assert "cached_at" in cached_data
    
    @pytest.mark.asyncio
    async def test_cache_search_results_not_connected(self):
        """Test caching when Redis is not connected."""
        client = RedisClient()
        client._connected = False
        
        success = await client.cache_search_results(
            user_id="user123",
            query="test query",
            results={}
        )
        
        assert success is False
    
    @pytest.mark.asyncio
    async def test_cache_search_results_redis_error(self, redis_client, mock_redis):
        """Test caching with Redis error."""
        mock_redis.setex.side_effect = Exception("Redis error")
        
        success = await redis_client.cache_search_results(
            user_id="user123",
            query="test query",
            results={}
        )
        
        assert success is False
    
    @pytest.mark.asyncio
    async def test_get_cached_search_results_success(self, redis_client, mock_redis):
        """Test successful retrieval of cached search results."""
        cached_data = {
            "results": {"answer": "cached answer"},
            "cached_at": int(time.time()),
            "query": "test query",
            "user_id": "user123"
        }
        mock_redis.get.return_value = json.dumps(cached_data)
        
        results = await redis_client.get_cached_search_results(
            user_id="user123",
            query="test query",
            top_k=10
        )
        
        assert results == {"answer": "cached answer"}
        mock_redis.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_cached_search_results_not_found(self, redis_client, mock_redis):
        """Test retrieval when no cached results exist."""
        mock_redis.get.return_value = None
        
        results = await redis_client.get_cached_search_results(
            user_id="user123",
            query="test query"
        )
        
        assert results is None
    
    @pytest.mark.asyncio
    async def test_get_cached_search_results_not_connected(self):
        """Test retrieval when Redis is not connected."""
        client = RedisClient()
        client._connected = False
        
        results = await client.get_cached_search_results(
            user_id="user123",
            query="test query"
        )
        
        assert results is None
    
    @pytest.mark.asyncio
    async def test_cache_user_data_success(self, redis_client, mock_redis):
        """Test successful user data caching."""
        data = {"key": "value", "number": 123}
        
        success = await redis_client.cache_user_data(
            user_id="user123",
            data_type="profile",
            data=data,
            ttl=3600
        )
        
        assert success is True
        mock_redis.setex.assert_called_once()
        
        call_args = mock_redis.setex.call_args
        cache_key = call_args[0][0]
        ttl = call_args[0][1]
        cached_data = json.loads(call_args[0][2])
        
        assert cache_key == "user:user123:profile"
        assert ttl == 3600
        assert cached_data == data
    
    @pytest.mark.asyncio
    async def test_get_cached_user_data_success(self, redis_client, mock_redis):
        """Test successful user data retrieval."""
        data = {"key": "value", "number": 123}
        mock_redis.get.return_value = json.dumps(data)
        
        result = await redis_client.get_cached_user_data(
            user_id="user123",
            data_type="profile"
        )
        
        assert result == data
        mock_redis.get.assert_called_once_with("user:user123:profile")
    
    @pytest.mark.asyncio
    async def test_invalidate_user_cache_success(self, redis_client, mock_redis):
        """Test successful user cache invalidation."""
        mock_redis.keys.return_value = ["user:user123:search1", "user:user123:search2"]
        mock_redis.delete.return_value = 2
        
        deleted_count = await redis_client.invalidate_user_cache(
            user_id="user123",
            pattern="search*"
        )
        
        assert deleted_count == 2
        mock_redis.keys.assert_called_once_with("user:user123:search*")
        mock_redis.delete.assert_called_once_with("user:user123:search1", "user:user123:search2")
    
    @pytest.mark.asyncio
    async def test_invalidate_user_cache_no_keys(self, redis_client, mock_redis):
        """Test cache invalidation when no keys exist."""
        mock_redis.keys.return_value = []
        
        deleted_count = await redis_client.invalidate_user_cache(
            user_id="user123",
            pattern="search*"
        )
        
        assert deleted_count == 0
        mock_redis.delete.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_set_with_expiry_success(self, redis_client, mock_redis):
        """Test setting key with expiry."""
        data = {"test": "data"}
        
        success = await redis_client.set_with_expiry(
            key="test_key",
            value=data,
            ttl=1800
        )
        
        assert success is True
        mock_redis.setex.assert_called_once_with("test_key", 1800, json.dumps(data, default=str))
    
    @pytest.mark.asyncio
    async def test_get_success(self, redis_client, mock_redis):
        """Test getting a value by key."""
        data = {"test": "data"}
        mock_redis.get.return_value = json.dumps(data)
        
        result = await redis_client.get("test_key")
        
        assert result == data
        mock_redis.get.assert_called_once_with("test_key")
    
    @pytest.mark.asyncio
    async def test_delete_success(self, redis_client, mock_redis):
        """Test deleting a key."""
        mock_redis.delete.return_value = 1
        
        success = await redis_client.delete("test_key")
        
        assert success is True
        mock_redis.delete.assert_called_once_with("test_key")
    
    @pytest.mark.asyncio
    async def test_delete_key_not_found(self, redis_client, mock_redis):
        """Test deleting a non-existent key."""
        mock_redis.delete.return_value = 0
        
        success = await redis_client.delete("nonexistent_key")
        
        assert success is False
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, redis_client, mock_redis):
        """Test Redis health check success."""
        mock_redis.ping.return_value = True
        
        is_healthy = await redis_client.health_check()
        
        assert is_healthy is True
        mock_redis.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, redis_client, mock_redis):
        """Test Redis health check failure."""
        mock_redis.ping.side_effect = Exception("Connection lost")
        
        is_healthy = await redis_client.health_check()
        
        assert is_healthy is False
    
    @pytest.mark.asyncio
    async def test_health_check_no_redis(self):
        """Test health check when Redis is not initialized."""
        client = RedisClient()
        client.redis = None
        
        is_healthy = await client.health_check()
        
        assert is_healthy is False