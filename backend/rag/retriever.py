# backend/rag/retriever.py
import logging
from dataclasses import dataclass
from typing import List, Optional

from rag.chroma_client import get_persona_collection

logger = logging.getLogger(__name__)

@dataclass
class VerseResult:
    reference: str
    sanskrit_key: str
    translation_en: str

async def retrieve_verses(
    query: str,
    persona: str,
    themes: Optional[List[str]] = None,
    top_k: int = 3
) -> List[VerseResult]:
    try:
        collection = get_persona_collection(persona)
        
        # Build query texts combining the query and themes
        query_texts = [query]
        if themes:
            query_texts.extend(themes)
            
        # We query the vector store
        results = collection.query(
            query_texts=[" ".join(query_texts)],
            n_results=top_k
        )
        
        verses = []
        if results.get('documents') and len(results['documents']) > 0:
            for i in range(len(results['documents'][0])):
                doc = results['documents'][0][i]
                meta = results['metadatas'][0][i] if results.get('metadatas') else {}
                
                verses.append(VerseResult(
                    reference=meta.get('reference', 'Unknown Text'),
                    sanskrit_key=meta.get('sanskrit_key', 'Unknown Sanskrit'),
                    translation_en=doc
                ))
        return verses
        
    except Exception as e:
        logger.warning(f"ChromaDB retrieval error: {e}")
        return []
