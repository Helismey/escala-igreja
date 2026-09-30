# Endurecimento do agente (Antigravity)

Configure as permissões do agente ANTES de começar a codar. Os nomes exatos das opções variam por versão; confira o painel de configurações do Antigravity e ajuste.

## Recomendações
- **Modo de execução**: pedir aprovação para comandos de terminal (evitar execução totalmente automática), principalmente para instalação de pacotes, migrations, `git push` e deploy.
- **Lista de bloqueio (deny) de comandos**: `cat .env*`, `printenv`, `env` com valores, `curl | bash`, `wget | sh`, `base64 -d | sh`, `sudo`, `rm -rf` fora de pastas de build, leitura de `~/.ssh`, `~/.aws`, `~/.config/gh`.
- **Lista de permissão (allow)**: `pnpm` (install, lint, typecheck, test, build, dev), `git` (status, diff, add, commit), `prisma` (generate, migrate dev em banco local).
- **Arquivos protegidos** (sem edição automática): `AGENTS.md`, `.agent/**`, `.github/**`, `.env*`, arquivos de configuração de MCP e hooks do git.
- **Rede**: liberar só registry de pacotes e documentação oficial; bloquear o resto, incluindo metadados de nuvem e localhost de outros serviços.
- **Navegador do agente**: não deixar logado em contas pessoais, banco, painel da hospedagem ou WhatsApp.
- **MCP e skills**: só instalar após revisão (skill seguranca-agente-ia). Sem servidores MCP com acesso a produção.
- **Banco**: o agente usa banco local/de desenvolvimento com seed fictício; nunca a URL de produção.
- **Repositório**: privado; verificar visibilidade antes de PR; branch protegida.

## Rotina
- Antes de cada sessão: confirmar que `.env` local só tem valores de desenvolvimento.
- Ao processar qualquer arquivo ou texto externo: protocolo da skill seguranca-agente-ia.
- Mensalmente: revisar skills/MCP instalados e permissões concedidas.

## Exemplo de arquivo de bloqueio (adaptar ao formato do Antigravity)
```
deny:
  - "cat .env*"
  - "printenv*"
  - "curl * | *"
  - "wget * | *"
  - "sudo *"
  - "edit AGENTS.md"
  - "edit .agent/**"
  - "edit .github/**"
  - "read .env*"
  - "read ~/.ssh/**"
  - "read ~/.aws/**"
```
