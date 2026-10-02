# Requisitos — Revezo

## Perfis
| Perfil | Permissões |
|---|---|
| ADMIN_MASTER | Tudo: usuários, departamentos, gestores, programas, aprovações, configurações da igreja (nome, logo, cores), canais de envio |
| GESTOR | Gerencia membros, funções, programas e escala dos departamentos em que é gestor; aprova trocas |
| MEMBRO | Vê a própria escala, define preferências e indisponibilidades, confirma, desmarca e pede troca |

Um usuário pode pertencer a vários departamentos, com papel diferente em cada um.

## Requisitos funcionais
1. Autocadastro com aprovação (status PENDENTE até aprovado por admin ou gestor).
2. Cadastro completo do membro: nome, foto, nascimento, sexo, estado civil, telefones (principal e secundário), WhatsApp, e-mail, endereço, contato de emergência, data de batismo ou entrada, canal preferido, observações.
3. Departamentos com funções internas e equipes (membros).
4. Programas com cronograma próprio (partes com horários). Na criação, escolher os departamentos envolvidos. Clonar programa para outras datas.
5. Escala manual e automática por slot (parte do programa + função).
6. Disponibilidade: dias preferidos e períodos indisponíveis.
7. Conflito: nunca sobrepor horários do mesmo usuário, entre departamentos.
8. Limite: no máximo 2 escalas por pessoa por dia; sem candidato, slot fica aberto e o gestor é alertado.
9. Lembretes 7, 2 e 1 dia antes; confirmação de presença por link.
10. Desmarcação: substituição automática com aviso ao substituto e ao gestor.
11. Painel: próximas escalas, slots abertos, sobrecarga e histórico de participação.
12. Tema da igreja: logo e cores configuráveis.

## Requisitos não funcionais
- Português do Brasil apenas.
- PWA responsivo: celular, tablet e desktop no navegador.
- Custo mensal alvo: R$ 0 a baixo custo; provedores trocáveis.
- Desempenho: telas principais abaixo de 2 s em celular médio; suporte a 50+ membros e crescimento.
- LGPD: consentimento, minimização, exportação e exclusão.
- Disponibilidade suficiente para uso semanal; backup periódico.

## Requisitos de segurança
Ver `.agent/rules/10` a `20` e `docs/security/`. Resumo: senhas Argon2id, MFA para admin, sessão segura, autorização por escopo no servidor, validação Zod, cabeçalhos de segurança, criptografia de campos sensíveis, auditoria somente-inserção, opt-out de notificações, backups testados, CI com auditoria de dependências e varredura de segredos, agente de IA com permissões restritas.

## Fora do escopo (por enquanto)
Check-in infantil, pequenos grupos, biblioteca de músicas, SMS ativo por padrão.

## Perguntas em aberto
- Um mesmo programa pode ter partes em horários simultâneos com equipes diferentes? (assumido: sim)
- Quem pode aprovar cadastros: só admin ou também gestor? (assumido: ambos, gestor só para seus departamentos)
- Número de WhatsApp dedicado: a providenciar.
