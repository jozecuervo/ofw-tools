---
description: Generate unit tests using Arrange-Act-Assert with Jest
applyTo: "**/__tests__/**/*.{js,ts}"
tools: ["jest"]
---

## Unit Testing (AAA)

1. Arrange: Setup inputs, mocks, and environment.
2. Act: Execute the function or CLI.
3. Assert: Verify outputs, side effects, and edge cases.

### Guidelines

- Keep tests small and focused; one behavior per test.
- Prefer pure function tests; isolate I/O via mocks.
- For CLI scripts, test argument parsing and exit codes using `child_process.spawnSync` with Node.
- Mock heavy libs (e.g., `pdf-parse`, `polarity`) to keep tests fast and deterministic.

### Example (JavaScript)

```javascript
test('adds 1 + 2 to equal 3', () => {
  // Arrange
  const num1 = 1;
  const num2 = 2;
  // Act
  const sum = num1 + num2;
  // Assert
  expect(sum).toBe(3);
});
```


