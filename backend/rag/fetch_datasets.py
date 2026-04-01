import requests
import json
import os

DATA_DIR = "backend/data"
os.makedirs(DATA_DIR, exist_ok=True)

# 1. Bhagavad Gita (Krishna)
# This raw URL was verified by the subagent. Contains Sanskrit, Transliteration, Word Meanings.
GITA_URL = "https://raw.githubusercontent.com/gita/gita/master/data/verse.json"

# 2. Chanakya Niti (Chanakya)
# Chapters are stored individually.
CHANAKYA_BASE_URL = "https://raw.githubusercontent.com/siddharthvishwamitra/niti-book/main/data/ch{}.json"

# 3. Dhammapada (Buddha)
# A clean one from a reliable repo.
BUDDHA_URL = "https://raw.githubusercontent.com/xiaoyuanlv/dhammapada-api/master/dhammapada.json"

def fetch_gita():
    print("Fetching Bhagavad Gita...")
    response = requests.get(GITA_URL)
    if response.status_code == 200:
        with open(os.path.join(DATA_DIR, "gita_raw.json"), "w", encoding='utf-8') as f:
            json.dump(response.json(), f, indent=2, ensure_ascii=False)
        print("Gita saved.")
    else:
        print(f"Failed to fetch Gita: {response.status_code}")

def fetch_chanakya():
    print("Fetching Chanakya Niti (17 chapters)...")
    all_verses = []
    for i in range(1, 18):
        url = CHANAKYA_BASE_URL.format(i)
        response = requests.get(url)
        if response.status_code == 200:
            chapter_data = response.json()
            chapter_title = chapter_data.get('title', f"Chapter {i}")
            verses = chapter_data.get('verses', [])
            
            # Each verse is likely a string or a dict.
            for v in verses:
                if isinstance(v, str):
                    all_verses.append({
                        "text": v,
                        "chapter": i,
                        "chapter_title": chapter_title
                    })
                elif isinstance(v, dict):
                    v['chapter'] = i
                    v['chapter_title'] = chapter_title
                    all_verses.append(v)
            print(f"Chapter {i} fetched.")
        else:
            print(f"Failed to fetch Chanakya Chapter {i}: {response.status_code}")
    
    with open(os.path.join(DATA_DIR, "chanakya_raw.json"), "w", encoding='utf-8') as f:
        json.dump(all_verses, f, indent=2, ensure_ascii=False)
    print("Chanakya Niti saved.")

def fetch_buddha():
    print("Fetching Dhammapada...")
    response = requests.get(BUDDHA_URL)
    if response.status_code == 200:
        with open(os.path.join(DATA_DIR, "buddha_raw.json"), "w", encoding='utf-8') as f:
            json.dump(response.json(), f, indent=2, ensure_ascii=False)
        print("Dhammapada saved.")
    else:
        # Fallback if the URL changes
        print(f"Failed to fetch Dhammapada: {response.status_code}")

if __name__ == "__main__":
    fetch_gita()
    fetch_chanakya()
    fetch_buddha()
