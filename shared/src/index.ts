// Single source of truth for the domain model: Zod schemas (runtime validation) and the
// types inferred from them (z.infer). Consumed by the backend directly and by the frontend
// via the Serialized<> wire-format helper. See issue #2.
export * from './submission.js';
export * from './annotation.js';
export * from './research.js';
export * from './ontology.js';
export * from './ranking.js';
export * from './model.js';
export * from './folder.js';
export * from './serialized.js';
