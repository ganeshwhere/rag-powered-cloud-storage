"""
Shared test configuration and fixtures.
"""
import sys
import os
from pathlib import Path

# Add the app directory to Python path for all tests
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))