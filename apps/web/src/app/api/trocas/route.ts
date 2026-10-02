import { NextResponse } from 'next/server';
import { prisma } from '@revezo/db';
import { getSession, getCurrentUserContext, getActiveChurchContext } from '@/lib/auth-service';

export async function GET() {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.userId;
    const isAdmin = userContext.globalRole === 'ADMIN_MASTER';
    const managedDeptIds = userContext.departmentMemberships
      .filter((m) => m.role === 'MANAGER')
      .map((m) => m.departmentId);

    // Departamentos aos quais o usuário pertence
    const myDeptIds = userContext.departmentMemberships.map((m) => m.departmentId);

    // 1. Pedidos solicitados pelo próprio usuário
    const solicitadas = await prisma.swapRequest.findMany({
      where: { requesterId: userId },
      include: {
        assignment: {
          include: {
            slot: {
              include: {
                program: true,
                department: true,
                function: true,
              },
            },
          },
        },
        targetUser: {
          select: { id: true, name: true, photoUrl: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Pedidos recebidos direcionados ao usuário ou abertos para os departamentos dele
    const recebidas = await prisma.swapRequest.findMany({
      where: {
        status: 'PENDING_TARGET',
        requesterId: { not: userId },
        OR: [
          { targetUserId: userId },
          {
            targetUserId: null,
            assignment: {
              slot: {
                departmentId: { in: myDeptIds },
              },
            },
          },
        ],
      },
      include: {
        requester: {
          select: { id: true, name: true, photoUrl: true },
        },
        assignment: {
          include: {
            slot: {
              include: {
                program: true,
                department: true,
                function: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Pedidos aguardando aprovação do gestor / ancião / pastor
    let paraAprovacao: typeof solicitadas = [];
    const isPastor = userContext.globalRole === 'PASTOR';
    const isElder = userContext.globalRole === 'ELDER';

    if (isAdmin || isPastor || isElder || managedDeptIds.length > 0) {
      const { activeChurch } = await getActiveChurchContext();
      let churchFilter: any = {};

      if (activeChurch) {
        if (
          isAdmin ||
          (isPastor && Boolean(userContext.pastorChurchIds?.includes(activeChurch.id))) ||
          (isElder && userContext.churchId === activeChurch.id)
        ) {
          churchFilter = {
            assignment: {
              slot: {
                department: {
                  churchId: activeChurch.id,
                },
              },
            },
          };
        } else if (managedDeptIds.length > 0) {
          churchFilter = {
            assignment: {
              slot: {
                departmentId: { in: managedDeptIds },
                department: {
                  churchId: activeChurch.id,
                },
              },
            },
          };
        }
      } else {
        if (isPastor) {
          churchFilter = {
            assignment: {
              slot: {
                department: {
                  churchId: { in: userContext.pastorChurchIds || [] },
                },
              },
            },
          };
        } else if (isElder) {
          churchFilter = {
            assignment: {
              slot: {
                department: {
                  churchId: userContext.churchId,
                },
              },
            },
          };
        } else if (!isAdmin) {
          churchFilter = {
            assignment: {
              slot: {
                departmentId: { in: managedDeptIds },
              },
            },
          };
        }
      }

      paraAprovacao = await prisma.swapRequest.findMany({
        where: {
          status: 'PENDING_MANAGER',
          ...churchFilter,
        },
        include: {
          requester: {
            select: { id: true, name: true, photoUrl: true },
          },
          targetUser: {
            select: { id: true, name: true, photoUrl: true },
          },
          assignment: {
            include: {
              slot: {
                include: {
                  program: true,
                  department: true,
                  function: true,
                },
              },
            },
          },
          reviewedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }) as any;
    }

    return NextResponse.json({
      success: true,
      data: {
        solicitadas,
        recebidas,
        paraAprovacao,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao listar pedidos de troca';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
