import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventStore, ShardedEventStore, Event } from './event-store.js';

let tmpDir: string;

async function makeTmpDir(): Promise<string> {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rc-eventstore-'));
  return tmpDir;
}

afterEach(async () => {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = '';
  }
});

describe('EventStore', () => {
  it('round-trips appended events, re-wrapping timestamps as Date', async () => {
    const dir = await makeTmpDir();
    const store = new EventStore(path.join(dir, 'events.jsonl'));
    await store.init();

    const events: Event[] = [
      { timestamp: new Date('2024-01-01T00:00:00.000Z'), type: 'first', data: { n: 1 } },
      { timestamp: new Date('2024-06-15T12:30:00.000Z'), type: 'second', data: { nested: { ok: true } } },
    ];
    for (const e of events) {
      await store.appendEvent(e);
    }
    await store.close();

    const loaded = await store.loadEvents();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].timestamp).toBeInstanceOf(Date);
    expect(loaded[0].timestamp.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(loaded[0].type).toBe('first');
    expect(loaded[0].data).toEqual({ n: 1 });
    expect(loaded[1].data).toEqual({ nested: { ok: true } });
  });

  it('returns [] when the backing file does not exist', async () => {
    const dir = await makeTmpDir();
    const store = new EventStore(path.join(dir, 'missing.jsonl'));
    // Intentionally no init() — file was never created.
    await expect(store.loadEvents()).resolves.toEqual([]);
  });

  it('returns [] for an initialized-but-empty file', async () => {
    const dir = await makeTmpDir();
    const store = new EventStore(path.join(dir, 'empty.jsonl'));
    await store.init();
    await expect(store.loadEvents()).resolves.toEqual([]);
    await store.close();
  });
});

describe('ShardedEventStore', () => {
  it('shards by the first two characters of the id and round-trips', async () => {
    const dir = await makeTmpDir();
    const store = new ShardedEventStore(dir);
    const event: Event = { timestamp: new Date('2024-02-02T00:00:00.000Z'), type: 'sharded', data: { v: 42 } };

    await store.appendEvent('abcd1234', 'data.jsonl', event);

    const loaded = await store.loadEvents('abcd1234', 'data.jsonl');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].data).toEqual({ v: 42 });
    expect(loaded[0].timestamp).toBeInstanceOf(Date);

    // The file must physically live under <base>/<first-2-chars>/<id>/<file>.
    const shardPath = path.join(dir, 'ab', 'abcd1234', 'data.jsonl');
    await expect(fs.access(shardPath)).resolves.toBeUndefined();

    await store.closeAll();
  });
});
