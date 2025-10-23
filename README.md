# bun-meditor

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.23. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Tests

Run unit tests:

```bash
bun test
```

## Examples

- Basic send/publish

```bash
bun run examples/basic.ts
```

- Behaviors (logging/retry/timeout)

```bash
bun run examples/behaviors.ts
```

- Decorators + scanHandles

```bash
bun run examples/decorators.ts
```

- Bun.serve HTTP example (POST /sum { a, b })

```bash
bun run examples/serve.ts
# Then in another shell:
curl -s http://localhost:3000/sum -H 'content-type: application/json' -d '{"a":4,"b":6}'
```

- Bun.serve + Decorators (POST /sum { a, b }, POST /ping { msg })

```bash
bun run examples/serve-decorators.ts
# Başka bir terminalde:
curl -s http://localhost:3001/sum -H 'content-type: application/json' -d '{"a":3,"b":9}'
curl -s http://localhost:3001/ping -H 'content-type: application/json' -d '{"msg":"hello"}'
```
