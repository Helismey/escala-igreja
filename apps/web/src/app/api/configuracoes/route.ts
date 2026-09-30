import { NextResponse } from 'next/server';
import { updateChurchSettingsSchema } from '@escala-igreja/contracts';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext } from '@/lib/auth-service';
import { can, validateChurchThemeColor } from '@escala-igreja/domain';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userContext = await getCurrentUserContext();

    if (!session || !userContext) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateChurchSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Dados inválidos' },
        { status: 400 }
      );
    }

    const allowed = can(userContext, 'church:settings:update');
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem atualizar as configurações da igreja' },
        { status: 403 }
      );
    }

    const contrastReport = validateChurchThemeColor(parsed.data.primaryColor);
    if (!contrastReport.passesWhiteText) {
      return NextResponse.json(
        {
          success: false,
          error: `O contraste da cor selecionada (${contrastReport.contrastWithWhite}:1) não atende aos requisitos de acessibilidade WCAG AA (mínimo 4.5:1).${contrastReport.suggestedHex ? ` Sugestão acessível: ${contrastReport.suggestedHex}` : ''}`,
          report: contrastReport
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.churchSettings.upsert({
        where: { id: 1 },
        update: {
          name: parsed.data.name,
          logoUrl: parsed.data.logoUrl || null,
          primaryColor: parsed.data.primaryColor,
          secondaryColor: parsed.data.secondaryColor,
        },
        create: {
          id: 1,
          name: parsed.data.name,
          logoUrl: parsed.data.logoUrl || null,
          primaryColor: parsed.data.primaryColor,
          secondaryColor: parsed.data.secondaryColor,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          action: 'CHURCH_SETTINGS_UPDATED',
          targetType: 'ChurchSettings',
          targetId: '1',
          result: 'SUCCESS',
          meta: {
            name: parsed.data.name,
            primaryColor: parsed.data.primaryColor,
          },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Erro ao atualizar configurações da igreja:', err);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configurações.' },
      { status: 500 }
    );
  }
}
