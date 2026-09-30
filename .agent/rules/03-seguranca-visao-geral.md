# Segurança — visão geral (sempre ativa)

Índice das regras de segurança. Todas são obrigatórias e valem para toda tarefa.

| Frente | Regra |
|---|---|
| Autenticação e sessão | `10-seg-autenticacao.md` |
| Autorização (perfis, escopo por departamento) | `11-seg-autorizacao.md` |
| Web: entrada, saída, cabeçalhos, uploads | `12-seg-web-entrada-saida.md` |
| Dados, criptografia, banco, LGPD | `13-seg-dados-criptografia.md` |
| Segredos e configuração | `14-seg-segredos-config.md` |
| Dependências, CI/CD, supply chain | `15-seg-dependencias-cicd.md` |
| Notificações e WhatsApp | `16-seg-notificacoes.md` |
| Mobile (Capacitor) | `17-seg-mobile.md` |
| Agente de IA (Antigravity) | `18-seg-agente-ia.md` |
| Logs e auditoria | `19-seg-logs-auditoria.md` |
| Incidentes | `20-seg-incidentes.md` |

Princípios: negar por padrão; privilégio mínimo; validar sempre no servidor; nunca confiar em entrada (formulário, CSV, URL, texto de membro, resposta de API externa); segredos nunca no código nem no contexto do agente; defesa em profundidade.
Em dúvida sobre segurança, PARE e pergunte ao responsável. Dado pessoal de membro é sensível para a igreja e protegido pela LGPD.
