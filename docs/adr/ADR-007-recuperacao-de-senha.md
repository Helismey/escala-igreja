# ADR-007: Recuperação de Senha Segura com ActionToken e Prevenção de Enumeração

**Status:** Aceita | **Data:** 2026-09-30

## Contexto
O sistema armazena informações de membros e gestores de ministérios da igreja. O processo de recuperação de credenciais esquecidas é um dos alvos primários de ataques de enumeração de contas, injeção de credenciais e sequestro de sessão. Conforme a regra 10 (`10-seg-autenticacao.md`) e o checklist pré-release (`docs/security/checklist-pre-release.md`), a recuperação de senha deve ser protegida contra força bruta, vazamentos de tokens e enumeração de usuários cadastrados.

## Decisão
1. **Prevenção de Enumeração:** O endpoint de solicitação de recuperação de senha sempre responde com status HTTP 200 e a mesma mensagem neutra ("Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes"), independentemente de o e-mail existir, não existir ou estar pendente/inativo.
2. **Tokens de Ação em Repouso:** Os tokens de redefinição são gerados como strings aleatórias criptográficas de 32 bytes (64 caracteres hexadecimais). O banco de dados armazena unicamente o hash SHA-256 do token na tabela `ActionToken` com o propósito `PASSWORD_RESET`. Mesmo em caso de vazamento ou dump do banco, nenhum token de redefinição pode ser utilizado diretamente.
3. **Validade e Consumo Atômico:** O token tem validade máxima de 30 minutos e uso estritamente único. No momento da redefinição, a operação marca `usedAt = now()` dentro de uma transação atômica.
4. **Encerramento de Sessões Anteriores:** Ao redefinir a senha com sucesso, todas as sessões e tokens de renovação (`RefreshToken`) atrelados ao usuário são imediatamente revogados, garantindo que sessões antigas ou roubadas sejam derrubadas.
5. **Auditoria:** Toda solicitação e conclusão de redefinição é gravada de forma imutável em `AuditLog`, registrando IP e resultado sem expor dados pessoais completos.

## Opções consideradas
| Opção | Complexidade | Segurança | Experiência do Usuário | Decisão |
|---|---|---|---|---|
| **Token aleatório de 32 bytes + Hash SHA-256 no banco (Escolhida)** | Baixa/Média | Altíssima (banco não guarda o segredo puro, uso único) | Excelente (link direto no e-mail) | **Adotada** |
| **Código numérico de 6 dígitos** | Baixa | Baixa/Média (vulnerável a ataques de força bruta se rate limit falhar) | Média (usuário precisa copiar/colar código) | Rejeitada para recuperação por link |
| **Token armazenado em texto puro no banco** | Muito Baixa | Péssima (vazamento do banco compromete todas as contas em redefinição) | Idêntica à escolhida | Rejeitada (viola regra 10) |
| **Envio de nova senha temporária gerada pelo servidor** | Baixa | Ruim (trafega senha em texto e obriga troca no primeiro login) | Ruim | Rejeitada |

## Consequências
- **Mais fácil:** Cumprir o checklist de segurança pré-release, revogar tokens expirados e evitar enumeração de contas.
- **Mais difícil:** Requer ambiente com serviço de mensageria configurado para entrega de e-mails em produção; em desenvolvimento local, o link gerado com o token é registrado com segurança no log do servidor.
- **O que revisar:** Na Fase 2 (Comunicação), integrar o envio do link através do adaptador de e-mail e mensageria assíncrona.

## Ações
1. Definir os schemas de validação Zod no pacote `@revezo/contracts`.
2. Implementar funções puras de hashing e validação temporal em `@revezo/domain`.
3. Adicionar testes unitários rigorosos no `@revezo/domain`.
4. Implementar funções de transação segura em `@revezo/db`.
5. Criar endpoints de API e interfaces de usuário responsivas em `apps/web`.
