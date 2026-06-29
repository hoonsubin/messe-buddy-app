from typing import List, Optional
from config import settings, EmbeddingConfig
import httpx
import logging

class EmbeddingService:
    """Service for generating embeddings via LiteLLM proxy REST API.

    Uses direct HTTP calls to the LiteLLM proxy instead of the litellm
    Python library.  This avoids provider-routing issues with older
    litellm versions (the submodule pins litellm==1.74.3).
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or settings.embedding

    async def _embed(self, texts: List[str]) -> List[List[float]]:
        """Call LiteLLM proxy /v1/embeddings and return embedding vectors."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{self.config.base_url}/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "input": texts,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            embeddings = [item["embedding"] for item in body["data"]]
            return embeddings

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text using LiteLLM proxy

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        try:
            embeddings = await self._embed([text])
            embedding = embeddings[0]

            # Validate embedding dimensions
            if len(embedding) != self.config.dimensions:
                raise ValueError(
                    f"Expected embedding dimension {self.config.dimensions}, "
                    f"got {len(embedding)}"
                )

            return embedding

        except Exception as e:
            raise RuntimeError(f"Failed to generate embedding: {str(e)}")

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        try:
            embeddings = await self._embed(texts)

            # Validate embedding dimensions
            for i, embedding in enumerate(embeddings):
                if len(embedding) != self.config.dimensions:
                    raise ValueError(
                        f"Expected embedding dimension {self.config.dimensions} for text {i}, "
                        f"got {len(embedding)}"
                    )

            return embeddings

        except Exception as e:
            raise RuntimeError(f"Failed to generate embeddings: {str(e)}")

    def update_config(self, new_config: EmbeddingConfig):
        """Update the embedding configuration"""
        self.config = new_config


# Global embedding service instance
embedding_service = EmbeddingService()
