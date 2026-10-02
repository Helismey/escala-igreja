# ADR-006: Autenticação em dois fatores (MFA/TOTP) e códigos de recuperação

**Status:** Aceita | **Data:** 2026-09-30

## Contexto
O perfil `ADMIN_MASTER` possui acesso total aos dados cadastrais e escalas de voluntários da igreja, configurações gerais e aprovação de novos membros. O vazamento de credenciais de um administrador traria alto risco de exposição de dados pessoais sensíveis (LGPD) e desorganização das escalas. A regra 10 do projeto determina que MFA seja obrigatório para `ADMIN_MASTER` e opcional/recomendado para gestores e voluntários.

## Decisão
Implementar autenticação em dois fatores baseada no padrão de mercado TOTP (RFC 6238), compatível com qualquer aplicativo autenticador padrão (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden, etc.), acompanhada de códigos de recuperação de uso único.
O segredo Base32 gerado é armazenado no banco de dados criptografado em repouso com AES-256-GCM (`mfaSecretEnc`), e os 8 códigos de recuperação são armazenados exclusivamente como hashes SHA-256 (`mfaRecoveryCodes`). Códigos de recuperação são consumidos e invalidados no momento do uso.

## Opções consideradas
| Opção | Complexidade | Custo | Escala | Prós | Contras |
|---|---|---|---|---|---|
| **TOTP (RFC 6238) + Recovery Codes (Escolhida)** | Baixa/Média | R$ 0 | Ilimitada | Padrão aberto, funciona offline, custo zero, sem dependência de SMS/WhatsApp | Requer que o usuário tenha um aplicativo autenticador instalado |
| **Envio de código por SMS** | Média | Alto (custo por disparo) | Limitada | Familiar para usuários leigos | Custo proibitivo para igrejas sem fins lucrativos, risco de SIM swap |
| **Envio de código por WhatsApp** | Média | Médio | Média | Popularidade do aplicativo | Dependência de conectividade e custos de mensageria da Meta/provedor |
| **WebAuthn / Passkeys** | Alta | R$ 0 | Alta | Alta segurança contra phishing | Complexidade de fallback em múltiplos dispositivos móveis e desktops |

## Análise de trade-offs
A escolha do TOTP puro com algoritmo SHA-1 de 6 dígitos e período de 30 segundos com códigos de recuperação atende plenamente ao princípio de custo zero do projeto (sem tarifas de SMS ou API do WhatsApp), funciona mesmo sem sinal de internet no momento da geração do código no celular do voluntário e elimina o risco de interceptação de canal.

## Consequências
- **Mais fácil:** Garantir conformidade com o checklist pré-release e proteger a conta de administradores contra sequestro de conta por vazamento de senhas em outros serviços.
- **Mais difícil:** Exige suporte caso o administrador perca o aparelho e todos os 8 códigos de recuperação (nesse caso, outro `ADMIN_MASTER` precisará redefinir o MFA através da trilha de auditoria).
- **O que revisar:** Futuramente, avaliar suporte a WebAuthn (Passkeys / Biometria) como camada complementar em dispositivos móveis compatíveis.

## Ações
1. Atualizar o schema do Prisma adicionando o campo `mfaRecoveryCodes Json?` ao modelo `User`.
2. Adicionar testes unitários no pacote `@revezo/domain` para geração e consumo de recovery codes.
3. Criar rotas de API seguras para setup, ativação e desativação com validação de senha.
4. Integrar o desafio de MFA na tela de login e o painel de gerenciamento na tela de perfil do membro.
