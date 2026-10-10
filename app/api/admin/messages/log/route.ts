import { NextResponse } from 'next/server';
import type { Prisma } from '@/lib/generated/prisma';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';
import { getMessageType, isMessageChannel } from '@/lib/messages/registry';

const PAGE = 30;

// GET - Histórico de mensagens enviadas (filtros: days, type, channel, status, q; paginação por `before`)
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const params = new URL(request.url).searchParams;
  const days = Math.min(Math.max(Number(params.get('days')) || 30, 1), 90);
  const type = params.get('type');
  const channel = params.get('channel');
  const status = params.get('status');
  const q = params.get('q')?.trim();
  const before = params.get('before');

  const base: Prisma.MessageLogWhereInput = {
    createdAt: { gte: new Date(Date.now() - days * 86_400_000) },
    ...(type && getMessageType(type) ? { typeKey: type } : {}),
    ...(channel && isMessageChannel(channel) ? { channel } : {}),
    ...(q ? { customerName: { contains: q, mode: 'insensitive' } } : {}),
  };
  const where: Prisma.MessageLogWhereInput = {
    ...base,
    ...(status === 'sent' || status === 'failed' ? { status } : {}),
    ...(before && !Number.isNaN(Date.parse(before)) ? { createdAt: { gte: new Date(Date.now() - days * 86_400_000), lt: new Date(before) } } : {}),
  };
  try {
    const [rows, sent, failed] = await Promise.all([
      prisma.messageLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: PAGE + 1 }),
      prisma.messageLog.count({ where: { ...base, status: 'sent' } }),
      prisma.messageLog.count({ where: { ...base, status: 'failed' } }),
    ]);
    const items = rows.slice(0, PAGE).map((r) => ({
      id: r.id,
      typeKey: r.typeKey,
      typeName: getMessageType(r.typeKey)?.name ?? r.typeKey,
      channel: r.channel,
      customerId: r.customerId,
      customerName: r.customerName,
      recipient: r.recipient,
      status: r.status,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json(
      { items, summary: { sent, failed }, next: rows.length > PAGE ? items[items.length - 1].createdAt : null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error loading message log:', error);
    return NextResponse.json({ error: 'Erro ao carregar o histórico' }, { status: 500 });
  }
}
