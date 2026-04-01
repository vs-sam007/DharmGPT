import json
import re
import os

class WisdomParser:
    def parse(self, filepath):
        raise NotImplementedError

class GitaParser(WisdomParser):
    def parse(self, filepath):
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        verses = []
        for item in data:
            # Format: Chapter.Verse
            ref = f"Gita {item.get('chapter_number')}.{item.get('verse_number')}"
            sanskrit = item.get('sanskrit', '')
            translit = item.get('transliteration', '')
            english = item.get('translation_en', '')
            
            verses.append({
                "reference": ref,
                "sanskrit_key": sanskrit,
                "translation_en": english
            })
        return verses

class ChanakyaParser(WisdomParser):
    def parse(self, filepath):
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        verses = []
        for i, item in enumerate(data):
            # Chanakya Niti structure: {"text", "chapter", "chapter_title"}
            chapter = item.get('chapter', '?')
            content = item.get('text', '')
            
            verses.append({
                "reference": f"Chanakya Niti {chapter}.{i+1}",
                "sanskrit_key": "",
                "translation_en": content
            })
        return verses

class MahabharataParser(WisdomParser):
    """Parses dialogues from TXT files for specific speakers."""
    def __init__(self, target_speakers=None):
        self.target_speakers = [s.lower() for s in target_speakers] if target_speakers else []

    def parse(self, filepath):
        if not os.path.exists(filepath):
            return []
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        paragraphs = re.split(r'\n\s*\n', content)
        results = []
        
        for para in paragraphs:
            para = para.replace('\n', ' ').strip()
            if not para: continue
            
            # More flexible regex for speaker said/spake/addressed ... 'quote'
            # [\x22\x27\u2018\u2019\u201C\u201D] handles both regular and smart quotes
            match = re.search(r'([A-Z][a-z]+).*?(?:said|spake|addressed|answer(?:ed)?).*?[\x22\x27\u2018\u2019\u201C\u201D](.*?)[\x22\x27\u2018\u2019\u201C\u201D]', para)
            if match:
                speaker = match.group(1)
                quote = match.group(2)
                
                if not self.target_speakers or speaker.lower() in self.target_speakers:
                    results.append({
                        "reference": f"Mahabharata Dialogue ({speaker})",
                        "sanskrit_key": "",
                        "translation_en": quote
                    })
        return results

class DhammapadaParser(WisdomParser):
    def parse(self, filepath):
        if not os.path.exists(filepath):
            return []
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                return []
        
        verses = []
        if isinstance(data, list):
            for i, item in enumerate(data):
                text = item.get('text', '') if isinstance(item, dict) else str(item)
                verses.append({
                    "reference": f"Dhammapada {i+1}",
                    "sanskrit_key": "",
                    "translation_en": text
                })
        return verses
