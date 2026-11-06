# Transporte isolado — procedimento de homologação

## Fonte preservada
- Código integral: submódulo `transporte/controle-embarque`, fixado no commit `b9ec1ecad4077d0d849ae04b1802fb8632a3a281`.
- Branch independente de desenvolvimento no repositório original: `feature/smaga-move-transporte-isolado`.
- A branch `main` do Controle de Embarque não é modificada.
- O laboratório `lab/navios.html` não deve apontar por iframe ou links operacionais para a aplicação original de produção.

## Preparação no ambiente com Docker (Codespaces/estação de desenvolvimento)
```bash
git clone --branch feature/lab-motor-regras --recurse-submodules https://github.com/DevGBispo/smaga-move.git
cd smaga-move/transporte/controle-embarque
npm ci
npm run homologation:start
npm run homologation:verify
npm run homologation:two-operators
```

Os scripts originais criam PostgreSQL, GoTrue, PostgREST, Kong e Edge Runtime locais e validam o fluxo HTTP. As credenciais são geradas localmente e ignoradas pelo Git. O guia oficial está em `transporte/controle-embarque/homologation/README.md`.

## Critérios antes de abrir a interface completa
1. Disponibilizar os handlers ainda ausentes de Administração/Mural ou desativar esses módulos em uma compilação de Transporte específica.
2. Executar `npm run build:homologation` somente com o gateway local em `127.0.0.1:54321`; o build rejeita URLs remotas.
3. Executar `node scripts/check-homologation-isolation.mjs` e conferir ausência de hosts de produção no artefato.
4. Testar autenticação, chamadas, ganchos, trocas, rodízio, embarques e concorrência com duas contas fictícias no navegador.
5. Somente então publicar uma instância de homologação com Supabase independente e controle de acesso, após adaptar os validadores que hoje permitem apenas localhost.

## Estado
**Cópia do código preparada; homologação operacional ainda não concluída.** Não publicar o build estático normal, porque ele referencia serviços operacionais. Não configurar credenciais de produção na cópia.
