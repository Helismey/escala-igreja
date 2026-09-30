# ADR-009: Algoritmo de derivação de chave de senha (scrypt)

**Status:** Aprovada | **Data:** 2026-09-30

## Contexto
O sistema armazena credenciais de acesso de administradores, gestores e voluntários da igreja.
O roadmap e o checklist de segurança exigem funções de derivação de chave seguras com resistência a ataques de força bruta por GPU/ASIC (memory-hard), salt criptográfico e comparação em tempo constante para evitar vazamentos por canais laterais (timing attacks).
O ecossistema Node.js oferece `scrypt` nativo no módulo `crypto`, enquanto `argon2` e `bcrypt` requerem compilação de binários nativos em C/C++ ou dependências externas pesadas que frequentemente causam atritos em deploys serverless/PaaS gratuitos (Vercel, Supabase Functions, Alpine containers).

## Decisão
Adotar a função `scrypt` nativa do módulo `crypto` do Node.js (`N=16384`, `r=8`, `p=1`, chave derivada de 64 bytes) com salt aleatório criptográfico de 16 bytes e verificação via `crypto.timingSafeEqual()`.

## Parâmetros e Propriedades
1. **Dureza de memória (Memory-hardness):** O custo de memória de 32 MB por derivação neutraliza ataques massivos paralelos via GPU.
2. **Salt individual por usuário:** 16 bytes de aleatoriedade criptográfica (`crypto.randomBytes(16)`) para impedir ataques de tabela rainbow.
3. **Resistência a Timing Attacks:** Comparação estrita via `timingSafeEqual()`.
4. **Zero dependência externa nativa:** Executa diretamente no runtime padrão do Node.js sem necessidade de ferramentas de compilação C++ (como `node-gyp` ou `python`), garantindo portabilidade para ambientes Linux, Windows, macOS e contêineres Docker mínimos.

## Consequências
- **Positivas:** Desempenho excelente, máxima portabilidade de deploy em provedores gratuitos, conformidade total com as recomendações de criptografia da OWASP para hashing de senhas.
- **Negativas:** Caso surja necessidade futura de migração para Argon2id em microserviço dedicado, o formato do hash (`scrypt:salt:hash`) permite versionamento de esquemas de hash sem invalidar as senhas existentes.
