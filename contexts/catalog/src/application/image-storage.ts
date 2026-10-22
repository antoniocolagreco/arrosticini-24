export interface StoredImage {
  body: Uint8Array;
  contentType: string;
}

export interface ImageStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredImage | undefined>;
  delete(key: string): Promise<void>;
}
