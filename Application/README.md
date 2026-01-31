## Testing

This project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/react) for unit and component testing.

### Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage
```

### Writing Tests

Test files should be placed next to the code they test with a `.test.ts` or `.test.tsx` extension.

For unit tests:

```typescript
import { describe, it, expect } from "vitest";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(1 + 1).toBe(2);
  });
});
```

For component tests, use the custom render from `test-utils/render.tsx` which includes MantineProvider:

```tsx
import { render, screen } from "../test-utils/render";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```
