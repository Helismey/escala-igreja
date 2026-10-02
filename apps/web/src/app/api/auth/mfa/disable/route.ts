import { NextRequest, NextResponse } from 'next/server';
import { getSession, disableMfa } from '@/lib/auth-service';
import { mfaDisableSchema } from '@revezo/contracts';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = mfaDisableSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'Dados inválidos';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const result = await disableMfa(session.userId, parsed.data.password, clientIp);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
