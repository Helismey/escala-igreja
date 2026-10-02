import { NextResponse } from 'next/server';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const churchContext = await getActiveChurchContext();
    const activeChurchId = churchContext?.activeChurch?.id || userContext.churchId;

    const isGlobalOrElder =
      userContext.globalRole === 'ADMIN_MASTER' ||
      userContext.globalRole === 'PASTOR' ||
      userContext.globalRole === 'ELDER';

    // Se for líder comum, pega apenas os departamentos gerenciados
    const managedDeptIds = userContext.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId);

    if (!isGlobalOrElder && managedDeptIds.length === 0) {
      return NextResponse.json({ success: true, pendingAssignments: [] });
    }

    const pendingAssignments = await prisma.assignment.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        ...(!isGlobalOrElder ? { slot: { departmentId: { in: managedDeptIds } } } : {}),
        ...(activeChurchId ? { slot: { department: { churchId: activeChurchId } } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phonePrimary: true,
            photoUrl: true,
          },
        },
        slot: {
          include: {
            program: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            function: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        slot: {
          startsAt: 'asc',
        },
      },
    });

    return NextResponse.json({
      success: true,
      pendingAssignments: pendingAssignments.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        userId: a.userId,
        userName: a.user.name,
        userEmail: a.user.email,
        userPhone: a.user.phonePrimary,
        userPhoto: a.user.photoUrl,
        slotId: a.slot.id,
        slotTitle: a.slot.title,
        startsAt: a.slot.startsAt.toISOString(),
        endsAt: a.slot.endsAt.toISOString(),
        departmentId: a.slot.department.id,
        departmentName: a.slot.department.name,
        functionId: a.slot.function?.id || null,
        functionName: a.slot.function?.name || null,
        programId: a.slot.program.id,
        programTitle: a.slot.program.title,
        programDate: a.slot.program.date.toISOString(),
      })),
    });
  } catch (err: unknown) {
    console.error('Erro ao listar escalas pendentes de aprovação:', err);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro ao listar as aprovações pendentes' },
      { status: 500 }
    );
  }
}
