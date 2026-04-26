/**
 * For one GraphQL type (e.g. `Query`), all `fieldName -> resolver` pairs
 * in one object. Example:
 *   { courses: async () => …, subjects: async () => … }
 * A single `subjects: fn` is one field; the whole `{ … }` is a FieldMap.
 */
type FieldMap = Record<string, unknown>;

/**
 * Join resolver modules (`courseResolvers`, `resourceResolvers`, …) into
 * the single object `ApolloServer` expects.
 *
 * Shape:
 *   { Query: FieldMap, Mutation: FieldMap, Course: FieldMap, … }
 *
 * A plain spread would drop earlier `Query` keys when a later object also
 * has `Query`. We merge **inside** each type name so all fields survive.
 */
export function mergeGraphQLResolvers(
  ...parts: Array<Record<string, FieldMap | undefined>>
): Record<string, FieldMap> {
  const out: Record<string, FieldMap> = {};
  for (const part of parts) {
    if (!part) continue;
    for (const [typeName, fields] of Object.entries(part)) {
      if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
        out[typeName] = { ...(out[typeName] ?? {}), ...fields };
      }
    }
  }
  return out;
}
