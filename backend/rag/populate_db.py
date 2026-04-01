import os
import sys
import json

# Ensure backend folder is in path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from rag.parsers import GitaParser, ChanakyaParser, MahabharataParser, DhammapadaParser
from rag.ingest import ingest_verses_for_persona, get_chroma_client

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def clear_collections(client):
    print("Clearing existing collections...")
    collections = client.list_collections()
    for col in collections:
        if col.name.startswith("dharma_"):
            print(f"Deleting {col.name}")
            client.delete_collection(col.name)

def populate():
    client = get_chroma_client()
    clear_collections(client)

    print("Processing Krishna knowledge base...")
    all_krishna_verses = []
    
    # 1. Enhanced Bhagavad Gita
    gita_parser = GitaParser()
    gita_path = os.path.join(DATA_DIR, "gita_enhanced.json")
    if os.path.exists(gita_path):
        gita_verses = gita_parser.parse(gita_path)
        all_krishna_verses.extend(gita_verses)
        print(f"Loaded {len(gita_verses)} verses from Bhagavad Gita.")
    else:
        print(f"Warning: {gita_path} missing.")

    # 2. Mahabharata Quotes (Udyoga Parva peace mission, etc.)
    # Aliases for Krishna in Mahabharata texts:
    mb_parser = MahabharataParser(target_speakers=['Krishna', 'Vasudeva', 'Kesava', 'Govinda', 'Madhava', 'Madhusudana', 'Janardana', 'Hrishikesha'])
    mb_path = os.path.join(DATA_DIR, "udyoga_full.txt")
    if os.path.exists(mb_path):
        mb_verses = mb_parser.parse(mb_path)
        all_krishna_verses.extend(mb_verses)
        print(f"Loaded {len(mb_verses)} verses from Mahabharata dialogue.")
    else:
        print(f"Warning: {mb_path} missing.")
        
    # 3. New PDF Extraction Output
    ext_path = os.path.join(DATA_DIR, "mahabharata_extract.json")
    if os.path.exists(ext_path):
        try:
            with open(ext_path, 'r', encoding='utf-8') as f:
                ext_data = json.load(f)
                all_krishna_verses.extend(ext_data)
                print(f"Loaded {len(ext_data)} dense paragraphs from the gigantic Complete Mahabharata PDF!")
        except Exception as e:
            print(f"Failed to load specific PDF extraction: {e}")
            
    if all_krishna_verses:
        print(f"Ingesting {len(all_krishna_verses)} total records for krishna...")
        ingest_verses_for_persona("krishna", all_krishna_verses)
    else:
        print(f"No verses found for krishna.")

    print("\nProcessing Chanakya knowledge base...")
    chanakya_parser = ChanakyaParser()
    chanakya_path = os.path.join(DATA_DIR, "chanakya_raw.json")
    if os.path.exists(chanakya_path):
        chanakya_verses = chanakya_parser.parse(chanakya_path)
        if chanakya_verses:
            print(f"Ingesting {len(chanakya_verses)} records for chanakya...")
            ingest_verses_for_persona("chanakya", chanakya_verses)
        else:
            print("No verses found for chanakya.")
    else:
        print(f"Warning: {chanakya_path} missing.")

    print("\nProcessing Laxmibai knowledge base...")
    laxmibai_path = os.path.join(DATA_DIR, "laxmibai_raw.json")
    if os.path.exists(laxmibai_path):
        laxmibai_verses = chanakya_parser.parse(laxmibai_path) # Uses identical format
        if laxmibai_verses:
            print(f"Ingesting {len(laxmibai_verses)} records for laxmibai...")
            ingest_verses_for_persona("laxmibai", laxmibai_verses)
        else:
            print("No verses found for laxmibai.")
    else:
        print(f"Warning: {laxmibai_path} missing.")

if __name__ == "__main__":
    populate()
