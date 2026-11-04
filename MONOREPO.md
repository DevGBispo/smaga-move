# SMAGA Move — Monorepo

Duas aplicações React/Vite com autenticação e PostgreSQL compartilhados no Supabase.

| Aplicação | Pasta | Build | Saída |
| --- | --- | --- | --- |
| Operacional | `apps/operacional` | `npm run build:operacional` | `dist/` (compatível com deploy existente) |
| Administração | `apps/admin` | `npm run build:admin` | `apps/admin/dist/` |

## Desenvolvimento

```bash
npm ci
npm run dev:operacional
npm run dev:admin
npm run typecheck
```

Ambas utilizam `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (chaves públicas, nunca service_role). Em builds no Cloudflare, configure-as como variáveis de ambiente de build para cada aplicação.

## Cloudflare: dois deploys

1. Preserve o Worker existente `smaga-move`, com comando de build `npm run build` e saída `dist/`.
2. Crie um segundo Worker de assets estáticos chamado `smaga-admin`, conectado ao **mesmo** GitHub `DevGBispo/smaga-move`, branch `dev`.
3. Configure build `npm run build:admin`, saída `apps/admin/dist/`, e as mesmas duas variáveis públicas do Supabase.
4. Habilite o fallback SPA para rotas do frontend, quando aplicável.
5. Autorize a URL do novo domínio nas Redirect URLs do Supabase Auth e na política CORS da função `manage-staff` antes de testar convites.

## Autorização

O frontend administrativo só exibe a gestão para perfis com `role=admin` e `active=true`. O backend `manage-staff` deve **revalidar** identidade e cargo em toda requisição; esconder a UI não substitui a autorização no servidor.

## Migração

A aplicação operacional original ainda existe em `src/` por compatibilidade histórica. O build oficial passa a utilizar `apps/operacional/`; a remoção da pasta legada deve ocorrer somente após validar os dois deploys. Não altere políticas RLS ou migre o banco apenas para separar frontends.
