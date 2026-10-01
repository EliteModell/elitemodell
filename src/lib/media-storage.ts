import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type MediaStorageName = "SUPABASE" | "BUNNY";

export type MediaObjectMetadata = {
  size: number | null;
  contentType: string | null;
  etag: string | null;
  updatedAt: string | null;
};

export type MediaUploadInput = {
  bucket: string;
  path: string;
  contents: Buffer;
  contentType: string;
  overwrite?: boolean;
};

export interface MediaStorageProvider {
  readonly name: MediaStorageName;
  upload(input: MediaUploadInput): Promise<void>;
  download(bucket: string, path: string): Promise<Buffer>;
  delete(bucket: string, path: string): Promise<void>;
  exists(bucket: string, path: string): Promise<boolean>;
  getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string>;
  getMetadata(bucket: string, path: string): Promise<MediaObjectMetadata | null>;
  copy(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string): Promise<void>;
  move(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string): Promise<void>;
  healthCheck(): Promise<{ ok: boolean; detail: string }>;
}

export class SupabaseMediaStorageProvider implements MediaStorageProvider {
  readonly name = "SUPABASE" as const;

  async upload(input: MediaUploadInput) {
    const { error } = await createSupabaseServerClient().storage
      .from(input.bucket)
      .upload(input.path, input.contents, {
        contentType: input.contentType,
        upsert: input.overwrite ?? false,
      });
    if (error && !(input.overwrite === false && /already exists|duplicate/i.test(error.message))) {
      throw new Error(`Falha no upload Supabase: ${error.message}`);
    }
  }

  async download(bucket: string, path: string) {
    const { data, error } = await createSupabaseServerClient().storage.from(bucket).download(path);
    if (error || !data) throw new Error(error?.message || "Objeto Supabase nao encontrado.");
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(bucket: string, path: string) {
    const { error } = await createSupabaseServerClient().storage.from(bucket).remove([path]);
    if (error) throw new Error(`Falha ao remover objeto Supabase: ${error.message}`);
  }

  async exists(bucket: string, path: string) {
    return Boolean(await this.getMetadata(bucket, path));
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number) {
    const { data, error } = await createSupabaseServerClient().storage
      .from(bucket)
      .createSignedUrl(path, Math.min(Math.max(expiresInSeconds, 1), 900));
    if (error || !data?.signedUrl) throw new Error(error?.message || "Falha ao assinar URL Supabase.");
    return data.signedUrl;
  }

  async getMetadata(bucket: string, path: string) {
    const segments = path.split("/");
    const filename = segments.pop();
    if (!filename) return null;
    const folder = segments.join("/");
    const { data, error } = await createSupabaseServerClient().storage.from(bucket).list(folder, {
      search: filename,
      limit: 10,
    });
    if (error) throw new Error(`Falha ao consultar objeto Supabase: ${error.message}`);
    const object = data?.find((entry) => entry.name === filename);
    if (!object) return null;
    const metadata = object.metadata as Record<string, unknown> | null;
    return {
      size: typeof metadata?.size === "number" ? metadata.size : null,
      contentType: typeof metadata?.mimetype === "string" ? metadata.mimetype : null,
      etag: typeof metadata?.eTag === "string" ? metadata.eTag : null,
      updatedAt: object.updated_at ?? null,
    };
  }

  async copy(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string) {
    if (sourceBucket === destinationBucket) {
      const { error } = await createSupabaseServerClient().storage
        .from(sourceBucket)
        .copy(sourcePath, destinationPath);
      if (error) throw new Error(`Falha ao copiar objeto Supabase: ${error.message}`);
      return;
    }
    const contents = await this.download(sourceBucket, sourcePath);
    await this.upload({
      bucket: destinationBucket,
      path: destinationPath,
      contents,
      contentType: "application/octet-stream",
      overwrite: false,
    });
  }

  async move(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string) {
    if (sourceBucket === destinationBucket) {
      const { error } = await createSupabaseServerClient().storage
        .from(sourceBucket)
        .move(sourcePath, destinationPath);
      if (error) throw new Error(`Falha ao mover objeto Supabase: ${error.message}`);
      return;
    }
    await this.copy(sourceBucket, sourcePath, destinationBucket, destinationPath);
    await this.delete(sourceBucket, sourcePath);
  }

  async healthCheck() {
    try {
      const { error } = await createSupabaseServerClient().storage.listBuckets();
      return error ? { ok: false, detail: error.message } : { ok: true, detail: "Supabase Storage acessivel." };
    } catch (cause) {
      return { ok: false, detail: cause instanceof Error ? cause.message : "Falha desconhecida." };
    }
  }
}

type BunnyConfiguration = {
  storageZone: string;
  storageHost: string;
  accessKey: string;
  cdnHostname: string | null;
};

function bunnyConfiguration(): BunnyConfiguration {
  const storageZone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const storageHost = process.env.BUNNY_STORAGE_HOST?.trim() || "storage.bunnycdn.com";
  const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY?.trim();
  if (!storageZone || !accessKey) {
    throw new Error("Bunny Storage nao configurado. Defina BUNNY_STORAGE_ZONE e BUNNY_STORAGE_ACCESS_KEY.");
  }
  return {
    storageZone,
    storageHost,
    accessKey,
    cdnHostname: process.env.BUNNY_CDN_HOSTNAME?.trim() || null,
  };
}

function bunnyObjectUrl(config: BunnyConfiguration, bucket: string, path: string) {
  const encoded = [config.storageZone, bucket, ...path.split("/")]
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://${config.storageHost}/${encoded}`;
}

export class BunnyMediaStorageProvider implements MediaStorageProvider {
  readonly name = "BUNNY" as const;

  private async request(method: string, bucket: string, path: string, body?: Buffer, contentType?: string) {
    const config = bunnyConfiguration();
    const response = await fetch(bunnyObjectUrl(config, bucket, path), {
      method,
      headers: {
        AccessKey: config.accessKey,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body: body ? new Uint8Array(body) : undefined,
      cache: "no-store",
    });
    return response;
  }

  async upload(input: MediaUploadInput) {
    if (input.overwrite) throw new Error("Overwrite Bunny permanece desabilitado para preservar rollback.");
    const response = await this.request("PUT", input.bucket, input.path, input.contents, input.contentType);
    if (!response.ok) throw new Error(`Falha no upload Bunny: HTTP ${response.status}.`);
  }

  async download(bucket: string, path: string) {
    const response = await this.request("GET", bucket, path);
    if (!response.ok) throw new Error(`Objeto Bunny indisponivel: HTTP ${response.status}.`);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(bucket: string, path: string) {
    const response = await this.request("DELETE", bucket, path);
    if (!response.ok && response.status !== 404) throw new Error(`Falha ao remover objeto Bunny: HTTP ${response.status}.`);
  }

  async exists(bucket: string, path: string) {
    const response = await this.request("HEAD", bucket, path);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`Falha ao consultar objeto Bunny: HTTP ${response.status}.`);
    return true;
  }

  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    void bucket;
    void path;
    void expiresInSeconds;
    throw new Error("Bunny CDN token authentication deve ser habilitada e validada no contrato antes da ativacao.");
  }

  async getMetadata(bucket: string, path: string) {
    const response = await this.request("HEAD", bucket, path);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Falha ao consultar metadados Bunny: HTTP ${response.status}.`);
    return {
      size: Number(response.headers.get("content-length")) || null,
      contentType: response.headers.get("content-type"),
      etag: response.headers.get("etag"),
      updatedAt: response.headers.get("last-modified"),
    };
  }

  async copy(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string) {
    const metadata = await this.getMetadata(sourceBucket, sourcePath);
    if (!metadata) throw new Error("Origem Bunny nao encontrada.");
    const contents = await this.download(sourceBucket, sourcePath);
    await this.upload({
      bucket: destinationBucket,
      path: destinationPath,
      contents,
      contentType: metadata.contentType || "application/octet-stream",
      overwrite: false,
    });
  }

  async move(sourceBucket: string, sourcePath: string, destinationBucket: string, destinationPath: string) {
    await this.copy(sourceBucket, sourcePath, destinationBucket, destinationPath);
    await this.delete(sourceBucket, sourcePath);
  }

  async healthCheck() {
    try {
      bunnyConfiguration();
      return { ok: true, detail: "Configuracao Bunny presente; nenhuma escrita foi executada." };
    } catch (cause) {
      return { ok: false, detail: cause instanceof Error ? cause.message : "Falha desconhecida." };
    }
  }
}

const supabaseProvider = new SupabaseMediaStorageProvider();
const bunnyProvider = new BunnyMediaStorageProvider();

export function getMediaStorageProvider(name: MediaStorageName = "SUPABASE") {
  return name === "BUNNY" ? bunnyProvider : supabaseProvider;
}

export function getActiveMediaStorageProvider() {
  const requested = process.env.MEDIA_STORAGE_PROVIDER?.trim().toUpperCase() || "SUPABASE";
  if (requested === "BUNNY") {
    if (process.env.BUNNY_PRODUCTION_ENABLED !== "true") {
      throw new Error("Bunny nao esta habilitado em producao.");
    }
    return bunnyProvider;
  }
  return supabaseProvider;
}

export function bunnyProductionEnabled() {
  return process.env.BUNNY_PRODUCTION_ENABLED === "true";
}
