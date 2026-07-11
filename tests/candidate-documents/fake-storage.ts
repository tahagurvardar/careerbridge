import {
  DocumentStorageError,
  type PrivateDocumentStorage,
  type PutObjectInput,
  type StoredObject,
} from "@/lib/storage/types";

/**
 * In-memory {@link PrivateDocumentStorage} for isolated integration tests. Lets
 * suites exercise real Prisma coordination without any cloud credentials, and
 * records puts/deletes so storage/database consistency behavior is observable.
 */
export class FakeDocumentStorage implements PrivateDocumentStorage {
  readonly objects = new Map<string, Buffer>();
  readonly puts: string[] = [];
  readonly deletes: string[] = [];
  failNextPut = false;

  async putObject({ key, body }: PutObjectInput): Promise<void> {
    if (this.failNextPut) {
      this.failNextPut = false;
      throw new DocumentStorageError("IO");
    }
    this.puts.push(key);
    this.objects.set(key, Buffer.from(body));
  }

  async getObject(key: string): Promise<StoredObject> {
    const body = this.objects.get(key);
    if (!body) throw new DocumentStorageError("NOT_FOUND");
    return { body, contentLength: body.byteLength };
  }

  async deleteObject(key: string): Promise<void> {
    this.deletes.push(key);
    this.objects.delete(key);
  }

  async objectExists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }
}
