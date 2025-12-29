#!/bin/bash

# Property-Based Testing Runner Script
# Runs Hypothesis property-based tests with appropriate configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== RAG Document System - Property-Based Testing ===${NC}"
echo

# Set environment variables for Hypothesis
export HYPOTHESIS_MAX_EXAMPLES=${HYPOTHESIS_MAX_EXAMPLES:-100}
export HYPOTHESIS_DEADLINE=${HYPOTHESIS_DEADLINE:-5000}
export HYPOTHESIS_VERBOSITY=${HYPOTHESIS_VERBOSITY:-normal}

echo -e "${YELLOW}Configuration:${NC}"
echo "  Max Examples: $HYPOTHESIS_MAX_EXAMPLES"
echo "  Deadline: ${HYPOTHESIS_DEADLINE}ms"
echo "  Verbosity: $HYPOTHESIS_VERBOSITY"
echo

# Change to server directory
cd "$(dirname "$0")/../.."

# Check if virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo -e "${YELLOW}Warning: No virtual environment detected. Attempting to activate...${NC}"
    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
        echo -e "${GREEN}Virtual environment activated.${NC}"
    else
        echo -e "${RED}Error: Virtual environment not found. Please activate your virtual environment.${NC}"
        exit 1
    fi
fi

# Check if required packages are installed
echo -e "${BLUE}Checking dependencies...${NC}"
python -c "import hypothesis; print(f'Hypothesis version: {hypothesis.__version__}')" || {
    echo -e "${RED}Error: Hypothesis not installed. Please install requirements.${NC}"
    exit 1
}

# Run property-based tests
echo -e "${BLUE}Running property-based tests...${NC}"
echo

# Run framework setup tests first
echo -e "${YELLOW}1. Running framework setup tests...${NC}"
pytest tests/property/test_framework_setup.py -v -m property --tb=short || {
    echo -e "${RED}Framework setup tests failed!${NC}"
    exit 1
}

echo -e "${GREEN}Framework setup tests passed!${NC}"
echo

# Run all property-based tests
echo -e "${YELLOW}2. Running all property-based tests...${NC}"
pytest tests/ -v -m property --tb=short -x || {
    echo -e "${RED}Some property-based tests failed!${NC}"
    exit 1
}

echo
echo -e "${GREEN}=== All property-based tests passed! ===${NC}"

# Optional: Generate test report
if [[ "$1" == "--report" ]]; then
    echo -e "${BLUE}Generating test report...${NC}"
    pytest tests/ -m property --html=reports/property_test_report.html --self-contained-html
    echo -e "${GREEN}Test report generated: reports/property_test_report.html${NC}"
fi

echo -e "${BLUE}Property-based testing completed successfully!${NC}"