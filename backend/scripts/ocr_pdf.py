#!/usr/bin/env python3
"""
OCR Script for Vietnamese PDF Documents
Extracts text from scanned PDF using EasyOCR (better Vietnamese support)
and saves to text file for RAG indexing.
"""

import os
import sys
import json
import fitz  # PyMuPDF
import easyocr
from pathlib import Path

# Configuration
REFERENCE_DOCUMENT_DIR = Path(__file__).parent.parent.parent / "reference_document"
OUTPUT_DIR = REFERENCE_DOCUMENT_DIR / "ocr_output"

def ensure_output_dir():
    """Create output directory if it doesn't exist."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def extract_text_pymupdf(pdf_path):
    """Try extracting text using PyMuPDF (for text-based PDFs)."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page_num, page in enumerate(doc, 1):
        text = page.get_text()
        if text.strip():
            full_text += f"\n\n=== TRANG {page_num} ===\n\n{text}"
    return full_text.strip()

def check_if_scanned(pdf_path):
    """Check if PDF is scanned (image-based) or text-based."""
    doc = fitz.open(pdf_path)
    total_chars = 0
    total_images = 0
    
    for page in doc:
        text = page.get_text()
        total_chars += len(text.strip())
        images = page.get_images()
        total_images += len(images)
    
    # If very little text but has images, it's likely scanned
    is_scanned = total_chars < 100 * len(doc) and total_images > 0
    
    print(f"[OCR] PDF analysis:")
    print(f"      - Total pages: {len(doc)}")
    print(f"      - Total characters extracted: {total_chars}")
    print(f"      - Total images: {total_images}")
    print(f"      - Is scanned (image-based): {is_scanned}")
    
    return is_scanned

def ocr_pdf_with_easyocr(pdf_path, languages=['vi', 'en']):
    """
    OCR a PDF file using EasyOCR.
    Converts each page to an image and runs OCR.
    """
    print(f"\n[OCR] Starting OCR for: {pdf_path}")
    print(f"[OCR] Languages: {languages}")
    
    # Initialize EasyOCR reader (downloads models on first run)
    print("[OCR] Initializing EasyOCR reader (may download models)...")
    reader = easyocr.Reader(languages, gpu=False)  # GPU=False for compatibility
    
    # Open PDF
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    print(f"[OCR] Processing {total_pages} pages...")
    
    all_text = []
    
    for page_num, page in enumerate(doc, 1):
        print(f"[OCR] Processing page {page_num}/{total_pages}...", end=" ")
        
        # Convert page to image (high resolution for better OCR)
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        
        # Run OCR on the image
        result = reader.readtext(img_data)
        
        # Extract text from OCR result
        page_text = []
        for detection in result:
            bbox, text, confidence = detection
            if confidence > 0.3:  # Filter low confidence
                page_text.append(text)
        
        page_content = " ".join(page_text)
        all_text.append(f"\n\n=== TRANG {page_num} ===\n\n{page_content}")
        print(f"OK ({len(page_text)} text blocks)")
    
    return "\n".join(all_text)

def process_pdf(pdf_name, doc_type, force_ocr=False):
    """
    Process a PDF file - use text extraction or OCR as needed.
    """
    pdf_path = REFERENCE_DOCUMENT_DIR / pdf_name
    
    if not pdf_path.exists():
        print(f"[OCR] Error: File not found: {pdf_path}")
        return None
    
    print(f"\n{'='*60}")
    print(f"[OCR] Processing: {pdf_name}")
    print(f"[OCR] Document type: {doc_type}")
    print(f"{'='*60}")
    
    # Check if PDF is scanned
    is_scanned = check_if_scanned(pdf_path)
    
    if is_scanned or force_ocr:
        print("[OCR] Using EasyOCR for text extraction...")
        text = ocr_pdf_with_easyocr(str(pdf_path))
    else:
        print("[OCR] PDF is text-based, using PyMuPDF extraction...")
        text = extract_text_pymupdf(str(pdf_path))
    
    # Save output
    output_path = OUTPUT_DIR / f"{pdf_path.stem}_ocr.txt"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"\n[OCR] ✓ Saved to: {output_path}")
    print(f"[OCR] ✓ Total characters: {len(text)}")
    
    # Also save metadata
    metadata_path = OUTPUT_DIR / f"{pdf_path.stem}_metadata.json"
    metadata = {
        "source": pdf_name,
        "type": doc_type,
        "characters": len(text),
        "is_scanned": is_scanned,
        "ocr_used": is_scanned or force_ocr,
    }
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    return text

def main():
    """Main function to process all reference documents."""
    ensure_output_dir()
    
    # Documents to process
    documents = [
        {
            "file": "tai-lieu-so-cap-cuu.pdf",
            "type": "MEDICAL",
            "force_ocr": True,  # Force OCR for this document
        },
        {
            "file": "Cam-nang-PCCC-trong-gia-dinh.pdf", 
            "type": "FIRE_RESCUE",
            "force_ocr": False,  # Try text extraction first
        }
    ]
    
    # Check for command line arguments
    force_all = "--force" in sys.argv
    specific_file = None
    for arg in sys.argv[1:]:
        if not arg.startswith("--"):
            specific_file = arg
    
    print("\n" + "="*60)
    print("Vietnamese PDF OCR Tool for RAG")
    print("="*60)
    
    for doc in documents:
        if specific_file and doc["file"] != specific_file:
            continue
        
        try:
            process_pdf(
                doc["file"], 
                doc["type"], 
                force_ocr=force_all or doc.get("force_ocr", False)
            )
        except Exception as e:
            print(f"[OCR] Error processing {doc['file']}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print("[OCR] ✓ All documents processed!")
    print(f"[OCR] Output directory: {OUTPUT_DIR}")
    print("="*60)
    
    print("\n[OCR] Next step: Run 'npm run rag:reindex' to re-index documents")

if __name__ == "__main__":
    main()




