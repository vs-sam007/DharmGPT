import sys
try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not installed. Please try again after installing.")
    sys.exit(0)

pdf_files = [
    r"c:\Users\hp\Documents\GitHub\Dharmagpt (2)\Dharmagpt\Unabridged Mahabharata 6 Volumes Set in Hindi by Veda Vyasa.pdf",
    r"c:\Users\hp\Documents\GitHub\Dharmagpt (2)\Dharmagpt\The Complete Mahabharata .pdf"
]

for pdf_path in pdf_files:
    print(f"\n--- Analyzing: {pdf_path} ---")
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            num_pages = len(reader.pages)
            print(f"Total Pages: {num_pages}")
            
            # Extract sample text from middle of book
            sample_page = min(50, num_pages - 1)
            text = reader.pages[sample_page].extract_text()
            print(f"Sample text from page {sample_page}:\n")
            print(text[:500])
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
