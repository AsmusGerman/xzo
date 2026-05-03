# Examples Guide

All demos for this repository must live inside the `examples/` folder.

## Folder Naming

Each demo must use a clear, unique folder name that explains what the example shows.

Good names:
- `ecommerce`
- `todo-signals`
- `async-data-table`

Avoid:
- `test`
- `demo2`
- `new-example`

## Required Demo Structure

Each demo should be a self-contained folder under `examples/`:

```text
examples/
  your-example-name/
    index.html
    main.ts
    tsconfig.json
    components/
    public/
```

Use additional files and folders as needed, but keep each demo isolated.

## tsconfig Setup

Every example must include its own `tsconfig.json` that extends the root config.

Use this template:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["./**/*", "../src/jsx.d.ts"]
}
```

## Running an Example

To run an example, enter its folder and run Vite directly:

```bash
cd examples/<example-name>
bun install
bun run dev
```

Then open the local URL printed in the terminal.
