import { NextResponse } from 'next/server';
import { prisma } from '@revezo/db';

export async function GET() {
  try {
    const churches = await prisma.church.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return NextResponse.json({ success: true, churches });
  } catch (error) {
    console.error('Erro ao listar congregações públicas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar congregações' },
      { status: 500 }
    );
  }
}
