import { NextResponse } from 'next/server';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';
import { can, sanitizeCsvCell } from '@escala-igreja/domain';

function escapeCsvCell(val: string | null | undefined): string {
  const sanitized = sanitizeCsvCell(val || '');
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();
    const { activeChurch } = await getActiveChurchContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 401 });
    }

    if (!can(userContext, 'member:export', { churchId: activeChurch?.id })) {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para exportar a lista de voluntários desta congregação' },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING'] },
        ...(activeChurch ? { churchId: activeChurch.id } : {}),
      },
      include: {
        memberships: {
          include: {
            department: true,
            functions: {
              include: { function: true },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const headers = [
      'Nome',
      'E-mail',
      'Telefone',
      'WhatsApp',
      'Departamentos',
      'Funcoes',
      'Menor de Idade',
      'Responsavel',
      'Telefone do Responsavel',
      'Status',
    ];

    const rows = members.map((m) => {
      const depts = m.memberships.map((mem) => mem.department.name).join('; ');
      const funcs = m.memberships
        .flatMap((mem) => mem.functions.map((f) => f.function.name))
        .join('; ');

      return [
        escapeCsvCell(m.name),
        escapeCsvCell(m.email),
        escapeCsvCell(m.phonePrimary || ''),
        escapeCsvCell(m.whatsapp || ''),
        escapeCsvCell(depts),
        escapeCsvCell(funcs),
        escapeCsvCell(m.isMinor ? 'Sim' : 'Não'),
        escapeCsvCell(m.guardianName || ''),
        escapeCsvCell(m.guardianPhone || ''),
        escapeCsvCell(m.status === 'ACTIVE' ? 'Ativo' : 'Pendente'),
      ].join(',');
    });

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        churchId: activeChurch?.id,
        action: 'MEMBERS_EXPORTED',
        targetType: 'User',
        targetId: 'export',
        result: 'SUCCESS',
        ip: clientIp,
        meta: {
          exportedCount: members.length,
        },
      },
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="voluntarios-escala-${dateStr}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao exportar membros';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
