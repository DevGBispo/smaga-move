# Transporte — cópia isolada do Controle de Embarque

O código original completo foi vinculado como submódulo Git fixado no commit `b9ec1ec` de `DevGBispo/Smagalhaes`. A cópia de trabalho fica na branch independente `feature/smaga-move-transporte-isolado`, sem alterações na branch de produção `main`.

Para obter o código: `git submodule update --init --recursive`.

**Importante:** este é o primeiro passo de isolamento de código, não um ambiente funcional publicado. O Controle de Embarque original possui autenticação, APIs, banco e configuração de deploy; não se deve usar as credenciais ou a base de produção nos testes. Antes de liberar a seção operacional, provisionar ambiente de homologação e configurar serviços isolados.

Não incorporar a interface antiga por iframe apontando para produção, pois isso executaria ações sobre a operação real.
