"""
Utility functions for text processing.
"""

import re
from bs4 import BeautifulSoup


def clean_html_text(html_content: str) -> str:
    """
    Extract clean text from HTML content.
    
    Removes scripts, styles, and normalizes whitespace.
    
    Args:
        html_content: Raw HTML string.
        
    Returns:
        Cleaned plain text.
    """
    soup = BeautifulSoup(html_content, "lxml")
    
    # Remove non-content elements
    for tag in soup(["script", "style", "meta", "link", "noscript"]):
        tag.decompose()
    
    text = soup.get_text(separator=" ")
    
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    
    return text
