import os
import json
import re

try:
    import PyPDF2
except ImportError:
    print("PyPDF2 is not installed.")
    exit(1)

PDF_PATH = r"c:\Users\hp\Documents\GitHub\Dharmagpt (2)\Dharmagpt\The Complete Mahabharata .pdf"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mahabharata_extract.json")

def extract_krishna_quotes():
    if not os.path.exists(PDF_PATH):
        print(f"Error: Could not find {PDF_PATH}")
        return

    print("Opening Mahabharata PDF...")
    try:
        with open(PDF_PATH, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            total_pages = len(reader.pages)
            print(f"Total Pages to scan: {total_pages}")
            
            # Since scanning 5000 pages takes a while, we will scan sequentially
            # and look for paragraphs starting with or containing "Vasudeva said" / "Krishna said" / "Kesava said"
            extracted_quotes = []
            
            # regex to match dialogue cues
            pattern = re.compile(r'(Vasudeva|Krishna|Kesava|Govinda|Madhava|Janardana|Hrishikesha)\s+(said|spake|addressed|answered)', re.IGNORECASE)
            
            text_buffer = ""
            for i in range(total_pages):
                if i % 500 == 0:
                    print(f"Scanning page {i} / {total_pages}...")
                    
                page = reader.pages[i]
                text = page.extract_text()
                if not text:
                    continue
                    
                paragraphs = re.split(r'\n\s*\n', text)
                for para in paragraphs:
                    para = para.replace('\n', ' ').strip()
                    if pattern.search(para) and len(para) > 50:
                        extracted_quotes.append({
                            "reference": "Mahabharata PDF Dialogue",
                            "sanskrit_key": "",
                            "translation_en": para
                        })
            
            print(f"\nExtracted {len(extracted_quotes)} dense philosophical paragraphs!")
            
            with open(OUT_PATH, "w", encoding='utf-8') as outfile:
                json.dump(extracted_quotes, outfile, indent=2, ensure_ascii=False)
            print(f"Saved into: {OUT_PATH}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_krishna_quotes()
