import os
from typing import Any, List

import httpx
from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.core.bridge.pydantic import PrivateAttr
from llama_index.core.callbacks import CallbackManager


class LightweightGeminiEmbedding(BaseEmbedding):
    """Lightweight Gemini Embedding class using httpx directly."""

    _api_key: str = PrivateAttr()
    _model_name: str = PrivateAttr()
    _api_base: str = PrivateAttr()
    _output_dimensionality: int | None = PrivateAttr()

    def __init__(
        self,
        model_name: str = "models/gemini-embedding-001",
        api_key: str | None = None,
        output_dimensionality: int | None = None,
        callback_manager: CallbackManager | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            model_name=model_name,
            callback_manager=callback_manager,
            **kwargs,
        )
        self._api_key = api_key or os.getenv("GOOGLE_API_KEY", "")
        self._model_name = model_name
        self._output_dimensionality = output_dimensionality
        self._api_base = "https://generativelanguage.googleapis.com/v1beta"

    def _get_query_embedding(self, query: str) -> List[float]:
        return self._embed_text(query, "RETRIEVAL_QUERY")

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return await self._aembed_text(query, "RETRIEVAL_QUERY")

    def _get_text_embedding(self, text: str) -> List[float]:
        return self._embed_text(text, "RETRIEVAL_DOCUMENT")

    async def _aget_text_embedding(self, text: str) -> List[float]:
        return await self._aembed_text(text, "RETRIEVAL_DOCUMENT")

    def _embed_text(self, text: str, task_type: str | None = None) -> List[float]:
        url = f"{self._api_base}/{self._model_name}:embedContent?key={self._api_key}"

        json_data = {
            "content": {"parts": [{"text": text}]},
            "model": self._model_name,
        }
        if task_type:
            json_data["taskType"] = task_type
            
        if self._output_dimensionality:
            json_data["outputDimensionality"] = self._output_dimensionality

        with httpx.Client() as client:
            resp = client.post(url, json=json_data, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]["values"]

    async def _aembed_text(
        self, text: str, task_type: str | None = None
    ) -> List[float]:
        url = f"{self._api_base}/{self._model_name}:embedContent?key={self._api_key}"

        json_data = {
            "content": {"parts": [{"text": text}]},
            "model": self._model_name,
        }
        if task_type:
            json_data["taskType"] = task_type
            
        if self._output_dimensionality:
            json_data["outputDimensionality"] = self._output_dimensionality

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=json_data, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            return data["embedding"]["values"]
