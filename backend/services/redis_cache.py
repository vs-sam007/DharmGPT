import redis
import os
import json

# Try to connect, if fail, fallback gracefully
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

_r = None
_REDIS_AVAILABLE = None
_fallback_cache = {}

def _get_redis():
    global _r, _REDIS_AVAILABLE
    if _REDIS_AVAILABLE is not None:
        return _r if _REDIS_AVAILABLE else None
        
    try:
        _r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, socket_connect_timeout=1)
        _r.ping()
        _REDIS_AVAILABLE = True
        return _r
    except Exception:
        print("Warning: Redis is not available locally. Falling back to in-memory cache.")
        _REDIS_AVAILABLE = False
        return None

def get_cached_response(session_id: str, query: str, persona: str):
    key = f"{session_id}:{persona}:{query}"
    r = _get_redis()
    if r:
        try:
            val = r.get(key)
            if val:
                return json.loads(val.decode("utf-8"))
        except Exception:
            pass
    else:
        return _fallback_cache.get(key)
    return None

def set_cached_response(session_id: str, query: str, persona: str, response: dict, expiration_seconds: int = 3600):
    key = f"{session_id}:{persona}:{query}"
    r = _get_redis()
    if r:
        try:
            r.setex(key, expiration_seconds, json.dumps(response))
        except Exception:
            pass
    else:
        _fallback_cache[key] = response
