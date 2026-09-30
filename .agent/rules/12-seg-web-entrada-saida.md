# Segurança: web, entrada e saída (sempre ativa)

**Entrada**
- Validar TUDO no servidor com Zod, por lista de permissão (formato, tamanho, tipo). Normalizar telefone (E.164) e e-mail.
- Banco só por Prisma com consultas parametrizadas. Proibido montar SQL por concatenação; se usar `$queryRaw`, somente com template parametrizado.
- Sem `eval`, `child_process` com entrada de usuário, nem leitura de arquivo por caminho vindo do cliente (path traversal).
- Buscas de URL do servidor (SSRF): só domínios em lista de permissão; bloquear IPs internos e metadados de nuvem.

**Saída**
- Escape padrão do React; proibido `dangerouslySetInnerHTML` sem sanitização aprovada. Nada de HTML vindo de campos de membro ("observações", "nome").
- Mensagens de erro ao usuário genéricas; stack trace nunca em produção.

**CSRF e CORS**
- Server Actions com verificação de origem; rotas mutáveis exigem token CSRF ou `SameSite` + checagem de `Origin`. CORS com lista explícita de origens (nunca `*` com credenciais).

**Cabeçalhos (produção)**
- `Content-Security-Policy` restritiva (sem `unsafe-inline` se possível, com nonce), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínima, `frame-ancestors 'none'`.
- HTTPS obrigatório; cookies `Secure`.

**Uploads (fotos e logo)**
- Aceitar só imagem (jpeg, png, webp), verificando o conteúdo real (magic bytes), não só a extensão; limite de tamanho (ex.: 2 MB); reprocessar/redimensionar no servidor e remover metadados EXIF (inclui GPS).
- Nome de arquivo gerado pelo servidor; armazenamento fora do diretório público do app, com URL assinada e expiração.
- Logo: SVG proibido (pode conter script).

**Abuso**
- Rate limit em login, cadastro, recuperação de senha, upload e endpoints públicos. Proteção anti-bot no cadastro.
