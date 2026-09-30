import { NextResponse } from 'next/server';
import { createDepartmentSchema } from '@escala-igreja/contracts';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const allowed = can(userContext, 'department:create');
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem criar departamentos' },
        { status: 403 }
      );
    }

    const dept = await prisma.department.create({
      data: { name: parsed.data.name },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        action: 'DEPARTMENT_CREATED',
        targetType: 'Department',
        targetId: dept.id,
        result: 'SUCCESS',
        meta: { name: dept.name },
      },
    });

    return NextResponse.json({ success: true, departmentId: dept.id });
  } catch (err: unknown) {
    console.error('Erro ao criar departamento:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar departamento.' },
      { status: 500 }
    );
  }
}
