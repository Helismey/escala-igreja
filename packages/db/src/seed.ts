import { prisma } from './client.js';
import { hashPassword } from '@escala-igreja/domain';

export async function seedDatabase() {
  console.log('Iniciando seed do banco de dados fictício para desenvolvimento...');

  // 1. Configurações da Igreja
  await prisma.churchSettings.upsert({
    where: { id: 1 },
    update: {
      name: 'Igreja Esperança Viva',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
    },
    create: {
      id: 1,
      name: 'Igreja Esperança Viva',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
    },
  });

  const defaultPasswordHash = hashPassword('IgrejaForte123!');

  // 2. Administrador Geral (ADMIN_MASTER)
  await prisma.user.upsert({
    where: { email: 'admin@igreja.local' },
    update: {
      globalRole: 'ADMIN_MASTER',
      status: 'ACTIVE',
    },
    create: {
      name: 'Pastor Carlos Oliveira',
      email: 'admin@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'ADMIN_MASTER',
      status: 'ACTIVE',
      phonePrimary: '+5562990001111',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
      termsVersion: 'v1.0',
    },
  });

  // 3. Gestores
  const gestorLouvor = await prisma.user.upsert({
    where: { email: 'gestor.louvor@igreja.local' },
    update: {},
    create: {
      name: 'Roberto Louvor',
      email: 'gestor.louvor@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      status: 'ACTIVE',
      phonePrimary: '+5562990002222',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  const gestorRecepcao = await prisma.user.upsert({
    where: { email: 'gestor.recepcao@igreja.local' },
    update: {},
    create: {
      name: 'Mariana Recepção',
      email: 'gestor.recepcao@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      status: 'ACTIVE',
      phonePrimary: '+5562990003333',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 4. Membros Ativos
  const daniel = await prisma.user.upsert({
    where: { email: 'daniel@igreja.local' },
    update: {},
    create: {
      name: 'Daniel Bateria',
      email: 'daniel@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      status: 'ACTIVE',
      phonePrimary: '+5562990004444',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  const beatriz = await prisma.user.upsert({
    where: { email: 'beatriz@igreja.local' },
    update: {},
    create: {
      name: 'Beatriz Vocal',
      email: 'beatriz@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      status: 'ACTIVE',
      phonePrimary: '+5562990005555',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 5. Usuário Pendente de Aprovação
  await prisma.user.upsert({
    where: { email: 'paulo.pendente@igreja.local' },
    update: {},
    create: {
      name: 'Paulo Novo Convertido',
      email: 'paulo.pendente@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      status: 'PENDING',
      phonePrimary: '+5562990006666',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 6. Departamentos e Funções
  const deptLouvor = await prisma.department.upsert({
    where: { name: 'Louvor e Adoração' },
    update: {},
    create: { name: 'Louvor e Adoração' },
  });

  const funcVocal = await prisma.departmentFunction.upsert({
    where: { departmentId_name: { departmentId: deptLouvor.id, name: 'Vocal' } },
    update: {},
    create: { departmentId: deptLouvor.id, name: 'Vocal' },
  });

  const funcBateria = await prisma.departmentFunction.upsert({
    where: { departmentId_name: { departmentId: deptLouvor.id, name: 'Bateria' } },
    update: {},
    create: { departmentId: deptLouvor.id, name: 'Bateria' },
  });

  const deptRecepcao = await prisma.department.upsert({
    where: { name: 'Recepção e Boas-Vindas' },
    update: {},
    create: { name: 'Recepção e Boas-Vindas' },
  });

  const funcPorta = await prisma.departmentFunction.upsert({
    where: { departmentId_name: { departmentId: deptRecepcao.id, name: 'Porta Principal' } },
    update: {},
    create: { departmentId: deptRecepcao.id, name: 'Porta Principal' },
  });

  // Vínculos de Departamento e Funções
  await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: gestorLouvor.id, departmentId: deptLouvor.id } },
    update: { role: 'MANAGER' },
    create: { userId: gestorLouvor.id, departmentId: deptLouvor.id, role: 'MANAGER' },
  });

  await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: gestorRecepcao.id, departmentId: deptRecepcao.id } },
    update: { role: 'MANAGER' },
    create: { userId: gestorRecepcao.id, departmentId: deptRecepcao.id, role: 'MANAGER' },
  });

  const mbLouvorDaniel = await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: daniel.id, departmentId: deptLouvor.id } },
    update: {},
    create: { userId: daniel.id, departmentId: deptLouvor.id, role: 'MEMBER' },
  });

  await prisma.memberFunction.upsert({
    where: { memberId_functionId: { memberId: mbLouvorDaniel.id, functionId: funcBateria.id } },
    update: {},
    create: { memberId: mbLouvorDaniel.id, functionId: funcBateria.id },
  });

  const mbLouvorBeatriz = await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: beatriz.id, departmentId: deptLouvor.id } },
    update: {},
    create: { userId: beatriz.id, departmentId: deptLouvor.id, role: 'MEMBER' },
  });

  await prisma.memberFunction.upsert({
    where: { memberId_functionId: { memberId: mbLouvorBeatriz.id, functionId: funcVocal.id } },
    update: {},
    create: { memberId: mbLouvorBeatriz.id, functionId: funcVocal.id },
  });

  // Daniel também é membro da Recepção
  const mbRecDaniel = await prisma.departmentMember.upsert({
    where: { userId_departmentId: { userId: daniel.id, departmentId: deptRecepcao.id } },
    update: {},
    create: { userId: daniel.id, departmentId: deptRecepcao.id, role: 'MEMBER' },
  });

  await prisma.memberFunction.upsert({
    where: { memberId_functionId: { memberId: mbRecDaniel.id, functionId: funcPorta.id } },
    update: {},
    create: { memberId: mbRecDaniel.id, functionId: funcPorta.id },
  });

  // 7. Programa Inicial
  const progDate = new Date();
  progDate.setDate(progDate.getDate() + ((7 - progDate.getDay()) % 7 || 7)); // Próximo domingo
  progDate.setHours(9, 0, 0, 0);

  const prog = await prisma.program.create({
    data: {
      title: 'Culto de Celebração Dominical',
      date: progDate,
      departments: {
        create: [
          { departmentId: deptLouvor.id },
          { departmentId: deptRecepcao.id },
        ],
      },
      slots: {
        create: [
          {
            title: 'Bateria no Louvor',
            departmentId: deptLouvor.id,
            functionId: funcBateria.id,
            startsAt: new Date(new Date(progDate).setHours(9, 0, 0, 0)),
            endsAt: new Date(new Date(progDate).setHours(10, 30, 0, 0)),
            requiredCount: 1,
          },
          {
            title: 'Vocal Principal',
            departmentId: deptLouvor.id,
            functionId: funcVocal.id,
            startsAt: new Date(new Date(progDate).setHours(9, 0, 0, 0)),
            endsAt: new Date(new Date(progDate).setHours(10, 30, 0, 0)),
            requiredCount: 1,
          },
          {
            title: 'Recepção no Portão',
            departmentId: deptRecepcao.id,
            functionId: funcPorta.id,
            startsAt: new Date(new Date(progDate).setHours(8, 30, 0, 0)),
            endsAt: new Date(new Date(progDate).setHours(10, 45, 0, 0)),
            requiredCount: 2,
          },
        ],
      },
    },
  });

  console.log(`Seed concluído com sucesso! Programa criado: ${prog.title} (ID: ${prog.id})`);
}

// Execução direta via CLI se chamado como script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((err) => {
      console.error('Erro no seed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
