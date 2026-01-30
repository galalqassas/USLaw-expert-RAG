import os
import sys

# Add the src directory to specific path so imports work
# Current file is in /api/index.py, so we need to go up one level and then into src
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from law_rag.api import app
