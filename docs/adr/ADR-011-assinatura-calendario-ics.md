# ADR-011: Exportação e Assinatura de Calendário (.ics / webcal)

**Status:** Aceita | **Data:** 2026-09-30

## Contexto
Voluntários utilizam aplicativos de calendário pessoal (Google Agenda, Apple Calendar, Microsoft Outlook) e desejam que suas escalas de serviço na igreja apareçam automaticamente em suas agendas, sem exigir sincronização manual semanal.

Requisitos de segurança e privacidade (Regras 10, 13 e 16):
- Não expor dados pessoais de terceiros nem dados sensíveis da igreja.
- Não utilizar identificadores sequenciais nem URLs previsíveis.
- O link de assinatura do calendário deve ser gerado com token aleatório criptográfico (32 bytes) com hash SHA-256 no banco (`ActionToken` com `purpose: 'CALENDAR_FEED'`), de escopo restrito estritamente às escalas daquele membro específico.
- O token deve ser revogável e regenerável a qualquer momento pelo próprio voluntário em sua tela de perfil ou minhas escalas.

## Decisão
1. **Formato iCalendar RFC 5545:** Implementar gerador puro de `.ics` em `@escala-igreja/domain` com fuso horário `America/Sao_Paulo`, campos devidamente escapados, UID determinístico por escala e suporte a atualizações (escalas desmarcadas são excluídas do feed).
2. **Rota do feed seguro:** `/api/calendario/[token].ics`, que busca as escalas ativas do voluntário cujo token corresponder ao hash SHA-256 no banco.
3. **Download estático vs. Assinatura dinâmica:** A interface oferecerá duas opções ao voluntário:
   - Baixar arquivo `.ics` pontual.
   - Copiar link de assinatura dinâmica (`webcal://...` ou `https://...`) para sincronização automática.

## Consequências
- **Mais fácil:** Voluntários têm visão unificada de seus compromissos no calendário nativo do celular (iOS/Android) sem necessidade de baixar novos aplicativos.
- **Mais difícil:** Aplicativos de calendário de terceiros têm intervalos variáveis de atualização (ex.: Google Agenda pode levar até 24h para atualizar o feed).
