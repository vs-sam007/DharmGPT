import os
import chromadb
from dotenv import load_dotenv

# We need the Chroma path, typically 'chroma_db' inside backend folder
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

def get_chroma_client():
    return chromadb.PersistentClient(path=DB_PATH)

def ingest_verses_for_persona(persona_id: str, verses: list[dict]):
    """
    Ingests a list of verses into a persona-specific ChromaDB collection.
    verses should be a list of dicts with:
      - 'reference': The chapter/verse reference (e.g., 'BG 2.47')
      - 'sanskrit_key': The original Sanskrit or Pali verse text
      - 'translation_en': The English translation (this is what is embedded)
    """
    client = get_chroma_client()
    
    collection_name = f"dharma_{persona_id}_collection"
    # Create or get the isolated collection
    collection = client.get_or_create_collection(name=collection_name)
    
    ids = []
    documents = []
    metadatas = []
    
    for i, verse in enumerate(verses):
        # We index based on the english translation to match user English queries
        doc_id = f"{persona_id}_verse_{i}"
        translation = verse.get("translation_en", "")
        
        meta = {
            "reference": verse.get("reference", ""),
            "sanskrit_key": verse.get("sanskrit_key", "")
        }
        
        if translation:
            ids.append(doc_id)
            documents.append(translation)
            metadatas.append(meta)
            
    if documents:
        # Upsert allows us to update if the ID exists, or insert if active
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Successfully ingested {len(documents)} verses for '{persona_id}'.")
    else:
        print("No valid verses to ingest.")

if __name__ == "__main__":
    # Example usage for testing the ingestion template
    sample_krishna_verses = [
        {
            "reference": "Bhagavad Gita 2.47",
            "sanskrit_key": "karmany evadhikaras te ma phaleshu kadachana",
            "translation_en": "You have a right to perform your prescribed duty, but you are not entitled to the fruits of action."
        },
        {
            "reference": "Bhagavad Gita 2.48",
            "sanskrit_key": "yogasthah kuru karmani sangam tyaktva dhananjaya",
            "translation_en": "Perform your duty equipoised, O Arjuna, abandoning all attachment to success or failure. Such equanimity is called yoga."
        }
    ]
    
    ingest_verses_for_persona("krishna", sample_krishna_verses)
    
    sample_chanakya_verses = [
        {
            "reference": "Chanakya Niti 1.1",
            "sanskrit_key": "prithivyam trini ratnani jalam annam subhashitam",
            "translation_en": "There are three gems on earth: water, food, and wise words."
        }
    ]
    ingest_verses_for_persona("chanakya", sample_chanakya_verses)
