#!/bin/bash

# Test Runner Script for RAG Document Management System
# Runs both manual and automated tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}RAG Document Management System - Test Suite${NC}"
echo "=================================================="

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check if server is running
echo -e "\n${YELLOW}Checking if server is running...${NC}"
    if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo -e "${GREEN}Server is running${NC}"
else
    echo -e "${RED}Server is not running. Please start the server first:${NC}"
    echo "   cd $PROJECT_ROOT"
    echo "   python -m uvicorn app.main:app --reload --port 8000"
    exit 1
fi

# Function to run manual tests
run_manual_tests() {
    echo -e "\n${BLUE}Running Manual API Tests${NC}"
    echo "----------------------------------------"
    if [ -f "$SCRIPT_DIR/test_api_manual.sh" ]; then
        cd "$PROJECT_ROOT"
        "$SCRIPT_DIR/test_api_manual.sh"
    else
        echo -e "${RED}Manual test script not found at $SCRIPT_DIR/test_api_manual.sh${NC}"
        return 1
    fi
}

# Function to run automated tests
run_automated_tests() {
    echo -e "\n${BLUE}Running Automated Tests${NC}"
    echo "----------------------------------------"
    cd "$PROJECT_ROOT"
    
    if [ -d "tests" ] && [ -f "tests/integration/test_documents_api.py" ]; then
        echo "Running pytest..."
        
        # Check if pytest is available
        if ! python -c "import pytest" 2>/dev/null; then
            echo -e "${YELLOW}Installing pytest and dependencies...${NC}"
            pip install pytest pytest-asyncio httpx
        fi
        
        # Run tests with proper configuration
        python -m pytest tests/ -v --tb=short --color=yes
    else
        echo -e "${YELLOW}Automated tests not found${NC}"
        echo "   Expected: tests/integration/test_documents_api.py"
        return 1
    fi
}

# Function to run unit tests only
run_unit_tests() {
    echo -e "\n${BLUE}Running Unit Tests${NC}"
    echo "----------------------------------------"
    cd "$PROJECT_ROOT"
    
    if [ -d "tests/unit" ]; then
        python -m pytest tests/unit/ -v --tb=short --color=yes -m unit
    else
        echo -e "${YELLOW}Unit tests not found${NC}"
        return 1
    fi
}

# Function to run integration tests only
run_integration_tests() {
    echo -e "\n${BLUE}Running Integration Tests${NC}"
    echo "----------------------------------------"
    cd "$PROJECT_ROOT"
    
    if [ -d "tests/integration" ]; then
        python -m pytest tests/integration/ -v --tb=short --color=yes -m integration
    else
        echo -e "${YELLOW}Integration tests not found${NC}"
        return 1
    fi
}

# Function to show test structure
show_test_structure() {
    echo -e "\n${BLUE}Test Structure${NC}"
    echo "----------------------------------------"
    cd "$PROJECT_ROOT"
    
    echo "tests/"
    echo "├── conftest.py                  # Pytest configuration and fixtures"
    echo "├── integration/"
    echo "│   └── test_documents_api.py    # Document API integration tests"
    echo "├── unit/"
    echo "│   ├── test_document_service.py # DocumentService unit tests"
    echo "│   └── test_s3_client.py        # S3Client unit tests"
    echo "└── auth/                        # Existing auth tests"
    echo ""
    echo "scripts/"
    echo "├── testing/"
    echo "│   ├── run_tests.sh             # This script"
    echo "│   └── test_api_manual.sh       # Manual API testing"
}

# Main execution
case "${1:-all}" in
    "manual")
        run_manual_tests
        ;;
    "auto")
        run_automated_tests
        ;;
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "structure")
        show_test_structure
        ;;
    "all")
        run_manual_tests
        echo -e "\n${BLUE}=================================================${NC}"
        run_automated_tests
        ;;
    *)
        echo "Usage: $0 [manual|auto|unit|integration|structure|all]"
        echo ""
        echo "Test Types:"
        echo "  manual      - Run manual API tests with real HTTP calls"
        echo "  auto        - Run all automated tests (unit + integration)"
        echo "  unit        - Run unit tests only (fast, isolated)"
        echo "  integration - Run integration tests only (slower, real DB)"
        echo "  structure   - Show test directory structure"
        echo "  all         - Run both manual and automated tests (default)"
        echo ""
        echo "Examples:"
        echo "  $0 unit                    # Quick unit tests"
        echo "  $0 integration             # Full integration tests"
        echo "  $0 manual                  # Manual API validation"
        echo "  $0 all                     # Complete test suite"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Test execution completed!${NC}"