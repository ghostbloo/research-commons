/**
 * Wire-format transform for schema-inferred types.
 *
 * The backend models dates as `Date` (what the Zod schemas infer), but those values
 * cross the API boundary as JSON, where dates become ISO strings. `Serialized<T>` maps
 * a backend domain type to the shape the frontend actually receives over the wire:
 * `Date` becomes `string`, recursing through arrays, objects, and unions while
 * preserving optional modifiers, literal discriminants, and `Record<string, unknown>`.
 */
export type Serialized<T> =
  T extends Date ? string
  : T extends (infer U)[] ? Serialized<U>[]
  : T extends object ? { [K in keyof T]: Serialized<T[K]> }
  : T;
