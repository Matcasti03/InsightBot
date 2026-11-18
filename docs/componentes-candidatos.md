# Componentes candidatos — InSightBot

Pesquisa em 18/11/2026 para o modelo conceitual. Esta lista não constitui uma lista de materiais validada ou uma decisão de compra. As proporções do 3D são ilustrativas, sem verificação de montagem física.

Os documentos da equipe indicam câmera OmniVision de alta definição, condução magnética externa, microcoleta em Nitinol e armazenamento de amostras. Não fecham modelos, circuito, orçamento energético ou dimensões. As seguintes referências comerciais permitem iniciar esses estudos:

| Função | Referência e fonte primária | Limite da seleção |
| --- | --- | --- |
| Imagem | [OMNIVISION OCH2B10](https://www.ovt.com/products/och2b10/) | Módulo de endoscopia de 1500 × 1500 pixels; interface AntLinx cabeada. Requer arquitetura adicional para processamento e transmissão. |
| Luz | [ams OSRAM LW QH8G](https://look.ams-osram.com/m/18bebf86c6daf69/original/LW-QH8G.pdf) | LED branco compacto; quantidade, aquecimento e reprodução de cores precisam de ensaios. |
| Acoplamento magnético | [supermagnete R-06-02-02-N](https://www.supermagnete.de/data_sheet_R-06-02-02-N.pdf) | Ímã de bancada N45 em anel. Não constitui peça pronta para ingestão nem sistema de condução. |
| Controle e telemetria | [Nordic nRF52832, WLCSP](https://docs.nordicsemi.com/r/bundle/ps_nrf52832/page/nrf52832_ps.html) | Candidato para comandos e dados de sensores; não resolve captura AntLinx ou transmissão de vídeo HD. |
| Energia | [Renata 393](https://www.renata.com/en-us/products/silver-oxide-batteries/) | Referência de volume de célula. Capacidade nominal não estabelece a autonomia da cápsula. |
| Material da garra | [Fort Wayne Metals, Nitinol](https://fwmetals.com/what-we-do/materials/nitinol/nitinol-products) | Fornecedor de material e peças sob medida, não de uma microgarra pronta para este projeto. |
| Reserva da amostra | Desenvolvimento próprio | Sem produto comercial selecionado. Transferência, selagem e recuperação em aberto. |
| Antena | Desenvolvimento próprio | Sem modelo selecionado; depende da carcaça, frequência e testes do enlace. |

A [OVM6948](https://www.ovt.com/products/ovm6948/) foi considerada pela miniaturização, mas sua resolução de 200 × 200 não corresponde à proposta de imagem HD dos documentos.

## Desenvolvimento ainda necessário

- Integrar câmera, processamento, armazenamento/transmissão de vídeo e receptor externo.
- Definir dimensões reais e verificar interferências entre câmera, ímã, energia, eletrônica, garra e reservatório.
- Dimensionar alimentação e conversores com consumo e correntes de pico medidos.
- Projetar equipamento magnético externo e avaliar torque, atuação da garra e retenção de amostras.
- Definir materiais, vedação e requisitos de segurança; realizar os testes de engenharia e validações aplicáveis antes de qualquer uso clínico.

O catálogo do visualizador está em `frontend/scripts/capsule-3d/products.mjs`. Seus nomes e fontes também são exportados como metadados dos grupos no GLB. Nem disponibilidade comercial atual nem integração entre estes componentes está garantida por esta pesquisa.
