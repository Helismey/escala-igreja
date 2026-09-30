import React from 'react';
import { prisma, verifyConfirmationToken } from '@escala-igreja/db';
import ConfirmarClient from './ConfirmarClient';

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const church = await prisma.churchSettings.findFirst();
  const churchInfo = {
    name: church?.name || 'Igreja',
    logoUrl: church?.logoUrl || null,
    primaryColor: church?.primaryColor || '#1E40AF',
  };

  const verification = await verifyConfirmationToken(token);

  if (!verification.valid) {
    return (
      <ConfirmarClient
        initialData={null}
        error={verification.message || 'Link inválido ou expirado.'}
        church={churchInfo}
      />
    );
  }

  return (
    <ConfirmarClient
      initialData={verification.data}
      error={null}
      church={churchInfo}
    />
  );
}
