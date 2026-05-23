# Idempotency Guidelines

- Each offline-capable mutation must include a unique `idempotencyKey`.
- Key uniqueness scope: tenant + terminal + local entity.
- Retries must reuse exact same key and payload semantics.
- Replay response should include stable server order identifier mapping.
