import { decodeReplay, encodeReplay, type Recording, type Replay } from "../sim/arena/replay";
import type { ArenaState } from "../sim/arena/sim";

export const REPLAY_PARAM = "replay";
export const SEED_PARAM = "seed";
const MAX_CODE_LENGTH = 400_000;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const triple = (a << 16) | (b << 8) | c;
    const left = bytes.length - index;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    if (left > 1) {
      out += ALPHABET[(triple >> 6) & 63];
    }
    if (left > 2) {
      out += ALPHABET[triple & 63];
    }
  }
  return out;
}

export function fromBase64Url(code: string): Uint8Array | null {
  if (code.length % 4 === 1) {
    return null;
  }
  const values: number[] = [];
  for (const char of code) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) {
      return null;
    }
    values.push(value);
  }
  const bytes: number[] = [];
  for (let index = 0; index < values.length; index += 4) {
    const chunk = values.slice(index, index + 4);
    const triple = ((chunk[0] ?? 0) << 18) | ((chunk[1] ?? 0) << 12) | ((chunk[2] ?? 0) << 6) | (chunk[3] ?? 0);
    bytes.push((triple >> 16) & 255);
    if (chunk.length > 2) {
      bytes.push((triple >> 8) & 255);
    }
    if (chunk.length > 3) {
      bytes.push(triple & 255);
    }
  }
  return Uint8Array.from(bytes);
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export async function replayCode(recording: Recording, final: ArenaState): Promise<string> {
  return toBase64Url(await pipe(encodeReplay(recording, final), new CompressionStream("deflate-raw")));
}

export async function readReplayCode(code: string): Promise<Replay | null> {
  if (code.length === 0 || code.length > MAX_CODE_LENGTH) {
    return null;
  }
  const packed = fromBase64Url(code);
  if (!packed) {
    return null;
  }
  try {
    return decodeReplay(await pipe(packed, new DecompressionStream("deflate-raw")));
  } catch {
    return null;
  }
}

export function replayUrl(base: string, seed: number, code: string): string {
  const url = new URL(base);
  url.search = "";
  url.searchParams.set(SEED_PARAM, String(seed));
  url.hash = `${REPLAY_PARAM}=${code}`;
  return url.toString();
}

export function replayCodeFrom(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(REPLAY_PARAM);
}

export function postToXUrl(text: string, link: string): string {
  const url = new URL("https://x.com/intent/post");
  url.searchParams.set("text", text);
  url.searchParams.set("url", link);
  return url.toString();
}
