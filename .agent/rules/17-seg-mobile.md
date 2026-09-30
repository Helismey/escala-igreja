# Segurança: mobile (sempre ativa)

- Sem segredo no bundle do app; o app só conhece a URL da API e chaves públicas.
- Tokens no armazenamento seguro do sistema (Keychain/Keystore), nunca em armazenamento simples.
- Toda comunicação por HTTPS; considerar pinning de certificado apenas se houver justificativa (evitar quebrar atualizações).
- Deep links e esquemas de URL: validar parâmetros como entrada não confiável; links de confirmação abrem uma tela que chama a API, nunca executam ação direta sem autenticação/token válido.
- Não gravar dados pessoais em cache offline além do necessário (a própria escala); limpar no logout; nada de dados de outros membros offline.
- Bloqueio opcional por biometria/PIN; ocultar conteúdo na visualização de apps recentes quando possível.
- Detectar versão mínima suportada e forçar atualização em caso de correção de segurança.
- Publicação nas lojas: política de privacidade publicada e declaração correta dos dados coletados.
