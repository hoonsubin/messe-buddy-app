from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime


class VectorStoreCreateRequest(BaseModel):
    name: str
    file_ids: Optional[List[str]] = None
    expires_after: Optional[Dict[str, Any]] = None
    chunking_strategy: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class VectorStoreResponse(BaseModel):
    id: str
    object: str = "vector_store"
    created_at: int
    name: str
    usage_bytes: int
    file_counts: Dict[str, int]
    status: str
    expires_after: Optional[Dict[str, Any]] = None
    expires_at: Optional[int] = None
    last_active_at: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class VectorStoreSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 20
    filters: Optional[Dict[str, Any]] = None
    return_metadata: Optional[bool] = True


class ContentChunk(BaseModel):
    type: str = "text"
    text: str


class SearchResult(BaseModel):
    file_id: str
    filename: str
    score: float
    attributes: Optional[Dict[str, Any]] = None
    content: List[ContentChunk]


class VectorStoreSearchResponse(BaseModel):
    object: str = "vector_store.search_results.page"
    search_query: str
    data: List[SearchResult]
    has_more: bool = False
    next_page: Optional[str] = None


class EmbeddingCreateRequest(BaseModel):
    content: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None


class EmbeddingResponse(BaseModel):
    id: str
    object: str = "embedding"
    vector_store_id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: int


class EmbeddingBatchCreateRequest(BaseModel):
    embeddings: List[EmbeddingCreateRequest]


class EmbeddingBatchCreateResponse(BaseModel):
    object: str = "embedding.batch"
    data: List[EmbeddingResponse]
    created: int


class VectorStoreListResponse(BaseModel):
    object: str = "list"
    data: List[VectorStoreResponse]
    first_id: Optional[str] = None
    last_id: Optional[str] = None
    has_more: bool = False