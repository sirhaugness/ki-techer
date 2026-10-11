import 'server-only';
import { adminDb } from '../db/server';
import type { SpeechCache } from './contracts';
const bucket = 'leo-tts';
export function speechCache(): SpeechCache {
  const client = adminDb();
  return {
    async get(hash, voice) {
      const { data, error } = await client
        .from('tts_cache')
        .select('storage_path')
        .eq('text_hash', hash)
        .eq('voice', voice)
        .maybeSingle();
      if (error || !data) return null;
      const audio = await client.storage
        .from(bucket)
        .download(data.storage_path);
      return audio.error || !audio.data
        ? null
        : new Uint8Array(await audio.data.arrayBuffer());
    },
    async put(hash, voice, path, bytes) {
      const existing = await client.storage.getBucket(bucket);
      if (existing.error) {
        const created = await client.storage.createBucket(bucket, {
          public: false,
          allowedMimeTypes: ['audio/mpeg'],
          fileSizeLimit: 4_000_000,
        });
        if (created.error) {
          const retry = await client.storage.getBucket(bucket);
          if (retry.error || retry.data.public)
            throw new Error('Lydlageret er utilgjengelig eller ikke privat.');
        }
      } else if (existing.data.public)
        throw new Error('Lydlageret må være privat.');
      const upload = await client.storage
        .from(bucket)
        .upload(path, bytes, { contentType: 'audio/mpeg', upsert: true });
      if (upload.error) throw new Error('Kunne ikke lagre lyden.');
      const index = await client
        .from('tts_cache')
        .upsert({ text_hash: hash, voice, storage_path: path });
      if (index.error) throw new Error('Kunne ikke indeksere lyden.');
    },
  };
}
