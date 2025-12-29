"""
Configuration for property-based testing with Hypothesis.

This module provides configuration settings and utilities for property-based tests
to ensure consistent behavior across all test modules.
"""
from hypothesis import settings, Verbosity
from hypothesis.database import InMemoryExampleDatabase
import os


# Property-based test configuration
# Minimum 100 iterations as specified in the design document
DEFAULT_MAX_EXAMPLES = int(os.getenv("HYPOTHESIS_MAX_EXAMPLES", "100"))
DEFAULT_DEADLINE = int(os.getenv("HYPOTHESIS_DEADLINE", "5000"))  # 5 seconds per test
DEFAULT_VERBOSITY = Verbosity.normal

# Configure Hypothesis settings for property-based tests
property_test_settings = settings(
    max_examples=DEFAULT_MAX_EXAMPLES,
    deadline=DEFAULT_DEADLINE,
    verbosity=DEFAULT_VERBOSITY,
    suppress_health_check=[],  # Enable all health checks
    database=InMemoryExampleDatabase(),  # Use in-memory database for examples
)

# Slow test configuration for integration tests
slow_property_test_settings = settings(
    max_examples=max(50, DEFAULT_MAX_EXAMPLES // 2),  # Fewer examples for slow tests
    deadline=DEFAULT_DEADLINE * 2,  # Longer deadline for slow tests
    verbosity=DEFAULT_VERBOSITY,
    suppress_health_check=[],
    database=InMemoryExampleDatabase(),
)

# Fast test configuration for unit tests
fast_property_test_settings = settings(
    max_examples=min(200, DEFAULT_MAX_EXAMPLES * 2),  # More examples for fast tests
    deadline=DEFAULT_DEADLINE // 2,  # Shorter deadline for fast tests
    verbosity=DEFAULT_VERBOSITY,
    suppress_health_check=[],
    database=InMemoryExampleDatabase(),
)


def get_property_test_tag(feature_name: str, property_number: int, property_text: str) -> str:
    """
    Generate a standardized tag for property-based tests.
    
    Format: Feature: {feature_name}, Property {number}: {property_text}
    
    Args:
        feature_name: Name of the feature being tested
        property_number: Property number from design document
        property_text: Brief description of the property
        
    Returns:
        Formatted tag string for test identification
    """
    return f"Feature: {feature_name}, Property {property_number}: {property_text}"


def property_test(
    feature_name: str,
    property_number: int, 
    property_text: str,
    test_settings: settings = None
):
    """
    Decorator for property-based tests with standardized configuration.
    
    Args:
        feature_name: Name of the feature being tested
        property_number: Property number from design document  
        property_text: Brief description of the property
        test_settings: Custom Hypothesis settings (optional)
        
    Returns:
        Configured Hypothesis settings decorator
    """
    if test_settings is None:
        test_settings = property_test_settings
        
    def decorator(test_func):
        # Add property tag as docstring if not present
        if not test_func.__doc__:
            test_func.__doc__ = get_property_test_tag(feature_name, property_number, property_text)
        elif get_property_test_tag(feature_name, property_number, property_text) not in test_func.__doc__:
            test_func.__doc__ += f"\n\n{get_property_test_tag(feature_name, property_number, property_text)}"
            
        return test_settings(test_func)
    
    return decorator


# Convenience decorators for different test types
def auth_property_test(property_number: int, property_text: str, test_settings: settings = None):
    """Decorator for authentication property tests."""
    return property_test("rag-document-system", property_number, property_text, test_settings)


def document_property_test(property_number: int, property_text: str, test_settings: settings = None):
    """Decorator for document management property tests."""
    return property_test("rag-document-system", property_number, property_text, test_settings)


def folder_property_test(property_number: int, property_text: str, test_settings: settings = None):
    """Decorator for folder management property tests."""
    return property_test("rag-document-system", property_number, property_text, test_settings)


def search_property_test(property_number: int, property_text: str, test_settings: settings = None):
    """Decorator for search functionality property tests."""
    return property_test("rag-document-system", property_number, property_text, test_settings)


def system_property_test(property_number: int, property_text: str, test_settings: settings = None):
    """Decorator for system-level property tests."""
    return property_test("rag-document-system", property_number, property_text, test_settings)