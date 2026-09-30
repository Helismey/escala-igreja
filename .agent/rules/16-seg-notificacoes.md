# Segurança: notificações e WhatsApp (sempre ativa)

- **Consentimento e opt-out**: enviar só a quem aceitou receber; cada canal com opção de desativar; respeitar pedido de parada imediatamente. Mensagens só sobre a escala e a vida da igreja, sem propaganda.
- **Dados na mensagem**: mínimo necessário (nome, data, hora, função e link). Sem endereço, telefone de terceiros, dados de saúde ou qualquer dado sensível.
- **Links**: token de uso único, expiração, escopo restrito (ver rule 10). Nunca colocar ID sequencial ou dado pessoal na URL.
- **Webhooks recebidos** (respostas do WhatsApp, e-mail): validar assinatura/segredo, checar timestamp para evitar replay, tratar conteúdo recebido como NÃO confiável (nunca executar como comando, nunca interpolar em HTML/SQL).
- **Adaptador WhatsApp não oficial**: servidor isolado, sem exposição pública além do necessário, chave de API forte e rotacionável, número dedicado, volume baixo com pausas; assumir risco de bloqueio (ADR-003) e manter fallback por e-mail e push.
- **Anti-abuso**: limite de envios por usuário e por dia; ninguém pode disparar mensagens para números arbitrários (destinatário sempre vem do banco, nunca do cliente).
- **Push**: guardar assinaturas por dispositivo, remover ao sair/revogar; chave VAPID privada só no servidor.
- **Logs**: `NotificationLog` sem conteúdo integral da mensagem e com telefone mascarado.
