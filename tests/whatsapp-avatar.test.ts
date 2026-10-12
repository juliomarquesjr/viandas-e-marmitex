import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { avatarContentType, isAllowedAvatarUrl } from '../lib/whatsapp-avatar';
import { formatTime } from '../app/admin/whatsapp/components/VideoPlayer';

describe('endereço da foto de perfil do WhatsApp', () => {
  it('aceita os servidores do WhatsApp por https', () => {
    assert.equal(isAllowedAvatarUrl('https://pps.whatsapp.net/v/t61.24694-24/abc.jpg?ccb=11', false), true);
    assert.equal(isAllowedAvatarUrl('https://media.whatsapp.net/x.jpg', false), true);
    assert.equal(isAllowedAvatarUrl('https://scontent.xx.fbcdn.net/x.jpg', false), true);
  });
  it('recusa qualquer outro lugar (o servidor nunca busca endereço interno)', () => {
    for (const url of ['http://pps.whatsapp.net/x.jpg', 'https://evil.com/x.jpg', 'https://whatsapp.net.evil.com/x.jpg', 'https://evilwhatsapp.net/x.jpg', 'https://localhost/x.jpg', 'http://127.0.0.1:8080/x', 'http://169.254.169.254/latest/meta-data', 'https://user:senha@pps.whatsapp.net/x.jpg', 'file:///etc/passwd', 'javascript:alert(1)', 'lixo', '']) {
      assert.equal(isAllowedAvatarUrl(url, false), false, url);
    }
  });
  it('em desenvolvimento o localhost vale (para testar com a Evolution de mentira)', () => {
    assert.equal(isAllowedAvatarUrl('http://localhost:8099/perfil.jpg', true), true);
    assert.equal(isAllowedAvatarUrl('http://169.254.169.254/x', true), false);
  });
  it('só repassa imagem comum, sem SVG nem HTML', () => {
    assert.equal(avatarContentType('image/jpeg'), 'image/jpeg');
    assert.equal(avatarContentType('image/PNG; charset=binary'), 'image/png');
    assert.equal(avatarContentType('image/webp'), 'image/webp');
    for (const t of ['image/svg+xml', 'text/html', 'application/octet-stream', '', null, undefined]) assert.equal(avatarContentType(t as string | null | undefined), null);
  });
});

describe('tempo do player de vídeo', () => {
  it('escreve minutos e segundos', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(5.9), '0:05');
    assert.equal(formatTime(65), '1:05');
    assert.equal(formatTime(3723), '1:02:03');
  });
  it('valor estranho vira 0:00', () => {
    assert.equal(formatTime(NaN), '0:00');
    assert.equal(formatTime(-3), '0:00');
    assert.equal(formatTime(Infinity), '0:00');
  });
});
