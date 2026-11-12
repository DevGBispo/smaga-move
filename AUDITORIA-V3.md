# Auditoria da migração Smaga Move V3

A referência é a [prévia de testes no Sites](https://smagav3-previa.gabriellbiispo.chatgpt.site), versão 17, commit `abce590e07a967fc82b715c1812e245f1f5d4b74`. O checkout da publicação contém o HTML, os bundles e os assets de `dist/`. O histórico consultado contém apenas arquivos compilados. O ZIP `smaga-move-dev.zip` corresponde à base `dev`, descontadas as quebras de linha.

## Paridade observada

| Setor | O que foi verificado no build publicado em execução local | Validação em apps/operacional |
| --- | --- | --- |
| Gestor | Tela inicial e seletor de setor em 1440, 360, 390 e 412 px | Pendente |
| Expedição | Seleção do setor nas quatro larguras | Pendente |
| Transporte Cheio | Seleção do setor nas quatro larguras | Pendente |
| Transporte Vazio | Seleção do setor nas quatro larguras | Pendente |
| Faturamento | Seleção do setor nas quatro larguras | Pendente |
| Atendente | Seleção do setor nas quatro larguras | Pendente |

A comparação lado a lado de menus, estados vazios, erros e fluxos completos está pendente. Na Central de Chamadas, falta verificar seleção por reserva, sequência da Chapeira, prioridade em aberto, bloqueios, trocas, reposições, confirmações conflitantes, contagem e histórico.

## Testes executados

- Base `dev`: `npm run typecheck`, `npm run build:operacional` e `npm run build:admin` passaram.
- Branch `feature/lab-motor-regras`: 46 testes passaram com `node --test lab/*.test.mjs`.
- Repositório relacionado, commit `b9ec1ec`: 18 testes de integração de chamadas e navegação passaram. A correspondência desses testes com a versão 17 ainda precisa ser demonstrada.

## Supabase e publicação

O projeto `bxjcnalrmglouciahzsp` foi verificado em modo de leitura. A URL e a chave publicável foram configuradas nos arquivos locais ignorados pelo Git. O endpoint de configuração do Auth respondeu HTTP 200. Nenhuma migration foi aplicada. A validação de perfis, persistência e concorrência para as regras da V3 está pendente.

- [Aplicação operacional existente](https://smaga-move.smaga-move.workers.dev)
- [Admin existente](https://smaga-admin.smaga-move.workers.dev)
- [Laboratório de regras](https://smaga-move-lab.pages.dev)

A entrega deste commit é a auditoria. A incorporação da V3 depende do código editável e dos testes específicos do build de referência, incluindo o seletor de setores e a camada de demonstração.
