import requests
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# Gita Translations (Swami Sivananda is typically ID 6 in the gita/gita repo)
# The `translation.json` from gita/gita contains { id, description, authorName, lang, verseId }
# We need to fetch translation.json and map it to verses.
TRANSLATION_URL = "https://raw.githubusercontent.com/gita/gita/master/data/translation.json"
VERSE_URL = "https://raw.githubusercontent.com/gita/gita/master/data/verse.json"

def fetch_better_gita():
    print("Fetching Gita Verses...")
    verses_resp = requests.get(VERSE_URL)
    if verses_resp.status_code != 200:
        print("Failed to fetch verses")
        return
        
    print("Fetching Gita Translations...")
    trans_resp = requests.get(TRANSLATION_URL)
    if trans_resp.status_code != 200:
        print("Failed to fetch translations")
        return

    verses = verses_resp.json()
    translations = trans_resp.json()
    
    # We want an English translation, e.g., authorName: "Swami Sivananda" (or any English one)
    # Let's create a map of verseId -> english translation
    verse_translation_map = {}
    for t in translations:
        if t.get("lang") == "english":
            v_id = t.get("verseId")
            # Prefer Swami Sivananda or just grab the first english one we see
            if v_id not in verse_translation_map or "Sivananda" in t.get("authorName", ""):
                verse_translation_map[v_id] = t.get("description", "")
                
    # Merge
    merged_gita = []
    for v in verses:
        v_id = v.get("id")
        translation = verse_translation_map.get(v_id, v.get("word_meanings", ""))
        merged_gita.append({
            "chapter_number": v.get("chapter_number"),
            "verse_number": v.get("verse_number"),
            "sanskrit": v.get("text"),
            "transliteration": v.get("transliteration"),
            "translation_en": translation
        })
        
    with open(os.path.join(DATA_DIR, "gita_enhanced.json"), "w", encoding='utf-8') as f:
        json.dump(merged_gita, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(merged_gita)} verses with full English translations to gita_enhanced.json!")

if __name__ == "__main__":
    fetch_better_gita()
