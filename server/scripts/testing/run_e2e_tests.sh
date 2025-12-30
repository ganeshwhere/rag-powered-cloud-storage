#!/bin/bash

# End-to-End Test Runner for RAG Document Management System
# This script runs comprehensive end-to-end tests covering complete user workflows

set -e

echo "🚀 Starting End-to-End Test Suite for RAG Document Management System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DATABASE_URL=${TEST_DATABASE_URL:-"postgresql://postgres:password@localhost:5432/rag_documents_test"}
REDIS_URL=${REDIS_URL:-"redis://localhost:6379/1"}
API_BASE_URL=${API_BASE_URL:-"http://localhost:8000"}
CLIENT_BASE_URL=${CLIENT_BASE_URL:-"http://localhost:3000"}

# Test categories
BACKEND_E2E_TESTS="tests/integration/test_end_to_end_workflows.py"
INTEGRATION_TESTS="tests/integration/"
PROPERTY_TESTS="tests/property/"

echo -e "${BLUE}Configuration:${NC}"
echo "  Test Database: $TEST_DATABASE_URL"
echo "  Redis URL: $REDIS_URL"
echo "  API Base URL: $API_BASE_URL"
echo "  Client Base URL: $CLIENT_BASE_URL"
echo ""

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $service_name availability...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is available${NC}"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service_name is not available after $max_attempts attempts${NC}"
    return 1
}

# Function to setup test database
setup_test_database() {
    echo -e "${YELLOW}Setting up test database...${NC}"
    
    # Create test database if it doesn't exist
    python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.database import Base
from app.core.config import settings

async def setup_db():
    test_url = settings.database_url.replace('/rag_documents', '/rag_documents_test')
    engine = create_async_engine(test_url)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    print('Test database setup complete')

asyncio.run(setup_db())
"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Test database setup complete${NC}"
    else
        echo -e "${RED}✗ Test database setup failed${NC}"
        exit 1
    fi
}

# Function to run backend E2E tests
run_backend_e2e_tests() {
    echo -e "${BLUE}Running Backend End-to-End Tests...${NC}"
    echo "================================================"
    
    # Set test environment variables
    export DATABASE_URL="$TEST_DATABASE_URL"
    export REDIS_URL="$REDIS_URL"
    export TESTING=true
    
    # Run specific E2E test file
    pytest -v -x \
        --tb=short \
        --disable-warnings \
        -m "e2e" \
        --cov=app \
        --cov-report=term-missing \
        --cov-report=html:coverage/e2e \
        $BACKEND_E2E_TESTS
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Backend E2E tests passed${NC}"
    else
        echo -e "${RED}✗ Backend E2E tests failed${NC}"
        return $exit_code
    fi
}

# Function to run integration tests
run_integration_tests() {
    echo -e "${BLUE}Running Integration Tests...${NC}"
    echo "======================================="
    
    pytest -v \
        --tb=short \
        --disable-warnings \
        -m "integration" \
        --cov=app \
        --cov-report=term-missing \
        --cov-report=html:coverage/integration \
        $INTEGRATION_TESTS
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
        return $exit_code
    fi
}

# Function to run property-based tests
run_property_tests() {
    echo -e "${BLUE}Running Property-Based Tests...${NC}"
    echo "======================================"
    
    pytest -v \
        --tb=short \
        --disable-warnings \
        -m "property" \
        --hypothesis-show-statistics \
        --cov=app \
        --cov-report=term-missing \
        --cov-report=html:coverage/property \
        $PROPERTY_TESTS
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Property-based tests passed${NC}"
    else
        echo -e "${RED}✗ Property-based tests failed${NC}"
        return $exit_code
    fi
}

# Function to run frontend E2E tests
run_frontend_e2e_tests() {
    echo -e "${BLUE}Running Frontend End-to-End Tests...${NC}"
    echo "================================================"
    
    cd ../client
    
    # Run Jest tests with E2E configuration
    npm test -- \
        --testPathPattern="e2e" \
        --coverage \
        --coverageDirectory=coverage/e2e \
        --watchAll=false \
        --verbose
    
    local exit_code=$?
    cd ../server
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend E2E tests passed${NC}"
    else
        echo -e "${RED}✗ Frontend E2E tests failed${NC}"
        return $exit_code
    fi
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${BLUE}Running Performance Tests...${NC}"
    echo "===================================="
    
    pytest -v \
        --tb=short \
        --disable-warnings \
        -m "slow" \
        --durations=10 \
        tests/integration/test_background_processing.py::TestBackgroundProcessingIntegration::test_large_document_processing \
        tests/integration/test_documents_api.py::TestDocumentAPIs::test_large_file_upload \
        tests/integration/test_search_api.py::TestSearchAPI::test_concurrent_search_requests
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Performance tests passed${NC}"
    else
        echo -e "${RED}✗ Performance tests failed${NC}"
        return $exit_code
    fi
}

# Function to generate test report
generate_test_report() {
    echo -e "${BLUE}Generating Test Report...${NC}"
    echo "==============================="
    
    # Create reports directory
    mkdir -p reports
    
    # Generate combined coverage report
    coverage combine
    coverage html -d reports/coverage
    coverage xml -o reports/coverage.xml
    
    # Generate test results summary
    cat > reports/e2e_test_summary.md << EOF
# End-to-End Test Results Summary

## Test Execution Summary
- **Date**: $(date)
- **Environment**: Test
- **Database**: $TEST_DATABASE_URL
- **API Base URL**: $API_BASE_URL

## Test Categories Executed
- ✅ Backend End-to-End Workflows
- ✅ Integration Tests
- ✅ Property-Based Tests
- ✅ Frontend End-to-End Tests
- ✅ Performance Tests

## Coverage Reports
- Backend Coverage: [HTML Report](coverage/index.html)
- Frontend Coverage: [HTML Report](../client/coverage/e2e/index.html)

## Key Test Scenarios Covered
1. **Complete User Registration and Authentication Workflow**
2. **Document Upload, Processing, and Management Workflow**
3. **RAG Search and Results Workflow**
4. **Folder Management and Organization Workflow**
5. **Error Recovery and Edge Case Handling**
6. **Concurrent Operations and Data Consistency**
7. **Performance and User Experience Validation**

## Next Steps
- Review any failing tests in the detailed logs
- Check coverage reports for areas needing additional testing
- Validate performance metrics against requirements
EOF

    echo -e "${GREEN}✓ Test report generated in reports/e2e_test_summary.md${NC}"
}

# Function to cleanup test environment
cleanup_test_environment() {
    echo -e "${YELLOW}Cleaning up test environment...${NC}"
    
    # Clean up test database
    python -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def cleanup_db():
    test_url = settings.database_url.replace('/rag_documents', '/rag_documents_test')
    engine = create_async_engine(test_url)
    
    async with engine.begin() as conn:
        await conn.execute('DROP SCHEMA public CASCADE')
        await conn.execute('CREATE SCHEMA public')
    
    await engine.dispose()
    print('Test database cleaned up')

asyncio.run(cleanup_db())
" 2>/dev/null || echo "Database cleanup skipped"

    # Clean up temporary files
    find . -name "*.pyc" -delete
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Main execution flow
main() {
    local run_backend=true
    local run_frontend=true
    local run_performance=false
    local cleanup_after=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                run_frontend=false
                shift
                ;;
            --frontend-only)
                run_backend=false
                shift
                ;;
            --with-performance)
                run_performance=true
                shift
                ;;
            --no-cleanup)
                cleanup_after=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --backend-only      Run only backend tests"
                echo "  --frontend-only     Run only frontend tests"
                echo "  --with-performance  Include performance tests"
                echo "  --no-cleanup        Skip cleanup after tests"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Trap to ensure cleanup on exit
    if [ "$cleanup_after" = true ]; then
        trap cleanup_test_environment EXIT
    fi
    
    # Setup test environment
    setup_test_database
    
    local overall_exit_code=0
    
    # Run backend tests
    if [ "$run_backend" = true ]; then
        echo ""
        run_backend_e2e_tests || overall_exit_code=$?
        
        echo ""
        run_integration_tests || overall_exit_code=$?
        
        echo ""
        run_property_tests || overall_exit_code=$?
        
        if [ "$run_performance" = true ]; then
            echo ""
            run_performance_tests || overall_exit_code=$?
        fi
    fi
    
    # Run frontend tests
    if [ "$run_frontend" = true ]; then
        echo ""
        run_frontend_e2e_tests || overall_exit_code=$?
    fi
    
    # Generate report
    echo ""
    generate_test_report
    
    # Final summary
    echo ""
    echo "=================================================================="
    if [ $overall_exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All End-to-End Tests Passed Successfully!${NC}"
    else
        echo -e "${RED}❌ Some Tests Failed (Exit Code: $overall_exit_code)${NC}"
    fi
    echo "=================================================================="
    
    exit $overall_exit_code
}

# Run main function with all arguments
main "$@"