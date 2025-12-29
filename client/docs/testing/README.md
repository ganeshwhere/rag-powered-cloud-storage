# Testing Documentation

This directory contains comprehensive testing documentation for the RAG Document System frontend.

## Documentation Files

### [testingGuide.md](./testingGuide.md)
Complete guide covering:
- How to run tests (all command variations)
- Test structure and organization
- Writing test patterns and templates
- Debugging and troubleshooting
- Coverage reports and CI/CD integration

### [quickReference.md](./quickReference.md)
Quick reference card with:
- Essential commands and shortcuts
- Common testing patterns and code snippets
- Mocking strategies
- Troubleshooting table

### [bestPractices.md](./bestPractices.md)
Best practices and guidelines:
- Testing principles and anti-patterns
- Component and hook testing strategies
- Async testing and error handling
- Performance and accessibility testing
- Code coverage guidelines

## Quick Start

```bash
# Navigate to client directory
cd doc-rag-system/client

# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test File Structure

```
src/
├── features/
│   ├── auth/
│   │   ├── components/__tests__/
│   │   └── hooks/__tests__/
│   ├── documents/
│   │   ├── components/__tests__/
│   │   └── hooks/__tests__/
│   └── search/
│       ├── components/__tests__/
│       └── hooks/__tests__/
└── test-utils/
    ├── setup.ts
    └── render.tsx
```

## Testing Philosophy

Our tests focus on:
- **User behavior** over implementation details
- **Accessibility** and semantic queries
- **Real-world scenarios** and edge cases
- **API-independent** frontend logic

## Current Test Coverage

- **Component Tests**: Authentication, Documents, Search, Folders
- **Hook Tests**: Upload, Search, Folder actions, Document status
- **Integration Tests**: Component + hook interactions
- **Coverage Target**: 70%+ across branches, functions, and lines

## Test Configuration

- **Test Runner**: Jest
- **Component Testing**: React Testing Library
- **User Interactions**: @testing-library/user-event
- **Mocking**: Jest mocks for APIs and hooks
- **Environment**: jsdom for DOM simulation

## Key Concepts

### Test Types
1. **Component Tests** - UI behavior and user interactions
2. **Hook Tests** - Custom hook logic and state management
3. **Integration Tests** - Component + hook combinations

### Best Practices
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test user behavior, not implementation
- Mock external dependencies consistently
- Write descriptive test names
- Focus on critical user paths

### Common Patterns
- Form validation and submission
- Async operations and loading states
- Error handling and edge cases
- User interactions and navigation

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Element not found | Use `screen.debug()` to inspect DOM |
| Async test failures | Add `await waitFor()` or use `findBy*` queries |
| Mock not working | Ensure mock setup before component render |
| TypeScript errors | Include all required properties in mocks |

## Useful Links

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing

When adding new tests:
1. Follow the established patterns in existing tests
2. Use semantic queries and test user behavior
3. Add tests for both success and error cases
4. Update documentation if adding new testing patterns
5. Ensure tests are UI-resilient and API-independent

For questions or issues with testing, refer to the detailed guides in this directory or check the troubleshooting sections.