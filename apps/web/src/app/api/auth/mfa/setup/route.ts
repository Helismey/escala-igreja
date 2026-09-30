import { NextResponse } from 'next/server';
import { getSession, startMfaSetup } from '@/lib/auth-service';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const result = await startMfaSetup(session.userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
