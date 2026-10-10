import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyMedia, decodeBase64Media, isMediaMessageType, parseRange, safeFileName } from '../lib/whatsapp-media';

describe('classifyMedia', () => {
  it('mostra na tela só tipos conhecidos de cada espécie', () => {
    assert.deepEqual(classifyMedia('image/jpeg', 'image'), { contentType: 'image/jpeg', inline: true });
    assert.deepEqual(classifyMedia('image/webp', 'sticker'), { contentType: 'image/webp', inline: true });
    assert.deepEqual(classifyMedia('audio/ogg; codecs=opus', 'audio'), { contentType: 'audio/ogg', inline: true });
    assert.deepEqual(classifyMedia('video/mp4', 'video'), { contentType: 'video/mp4', inline: true });
  });
  it('PDF é sempre download', () => {
    assert.deepEqual(classifyMedia('application/pdf', 'document'), { contentType: 'application/pdf', inline: false });
  });
  it('SVG, HTML e tipo trocado viram download genérico (nunca rodam na página)', () => {
    for (const [mime, kind] of [['image/svg+xml', 'image'], ['text/html', 'document'], ['text/html', 'image'], ['video/mp4', 'image'], [null, 'image'], ['', 'audio']] as const) {
      assert.deepEqual(classifyMedia(mime, kind), { contentType: 'application/octet-stream', inline: false }, `${mime}/${kind}`);
    }
  });
});

describe('isMediaMessageType', () => {
  it('só os tipos com arquivo', () => {
    for (const t of ['image', 'audio', 'video', 'document', 'sticker']) assert.equal(isMediaMessageType(t), true);
    for (const t of ['text', 'location', 'other']) assert.equal(isMediaMessageType(t), false);
  });
});

describe('decodeBase64Media', () => {
  it('aceita com e sem prefixo data:', () => {
    const b64 = Buffer.from('olá').toString('base64');
    assert.equal(decodeBase64Media(b64).toString(), 'olá');
    assert.equal(decodeBase64Media(`data:image/png;base64,${b64}`).toString(), 'olá');
  });
});

describe('parseRange', () => {
  it('sem cabeçalho ou ilegível: sem Range', () => {
    assert.equal(parseRange(null, 100), null);
    assert.equal(parseRange('items=0-5', 100), null);
    assert.equal(parseRange('bytes=-', 100), null);
  });
  it('intervalos comuns', () => {
    assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 });
    assert.deepEqual(parseRange('bytes=50-', 100), { start: 50, end: 99 });
    assert.deepEqual(parseRange('bytes=90-500', 100), { start: 90, end: 99 });
    assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  });
  it('fora do arquivo é inválido', () => {
    assert.equal(parseRange('bytes=100-', 100), 'invalid');
    assert.equal(parseRange('bytes=20-10', 100), 'invalid');
  });
});

describe('safeFileName', () => {
  it('tira o que quebraria o cabeçalho', () => {
    assert.equal(safeFileName('a"b/c\r\nd.pdf', 'x'), 'a_b_c__d.pdf');
    assert.equal(safeFileName('', 'arquivo-document'), 'arquivo-document');
    assert.equal(safeFileName(null, 'x'), 'x');
  });
});
