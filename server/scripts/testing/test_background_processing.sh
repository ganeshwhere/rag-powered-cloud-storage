#!/bin/bash

# Test script for background processing components
# Usage: ./scripts/testing/test_background_processing.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERBOSE=false
COVERAGE=false
INTEGRATION_ONLY=false
UNIT_ONLY=false
PERFORMANCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -c|--coverage)
            COVERAGE=true
            shift
            ;;
        -i|--integration-only)
            INTEGRATION_ONLY=true
            shift
            ;;
        -u|--unit-only)
            UNIT_ONLY=true
            shift
            ;;
        -p|--performance)
            PERFORMANCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -v, --verbose         Verbose output"
            echo "  -c, --coverage        Run with coverage reporting"
            echo "  -i, --integration-only Run only integration tests"
            echo "  -u, --unit-only       Run only unit tests"
            echo "  -p, --performance     Run performance tests"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Starting Background Processing Tests${NC}"
echo "========================================"

# Set up environment
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export TESTING=true

# Check if virtual environment is activated
if [[ -z "${VIRTUAL_ENV}" ]]; then
    echo -e "${YELLOW}⚠️  Warning: Virtual environment not detected${NC}"
    echo "Consider activating your virtual environment first"
fi

# Install test dependencies if needed
echo -e "${BLUE}📦 Checking test dependencies...${NC}"
pip install -q pytest pytest-asyncio pytest-cov hypothesis

# Set up test database
echo -e "${BLUE}🗄️  Setting up test database...${NC}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/rag_documents_test}"

# Build pytest command
PYTEST_CMD="python -m pytest"

# Add verbosity
if [[ "$VERBOSE" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD -v -s"
fi

# Add coverage
if [[ "$COVERAGE" == true ]]; then
    PYTEST_CMD="$PYTEST_CMD --cov=app.core.processors --cov=app.core.vector_store --cov=app.workers --cov-report=html --cov-report=term-missing"
fi

# Determine which tests to run
TEST_PATHS=""

if [[ "$UNIT_ONLY" == true ]]; then
    echo -e "${BLUE}🧪 Running Unit Tests Only${NC}"
    TEST_PATHS="tests/unit/test_document_processor.py tests/unit/test_vector_store.py tests/unit/test_celery_tasks.py"
elif [[ "$INTEGRATION_ONLY" == true ]]; then
    echo -e "${BLUE}🔗 Running Integration Tests Only${NC}"
    TEST_PATHS="tests/integration/test_background_processing.py"
elif [[ "$PERFORMANCE" == true ]]; then
    echo -e "${BLUE}⚡ Running Performance Tests${NC}"
    TEST_PATHS="tests/integration/test_background_processing.py -m slow"
else
    echo -e "${BLUE}🧪 Running All Background Processing Tests${NC}"
    TEST_PATHS="tests/unit/test_document_processor.py tests/unit/test_vector_store.py tests/unit/test_celery_tasks.py tests/integration/test_background_processing.py"
fi

# Run the tests
echo -e "${BLUE}🏃 Executing tests...${NC}"
echo "Command: $PYTEST_CMD $TEST_PATHS"
echo ""

if $PYTEST_CMD $TEST_PATHS; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
    if [[ "$COVERAGE" == true ]]; then
        echo -e "${BLUE}📊 Coverage report generated in htmlcov/index.html${NC}"
    fi
    
    # Run additional checks
    echo ""
    echo -e "${BLUE}🔍 Running additional checks...${NC}"
    
    # Check import structure
    echo "Checking imports..."
    python -c "
from app.workers.celery_app import celery_app
from app.core.processors.document_processor import DocumentProcessor
from app.core.vector_store import PineconeClient
from app.workers.tasks import process_document_task, cleanup_document_task, health_check_task
print('✅ All imports successful')
"
    
    # Check Celery task registration
    echo "Checking Celery task registration..."
    python -c "
from app.workers.celery_app import celery_app
tasks = list(celery_app.tasks.keys())
expected_tasks = [
    'app.workers.tasks.process_document_task',
    'app.workers.tasks.cleanup_document_task', 
    'app.workers.tasks.health_check_task'
]
for task in expected_tasks:
    if task not in tasks:
        raise Exception(f'Task {task} not registered')
print('✅ All tasks properly registered')
"
    
    # Check configuration
    echo "Checking configuration..."
    python -c "
from app.core.config import settings
assert hasattr(settings, 'CELERY_BROKER_URL')
assert hasattr(settings, 'CELERY_RESULT_BACKEND')
print('✅ Configuration check passed')
"
    
    echo ""
    echo -e "${GREEN}🎉 Background Processing Tests Complete!${NC}"
    echo "========================================"
    echo -e "${GREEN}All components are working correctly:${NC}"
    echo "  ✅ Document Processor"
    echo "  ✅ Vector Store Client"
    echo "  ✅ Celery Tasks"
    echo "  ✅ Integration Workflow"
    echo ""
    
    if [[ "$COVERAGE" == true ]]; then
        echo -e "${BLUE}📈 Coverage Summary:${NC}"
        python -c "
import coverage
cov = coverage.Coverage()
cov.load()
print(f'Total Coverage: {cov.report():.1f}%')
" 2>/dev/null || echo "Coverage data available in htmlcov/"
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo -e "${YELLOW}💡 Troubleshooting Tips:${NC}"
    echo "1. Check that all dependencies are installed:"
    echo "   pip install -r requirements.txt"
    echo ""
    echo "2. Verify environment variables are set:"
    echo "   - DATABASE_URL (for test database)"
    echo "   - REDIS_URL (for Celery broker)"
    echo ""
    echo "3. Check that external services are available:"
    echo "   - PostgreSQL (for database tests)"
    echo "   - Redis (for Celery tests)"
    echo ""
    echo "4. Run with verbose output for more details:"
    echo "   $0 --verbose"
    echo ""
    echo "5. Run specific test categories:"
    echo "   $0 --unit-only      # Only unit tests"
    echo "   $0 --integration-only # Only integration tests"
    echo ""
    
    exit 1
fi