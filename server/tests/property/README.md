# Property-Based Testing Framework

This directory contains property-based tests for the RAG Document Management System using the Hypothesis framework.

## Overview

Property-based testing validates that certain properties hold true across a wide range of generated inputs, rather than testing specific examples. This approach helps discover edge cases and ensures robust behavior across all valid inputs.

## Framework Components

### 1. Test Generators (`tests/generators.py`)
Contains Hypothesis strategies for generating test data for all models:
- **User data**: Valid user registration and authentication data
- **Document data**: File upload and document metadata
- **Folder data**: Folder hierarchy and organization data
- **Search data**: Search queries and history data

### 2. Configuration (`tests/property_test_config.py`)
Provides standardized configuration for property-based tests:
- **Minimum 100 iterations** per test (as specified in design document)
- **Standardized test tags** for traceability to design properties
- **Different settings** for fast/slow tests
- **Decorator utilities** for easy test creation

### 3. Framework Setup Tests (`tests/property/test_framework_setup.py`)
Validates that the testing framework is working correctly:
- Tests all data generators produce valid structures
- Validates constraints and edge cases
- Ensures decorators and configuration work properly

## Configuration

### Environment Variables
- `HYPOTHESIS_MAX_EXAMPLES`: Number of test iterations (default: 100)
- `HYPOTHESIS_DEADLINE`: Maximum time per test in milliseconds (default: 5000)
- `HYPOTHESIS_VERBOSITY`: Test output verbosity (default: normal)

### Test Settings
- **Default**: 100 examples, 5-second deadline
- **Fast tests**: 200 examples, 2.5-second deadline  
- **Slow tests**: 50 examples, 10-second deadline

## Running Property-Based Tests

### Using the Test Runner Script
```bash
# Run all property-based tests
./scripts/testing/run_property_tests.sh

# Generate HTML report
./scripts/testing/run_property_tests.sh --report
```

### Using pytest directly
```bash
# Run all property-based tests
pytest tests/ -m property -v

# Run specific test file
pytest tests/property/test_framework_setup.py -v

# Run with custom configuration
HYPOTHESIS_MAX_EXAMPLES=200 pytest tests/ -m property -v
```

## Writing Property-Based Tests

### Basic Structure
```python
from hypothesis import given
from tests.generators import user_data
from tests.property_test_config import auth_property_test

class TestUserAuthentication:
    
    @auth_property_test(1, "User Registration and Authentication")
    @given(user_data())
    def test_user_registration_property(self, user_data_dict):
        """
        Property: For any valid user registration data, the system should 
        create a user account with properly encrypted password storage.
        
        Feature: rag-document-system, Property 1: User Registration and Authentication
        """
        # Test implementation here
        pass
```

### Test Tagging
All property-based tests must include the standardized tag format:
```
Feature: rag-document-system, Property {number}: {property_text}
```

This ensures traceability back to the design document properties.

### Available Decorators
- `@auth_property_test(number, description)` - Authentication tests
- `@document_property_test(number, description)` - Document management tests  
- `@folder_property_test(number, description)` - Folder management tests
- `@search_property_test(number, description)` - Search functionality tests
- `@system_property_test(number, description)` - System-level tests

## Design Document Properties

The following properties from the design document should be implemented as property-based tests:

1. **User Registration and Authentication** - Validates user creation and login
2. **Duplicate User Prevention** - Ensures unique email/username constraints
3. **Authentication Token Management** - Tests JWT token lifecycle
4. **File Upload Validation** - Validates file type and size constraints
5. **Upload Processing Pipeline** - Tests document processing workflow
6. **Document Processing Round Trip** - Validates text extraction and embedding
7. **Processing Status Management** - Tests status updates during processing
8. **Folder Management Operations** - Validates folder CRUD operations
9. **RAG Search Pipeline** - Tests search and answer generation
10. **Search Result Caching** - Validates caching behavior
11. **Document Access Control** - Tests user ownership verification
12. **Document Deletion Cleanup** - Validates complete data removal
13. **Password Security** - Tests password hashing and storage
14. **Authentication Validation** - Tests JWT token validation
15. **Error Handling Consistency** - Tests error responses and logging
16. **Configuration Management** - Tests environment variable handling

## Best Practices

### Generator Design
- Use realistic constraints that match production data
- Include edge cases in generators (empty strings, boundary values)
- Ensure generated data is valid for the domain
- Use composite strategies for complex data relationships

### Test Implementation
- Focus on universal properties, not specific examples
- Test invariants that should always hold
- Validate round-trip properties for serialization/parsing
- Test error conditions with invalid inputs

### Performance Considerations
- Use appropriate test settings for different test types
- Consider using `assume()` to filter invalid generated data
- Profile slow tests and optimize generators if needed
- Use `@example()` decorator for specific regression cases

## Troubleshooting

### Common Issues
1. **Slow tests**: Reduce `max_examples` or increase `deadline`
2. **Flaky tests**: Check for non-deterministic behavior in code
3. **Generator failures**: Validate generator constraints and filters
4. **Memory issues**: Use smaller data sizes in generators

### Debugging
- Use `Verbosity.verbose` for detailed test output
- Add `print()` statements in test functions for debugging
- Use `@example()` decorator to test specific failing cases
- Check Hypothesis database for saved failing examples

## Integration with CI/CD

Property-based tests are included in the main test suite and will run automatically in CI/CD pipelines. The framework is configured to:
- Use consistent random seeds for reproducible results
- Save failing examples for regression testing
- Generate detailed reports for test failures
- Integrate with existing pytest configuration