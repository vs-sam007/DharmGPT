import os
import chromadb

def get_chroma_client():
    db_path = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
    return chromadb.PersistentClient(path=db_path)

def get_persona_collection(persona_name: str):
    client = get_chroma_client()
    return client.get_or_create_collection(persona_name)
