/**
 * Core: Serialization framework.
 *
 * Concrete serializers live alongside the Document schema (the
 * canonical place for shape conversion). This barrel re-exports
 * the JSON serializer used by the v0.1 editor.
 */

export { serializeDocument, deserializeDocument } from './documentSerializer';
export type {
  SerializedDocumentV1,
  SerializedDocumentInput,
  LoadedDocument,
} from './documentSerializer';
