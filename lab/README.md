# SMAGA Move Lab — Fase 1 (experimental)

Objetivo: validar regras em isolamento antes de integrar Supabase, interface e operação real.

## Executar
`node --test lab/transport-rules.test.mjs`

## Cobertura inicial
- Chapeiras tratadas como identificadores textuais (07 e 07.B distintos; 50B e 50.B equivalentes para comparação).
- Validação de destino, horário de carregamento e cadastro de chapeiras.
- Registro de chamada planejada e cancelamento sem apagar histórico.
- Operações imutáveis para facilitar simulações repetíveis.

## Fora do escopo desta fase
- Carteira ordenada, sequência, punições, passagens, ganchos, retorno e disponibilidade.
- Confirmação de chamada, execução de carregamento, reservas, contêineres e vínculo com pátio.
- Banco de dados, autenticação, RLS, interface e operação simultânea.
- Migração de motoristas reais do sistema original.

## Decisões provisórias a homologar
1. Chapeiras com sufixo B: o laboratório aceita `50B` como entrada e normaliza para `50.B`. Validar se esta equivalência é desejada no novo sistema.
2. Status `planned` e `cancelled` são apenas estados de teste, não o fluxo final.
3. Chamada com uma ou mais chapeiras é um registro de laboratório; ainda não consome posições da carteira.

Não usar este motor em produção. A lógica completa do Controle de Embarque Smagalhães deverá ser especificada e comparada antes de qualquer integração.

## Rodar o laboratório
```bash
node --test lab/*.test.mjs
node lab/demo.mjs
```
O primeiro comando executa as verificações de lógica; o segundo simula uma operação BTP com carteira, chapeira bloqueada, passagem, chamada e confirmações. Os resultados são impressos em JSON, sem dados reais e sem qualquer conexão com Supabase ou Cloudflare.

## Estados de motorista
`sem` (pendente), `ok` (confirmado), `aberto`, `troca` e `gancho`.
Para a contagem da rodada, `ok` e `troca` contam; todas as linhas precisam deixar de estar `sem` e a quantidade precisa ser atingida para concluir.
Duas confirmações `ok` para a mesma chapeira, data e horário de carregamento são rejeitadas.

## Publicação e limites
O laboratório ainda é executado pelo Node.js e GitHub Actions, não possui URL de interface. Não exige deploy no Cloudflare.
O Cloudflare Worker `smaga-move` deve ser vinculado à conta correta; falha de preview no PR não indica falha dos testes de Node.
As regras implementadas são aproximações verificáveis do sistema original, ainda sujeitas a homologação.
