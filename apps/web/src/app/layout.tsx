import type { Metadata, Viewport } from 'next';
import './globals.css';
import { prisma } from '@escala-igreja/db';
import { getSession, getCurrentUserContext, clearSession } from '@/lib/auth-service';
import { getAuthorizedMenuItems, getMobileNavigation, MenuBadgeCounts } from '@escala-igreja/domain';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Escala Igreja',
  description: 'Sistema web de escalas de departamentos para igrejas',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F4C5C',
};

async function logoutAction() {
  'use server';
  await clearSession();
  redirect('/login');
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Configurações da Igreja
  let churchName = 'Escala Igreja';
  let primaryColor = '#0F4C5C';

  try {
    const settings = await prisma.churchSettings.findFirst();
    if (settings) {
      churchName = settings.name;
      primaryColor = settings.primaryColor;
    }
  } catch {
    // Fallback se o banco não estiver configurado ainda
  }

  // 2. Contexto de usuário autenticado
  const session = await getSession();
  const userContext = await getCurrentUserContext();

  const authorizedItems = userContext ? getAuthorizedMenuItems(userContext) : [];
  const { bottomBar, moreSheet } = userContext ? getMobileNavigation(userContext) : { bottomBar: [], moreSheet: [] };

  // 3. Contadores de Badges
  const badgeCounts: MenuBadgeCounts = {
    pendingApprovals: 0,
    openSlots: 0,
    unconfirmed: 0,
  };

  if (session && userContext) {
    try {
      // Se for gestor ou admin, calcula aprovações pendentes
      if (userContext.globalRole === 'ADMIN_MASTER') {
        badgeCounts.pendingApprovals = await prisma.user.count({
          where: { status: 'PENDING' },
        });
      }

      // Escalas não confirmadas do usuário
      badgeCounts.unconfirmed = await prisma.assignment.count({
        where: {
          userId: session.userId,
          status: 'PENDING',
        },
      });
    } catch {
      // Ignora erro de consulta em caso de falha de conexão inicial
    }
  }

  return (
    <html lang="pt-BR" style={{ '--color-primary': primaryColor } as React.CSSProperties}>
      <body className="min-h-screen flex flex-col bg-bg text-ink antialiased">
        {session && (
          <Navbar
            churchName={churchName}
            userName={session.name}
            userRole={userContext?.departmentMemberships.some((m) => m.role === 'MANAGER') ? 'MANAGER' : session.globalRole}
            items={authorizedItems}
            badgeCounts={badgeCounts}
            onLogout={logoutAction}
          />
        )}

        <div className={`flex-1 flex flex-col ${session ? 'md:pl-64' : ''}`}>
          <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${session ? 'pb-24 md:pb-8' : ''}`}>
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>
        </div>

        {session && bottomBar.length > 0 && (
          <MobileBottomNav
            primaryItems={bottomBar}
            moreItems={moreSheet}
            badgeCounts={badgeCounts}
            onLogout={logoutAction}
          />
        )}
      </body>
    </html>
  );
}
