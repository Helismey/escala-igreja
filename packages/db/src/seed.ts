import { prisma } from './client.js';
import { hashPassword } from '@escala-igreja/domain';

export async function seedDatabase() {
  console.log('Iniciando seed do banco de dados fictício com suporte multi-igreja e hierarquia...');

  // 1. Configurações Legadas (ChurchSettings)
  await prisma.churchSettings.upsert({
    where: { id: 1 },
    update: {
      name: 'Igreja Esperança Viva - Central',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
    },
    create: {
      id: 1,
      name: 'Igreja Esperança Viva - Central',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
    },
  });

  // 2. Igrejas (Multi-tenant)
  const igrejaCentral = await prisma.church.upsert({
    where: { slug: 'esperanca-viva-central' },
    update: {
      name: 'Igreja Esperança Viva - Central',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
    },
    create: {
      name: 'Igreja Esperança Viva - Central',
      slug: 'esperanca-viva-central',
      primaryColor: '#0F4C5C',
      secondaryColor: '#F2B632',
      address: {
        logradouro: 'Av. Principal',
        numero: '1000',
        bairro: 'Centro',
        cidade: 'Goiânia',
        uf: 'GO',
        cep: '74000-000',
      },
      phone: '+556230001000',
    },
  });

  const igrejaBairroNovo = await prisma.church.upsert({
    where: { slug: 'esperanca-viva-bairro-novo' },
    update: {
      name: 'Igreja Esperança Viva - Bairro Novo',
      primaryColor: '#1E3A8A',
      secondaryColor: '#10B981',
    },
    create: {
      name: 'Igreja Esperança Viva - Bairro Novo',
      slug: 'esperanca-viva-bairro-novo',
      primaryColor: '#1E3A8A',
      secondaryColor: '#10B981',
      address: {
        logradouro: 'Rua das Palmeiras',
        numero: '250',
        bairro: 'Bairro Novo',
        cidade: 'Goiânia',
        uf: 'GO',
        cep: '74000-500',
      },
      phone: '+556230002000',
    },
  });

  const defaultPasswordHash = hashPassword('IgrejaForte123!');

  // 3. Administrador Geral Técnico (ADMIN_MASTER)
  const adminMaster = await prisma.user.upsert({
    where: { email: 'admin@igreja.local' },
    update: {
      globalRole: 'ADMIN_MASTER',
      status: 'ACTIVE',
    },
    create: {
      name: 'Admin Técnico Master',
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

  // 4. Pastor Master Multi-Igreja (PASTOR)
  const pastorCarlos = await prisma.user.upsert({
    where: { email: 'pastor@igreja.local' },
    update: {
      globalRole: 'PASTOR',
      status: 'ACTIVE',
    },
    create: {
      name: 'Pastor Carlos Oliveira',
      email: 'pastor@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'PASTOR',
      status: 'ACTIVE',
      phonePrimary: '+5562990001234',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
      termsVersion: 'v1.0',
    },
  });

  // Vincula o Pastor Carlos às duas congregações
  await prisma.pastorChurch.upsert({
    where: { pastorId_churchId: { pastorId: pastorCarlos.id, churchId: igrejaCentral.id } },
    update: {},
    create: { pastorId: pastorCarlos.id, churchId: igrejaCentral.id },
  });

  await prisma.pastorChurch.upsert({
    where: { pastorId_churchId: { pastorId: pastorCarlos.id, churchId: igrejaBairroNovo.id } },
    update: {},
    create: { pastorId: pastorCarlos.id, churchId: igrejaBairroNovo.id },
  });

  // 5. Anciãos Locais (ELDER) - 1 igreja única por ancião
  const anciaoCentral = await prisma.user.upsert({
    where: { email: 'anciao.central@igreja.local' },
    update: {
      globalRole: 'ELDER',
      churchId: igrejaCentral.id,
      appointedById: pastorCarlos.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Ancião Marcos Central',
      email: 'anciao.central@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'ELDER',
      churchId: igrejaCentral.id,
      appointedById: pastorCarlos.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990007777',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  const anciaoBairroNovo = await prisma.user.upsert({
    where: { email: 'anciao.bairronovo@igreja.local' },
    update: {
      globalRole: 'ELDER',
      churchId: igrejaBairroNovo.id,
      appointedById: pastorCarlos.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Ancião Lucas Bairro Novo',
      email: 'anciao.bairronovo@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'ELDER',
      churchId: igrejaBairroNovo.id,
      appointedById: pastorCarlos.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990008888',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 6. Gestores (Líderes de Departamento) na Igreja Central
  const gestorLouvor = await prisma.user.upsert({
    where: { email: 'gestor.louvor@igreja.local' },
    update: {
      churchId: igrejaCentral.id,
    },
    create: {
      name: 'Roberto Louvor',
      email: 'gestor.louvor@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      churchId: igrejaCentral.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990002222',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  const gestorRecepcao = await prisma.user.upsert({
    where: { email: 'gestor.recepcao@igreja.local' },
    update: {
      churchId: igrejaCentral.id,
    },
    create: {
      name: 'Mariana Recepção',
      email: 'gestor.recepcao@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      churchId: igrejaCentral.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990003333',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 7. Membros Ativos na Igreja Central
  const daniel = await prisma.user.upsert({
    where: { email: 'daniel@igreja.local' },
    update: {
      churchId: igrejaCentral.id,
    },
    create: {
      name: 'Daniel Bateria',
      email: 'daniel@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      churchId: igrejaCentral.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990004444',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  const beatriz = await prisma.user.upsert({
    where: { email: 'beatriz@igreja.local' },
    update: {
      churchId: igrejaCentral.id,
    },
    create: {
      name: 'Beatriz Vocal',
      email: 'beatriz@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      churchId: igrejaCentral.id,
      status: 'ACTIVE',
      phonePrimary: '+5562990005555',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 8. Usuário Pendente de Aprovação na Igreja Central
  await prisma.user.upsert({
    where: { email: 'paulo.pendente@igreja.local' },
    update: {
      churchId: igrejaCentral.id,
    },
    create: {
      name: 'Paulo Novo Convertido',
      email: 'paulo.pendente@igreja.local',
      passwordHash: defaultPasswordHash,
      globalRole: 'USER',
      churchId: igrejaCentral.id,
      status: 'PENDING',
      phonePrimary: '+5562990006666',
      preferredChannel: 'WHATSAPP',
      termsAcceptedAt: new Date(),
    },
  });

  // 9. Departamentos e Funções vinculados à Igreja Central
  const deptLouvor = await prisma.department.upsert({
    where: { churchId_name: { churchId: igrejaCentral.id, name: 'Louvor e Adoração' } },
    update: {
      createdByRole: 'PASTOR',
      createdById: pastorCarlos.id,
    },
    create: {
      churchId: igrejaCentral.id,
      name: 'Louvor e Adoração',
      createdByRole: 'PASTOR',
      createdById: pastorCarlos.id,
    },
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
    where: { churchId_name: { churchId: igrejaCentral.id, name: 'Recepção e Boas-Vindas' } },
    update: {
      createdByRole: 'PASTOR',
      createdById: pastorCarlos.id,
    },
    create: {
      churchId: igrejaCentral.id,
      name: 'Recepção e Boas-Vindas',
      createdByRole: 'PASTOR',
      createdById: pastorCarlos.id,
    },
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

  // 10. Programa Pastoral na Igreja Central (com marca hierárquica PASTOR)
  const progDate = new Date();
  progDate.setDate(progDate.getDate() + ((7 - progDate.getDay()) % 7 || 7)); // Próximo domingo
  progDate.setHours(9, 0, 0, 0);

  const prog = await prisma.program.create({
    data: {
      churchId: igrejaCentral.id,
      title: 'Culto de Celebração Dominical',
      date: progDate,
      createdByRole: 'PASTOR',
      createdById: pastorCarlos.id,
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

  console.log(`Seed concluído com sucesso!`);
  console.log(`- Igreja Central (ID: ${igrejaCentral.id})`);
  console.log(`- Igreja Bairro Novo (ID: ${igrejaBairroNovo.id})`);
  console.log(`- Admin Master (ID: ${adminMaster.id})`);
  console.log(`- Pastor Carlos vinculado às duas congregações (ID: ${pastorCarlos.id})`);
  console.log(`- Ancião Marcos Central (ID: ${anciaoCentral.id})`);
  console.log(`- Ancião Lucas Bairro Novo (ID: ${anciaoBairroNovo.id})`);
  console.log(`- Programa criado: ${prog.title} (com autoria hierárquica PASTOR)`);
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
