import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-service';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado.' },
        { status: 401 }
      );
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY || null;

    return NextResponse.json({
      success: true,
      publicKey,
    });
  } catch (error: unknown) {
    console.error('[API Push Public Key] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Falha interna ao obter chave pública de push.' },
      { status: 500 }
    );
  }
}
