# SMAGA Move

Nova plataforma interna de Gestão Operacional de Transporte da S.Magalhães & Essemaga.

## Arquitetura
Frontend React + Vite + TypeScript / Supabase Auth + PostgreSQL + RLS / Cloudflare Pages para hospedagem **estática**. Sem Cloudflare D1, Workers de backend ou estado JSON global.

## Primeiros passos
1. Criar repositório GitHub privado e projeto Supabase novo e isolado.
2. Abrir `supabase/migrations/202610220001_foundation.sql` no SQL Editor do **novo projeto dev**. Revisar antes de executar.
3. Copiar `.env.example` para `.env.local` e preencher apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública). **NUNCA** inserir service role ou segredos em VITE_*.
4. Executar `npm install`, `npm run typecheck`, `npm run build`, `npm run dev`.
5. Criar contas de testes pelo painel Supabase Auth. Por segurança, novas contas nascem **inativas**, sem acesso aos dados. A aprovação, administração e auditoria virão na próxima migração/rotina administrativa. Não atribuir permissões copiando SQL sem verificar IDs e ambiente.
6. No Cloudflare Pages, conectar o repositório, configurar `npm run build` e diretório `dist`. Configurar as mesmas duas variáveis VITE_ públicas em ambiente de build. Autorizar a URL no Auth > URL Configuration do Supabase; antes disso, nenhum redirect customizado será usado.

## Ainda não está pronto
Este pacote contém apenas a fundação e uma tela de login. **Não** inclui os módulos Operações, Chamada ou Embarque, nem está homologado para produção. Não permitir contas reais até a revisão de políticas, gestão de aprovação e testes.

## Cuidados
- Não importar dados reais da V1 automaticamente.
- Não registrar CPF/CNH ou secrets no repositório.
- Criar migrations imutáveis, testar com duas sessões, histórico, idempotência e concorrência antes de liberar escritas críticas.
- Os códigos verdes do conceito visual são **referências**, não tokens oficiais homologados.
