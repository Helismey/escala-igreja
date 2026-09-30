# Segurança: autenticação e sessão (sempre ativa)

**Senhas**
- Hash com Argon2id (ou bcrypt custo 12+). Nunca armazenar, logar ou enviar senha em texto.
- Mínimo de 12 caracteres; checar contra lista de senhas vazadas comuns; sem regras de composição absurdas.
- Troca e recuperação de senha por link de uso único, expira em 30 minutos, guardado apenas como hash.

**Login**
- Rate limit por IP e por conta (ex.: 5 tentativas em 15 min); bloqueio temporário progressivo; mensagem genérica ("e-mail ou senha incorretos") sem revelar se a conta existe.
- Cadastro: mesmas respostas para e-mail novo e existente (sem enumeração de usuários); status PENDENTE não acessa dados.
- MFA (TOTP) obrigatório para ADMIN_MASTER e recomendado para GESTOR.

**Sessão**
- Cookies `HttpOnly`, `Secure`, `SameSite=Lax` (ou Strict onde possível). ID de sessão aleatório de 256 bits.
- Sessão expira por inatividade (ex.: 30 min para admin/gestor, mais longa para membro) e tem duração absoluta máxima.
- Rotacionar sessão no login e na mudança de perfil. Logout invalida no servidor. Trocar senha encerra todas as outras sessões.

**Tokens (app mobile)**
- Access token curto (15 min) e refresh token com rotação e detecção de reuso; refresh guardado só como hash no banco; revogação por dispositivo.
- Nunca colocar token em URL, log ou `localStorage` no navegador.

**Links por token (confirmar presença, aprovar)**
- Token aleatório (32 bytes), armazenado como hash, com expiração, escopo único (uma ação, um assignment) e uso único. Não dão acesso a mais nada.
