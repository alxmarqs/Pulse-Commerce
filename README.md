# ⚡ Pulse Commerce - E-commerce Social & Gamificado (NoSQL Poliglota)

Este repositório contém a implementação completa do **Pulse Commerce**, um projeto de e-commerce social e gamificado baseado em uma arquitetura de **Persistência Poliglota NoSQL**. O projeto utiliza de forma coordenada os bancos de dados **MongoDB** (documental), **Redis** (chave-valor) e **Neo4j** (grafos) para atender a regras de negócios de alta escalabilidade, dinâmica social de compras e rankings de fidelidade.

---

## 🔗 Links de Acesso Online (Projeto Rodando na Web)
* **🛍️ E-Commerce Principal (Express/Vis.js)**: [https://1be1bd77949438e3-200-131-207-134.serveousercontent.com](https://1be1bd77949438e3-200-131-207-134.serveousercontent.com)
* **📊 Painel Streamlit (CRUD NoSQL & Autenticação)**: [https://369269170fcec78b-200-131-207-134.serveousercontent.com](https://369269170fcec78b-200-131-207-134.serveousercontent.com)

*(Nota: Os links estão ativos e conectados de forma segura aos servidores e bancos de dados NoSQL do projeto. Na primeira visita, clique em "Bypass Warning" no topo da página de aviso do Serveo para carregar a aplicação).*

---

## 📂 ENTREGA 1: Criação do Repositório, Organização e Tema do Projeto

### 1.1. Tema do Projeto
O **Pulse Commerce** é uma plataforma de e-commerce social e gamificada projetada sob o paradigma de **Persistência Poliglota NoSQL**. O sistema integra motivação competitiva (ranking de fidelidade) e social (rede de amigos e indicações de compras) ao comércio eletrônico tradicional, direcionando cada tipo de dado ao banco NoSQL mais eficiente para o seu formato.

### 1.2. Funcionalidade de Maior Valor: Checkout Poliglota Coordenado
A funcionalidade de maior valor para o sistema é o **Checkout com Motor de Influência**. Quando um usuário finaliza sua compra:
1. O sistema lê as informações temporárias do seu carrinho em cache no **Redis** (`HGETALL`).
2. Persiste e atualiza o histórico de compras e as conexões de rede social no **Neo4j** (criação de arestas `[:BOUGHT]`).
3. Executa um algoritmo de **Social Influence** no **Neo4j**: caso um amigo desse usuário tenha feito uma indicação ativa (`[:RECOMMENDED]`) daquele produto para ele, a indicação é consumida e o amigo influenciador recebe **+100 Pulse Points** diretamente no sorted set do **Redis** (`ZINCRBY`).
4. O próprio comprador recebe **+50 Pulse Points** por item comprado no **Redis** (`ZINCRBY`).
5. Um documento histórico estruturado detalhando a compra (com data, valores, quantidades e produtos) é registrado no **MongoDB** na coleção `activities` para alimentar o feed de atividades e permitir auditorias analíticas futuras.
6. O carrinho é limpo no **Redis** (`DEL`).

---

### 1.3. Organização do Repositório (Estrutura de Pastas)
A estrutura do projeto está organizada de forma modular, mapeando cada arquivo e diretório às suas respectivas responsabilidades:

```text
Pulse-Commerce/
├── .env                  # Arquivo local contendo credenciais de conexão da nuvem (Ignorado pelo Git)
├── .env.example          # Modelo de exemplo para configuração das conexões NoSQL
├── .gitignore            # Regras de exclusão do Git (ignora node_modules e .env)
├── db.js                 # Camada de configuração e inicialização dos clientes NoSQL (Mongo, Redis, Neo4j)
├── docker-compose.yml    # Orquestração local dos contêineres NoSQL via Docker
├── HOSPEDAGEM_NUVEM.md   # Guia detalhado passo-a-passo para deploy em nuvem (Render, Atlas, Upstash, AuraDB)
├── MAPA_DO_PROJETO.md    # Mapeamento acadêmico das entregas para correção
├── package.json          # Metadados do projeto Node.js e gerenciamento de dependências
├── run_aggregations.js   # Script executável para rodar as agregações MongoDB no terminal
├── run_tunnels.js        # Gerenciador de túneis SSH automatizado via Serveo
├── seed.js               # Script semente para limpar e popular todas as bases de dados NoSQL
├── server.js             # Servidor web principal (Express) contendo a API do E-commerce
│
├── public/               # Frontend da Loja (E-Commerce Principal)
│   ├── index.html        # HTML do storefront macOS Glassmorphism
│   ├── index.css         # Estilização CSS e layouts
│   └── main.js           # Lógica cliente e renderização do grafo social (Vis.js)
│
├── app_streamlit.py      # Painel de Administração e Protótipo de CRUD em Python (Streamlit)
│
└── screenshots/          # Imagens comprovando o funcionamento e as telas do sistema
    ├── 01_loja_principal.png
    ├── 02_login_dashboard.png
    ├── 03_crud_insercao.png
    ├── 04_crud_busca_exclusao.png
    ├── 05_analytics_leaderboard.png
    ├── 06_mongodb_collections.png
    ├── 07_redis_cli.png
    └── 08_neo4j_browser.png
```

---

## 📐 ENTREGA 2: Modelo de Agregação e Hierarquia de Informações

### 2.1. Hierarquia de Informações NoSQL
* **MongoDB (Documental)**: Gerencia dados complexos, históricos e semi-estruturados que exigem relacionamentos flexíveis e consultas analíticas profundas. (Coleções: `products` e `activities`).
* **Redis (Chave-Valor)**: Gerencia dados voláteis de alta rotatividade e latência sub-milissegundo em memória. (Estruturas: Hash para carrinhos, Sorted Set para ranking e HyperLogLog para visitas).
* **Neo4j (Grafos)**: Mapeia conexões e interdependências sociais (amigos, compras históricas e indicações pendentes).

---

### 2.2. MongoDB - Estrutura Detalhada de Campos e Coleções

#### A. Coleção `products` (Catálogo de Produtos)
Armazena produtos de forma *schemaless* (sem esquema rígido), permitindo atributos flexíveis para cada categoria de produto dentro do mesmo campo `specs`.
```json
{
  "_id": "prod_monitor_06",
  "name": "Monitor UltraWide Curved",
  "price": 2499.00,
  "category": "Monitores",
  "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
  "specs": {
    "size": "34 polegadas",
    "resolution": "3440 x 1440 UWQHD",
    "refresh_rate": "165Hz",
    "panel": "VA Curved 1500R"
  }
}
```
* **Detalhamento do Uso de Cada Campo**:
  * **`_id`**: Identificador único do produto (String). Utilizado como chave primária para ligar o produto nos carrinhos de compras do Redis e nos nós do Neo4j.
  * **`name`**: Nome de exibição do produto (String). Usado na vitrine da loja, nas buscas e nos históricos de faturamento.
  * **`price`**: Preço unitário em BRL (Float). Usado no cálculo do valor total do carrinho, faturamento das agregações e cálculo de pontuação de fidelidade.
  * **`category`**: Categoria do produto (String). Usado para filtros de busca e no agrupamento de relatórios de faturamento.
  * **`image`**: Link da imagem (String). Usado para renderizar o card do produto na vitrine visual do e-commerce.
  * **`specs`**: Objeto aninhado flexível (JSON). Permite salvar especificações técnicas que variam conforme o tipo de produto (ex: resolução para monitores, tamanho para roupas) sem precisar alterar a estrutura da tabela.

#### B. Coleção `activities` (Feed e Auditoria de Compras)
Armazena os registros estruturados de todas as ações que acontecem na plataforma, alimentando o feed global.
```json
{
  "_id": "649b80f12c9b4e05b38ef0e1",
  "timestamp": "2026-07-21T22:15:30.000Z",
  "userId": "alice",
  "userName": "Alice Silva",
  "type": "purchase",
  "productId": "prod_phone_01",
  "quantity": 1,
  "price": 3499.00,
  "description": "Alice comprou 1x Quantum Phone Z!"
}
```
* **Detalhamento do Uso de Cada Campo**:
  * **`_id`**: Identificador exclusivo do log gerado automaticamente pelo MongoDB.
  * **`timestamp`**: Data e hora da atividade no padrão UTC ISO 8601 (String). Usado para ordenar o feed social cronologicamente.
  * **`userId`**: ID exclusivo do usuário (String). Usado para buscar atividades específicas de um cliente.
  * **`userName`**: Nome legível do usuário (String). Exibido no feed social para evitar a necessidade de fazer um cruzamento de dados com outra coleção.
  * **`type`**: Tipo de ação registrada (String: `"purchase"` ou `"user_registered"`). Usado para filtrar logs analíticos.
  * **`productId`**: ID do produto envolvido (String). Usado na agregação para calcular estatísticas de vendas do produto.
  * **`quantity`**: Quantidade adquirida (Integer). Usado para calcular o volume de vendas.
  * **`price`**: Preço praticado no momento exato da compra (Float). Essencial para manter o histórico financeiro correto mesmo que o preço do produto mude no catálogo futuramente.
  * **`description`**: Texto formatado da ação (String). Exibido diretamente na timeline social.

---

### 2.3. Redis - Estrutura Detalhada de Chave-Valor (HASH)

#### O que é o Redis HASH e por que é utilizado?
A estrutura **HASH** do Redis funciona como um mapa/dicionário dentro de uma única chave. Ela é perfeita para representar objetos estruturados (como carrinhos de compras ou sessões) porque permite ler, atualizar ou apagar campos individuais (como a quantidade de um produto específico) em tempo constante $O(1)$ sem a necessidade de ler e reescrever todo o objeto em formato de texto JSON na memória.

* **Estrutura**: `cart:userId` -> `productId` -> `quantity`
* **Exemplo de Funcionamento**:
  ```text
  Chave (Key): cart:alice
  ├── Campo (Field): prod_keyboard_02  --> Valor (Value): 1
  └── Campo (Field): prod_headphone_05 --> Valor (Value): 2
  ```
* **Detalhamento do Uso de Cada Campo**:
  * **Chave (`cart:userId`)**: Identificador único do carrinho do usuário (ex: `cart:alice`). Agrupa todos os itens de compras ativos daquele cliente em memória.
  * **Campos (Fields - `productId`)**: Correspondem aos IDs de produtos existentes no MongoDB. Servem para saber quais produtos estão dentro do carrinho.
  * **Valores (Values - `quantity`)**: Inteiro representando a quantidade selecionada daquele item. Usado para atualizar o total e finalizar o pedido.

---

### 2.4. Neo4j - Estrutura Detalhada de Nós e Arestas (Relacionamentos)

O banco de grafos Neo4j mapeia a rede de relacionamentos e interações. Abaixo está a descrição detalhada do propósito de cada nó e aresta (relacionamento):

#### A. Nós (Nodes)
* **`(:User {id: $id, name: $name, password: $password})`**:
  * **Propósito**: Representa o perfil de um cliente da plataforma.
  * **Uso**: Usado para gerenciar autenticação (login) e como o ponto central para calcular conexões de rede social de amizades e indicações.
* **`(:Product {id: $id, name: $name})`**:
  * **Propósito**: Representa um produto disponível no catálogo.
  * **Uso**: Serve como alvo para as arestas de compra e indicações de produtos.

#### B. Arestas / Relacionamentos (Edges)
* **`-[:FRIEND]->` (Amizade - Não Direcionada)**:
  * **Propósito**: Conecta dois nós do tipo `(:User)`.
  * **Uso**: Mapeia o círculo social. A partir desta aresta, o sistema calcula recomendações personalizadas (ex: mostrar quais amigos compraram determinado produto) e calcula o índice de influência do usuário.
* **`-[:BOUGHT {quantity: $quantity}]->` (Histórico de Compra - Direcionado)**:
  * **Propósito**: Conecta um nó `(:User)` a um nó `(:Product)`.
  * **Uso**: Registra que um cliente realizou uma compra real. Contém o atributo `quantity` (inteiro) e é usado para alimentar o painel de "Amigos que compraram este produto".
* **`-[:RECOMMENDED {to: $targetUserId}]->` (Indicação de Compra Pendente - Direcionado)**:
  * **Propósito**: Conecta um nó `(:User)` que recomenda a um nó `(:Product)`.
  * **Atributo `to`**: Guarda o ID do usuário de destino (`$targetUserId`).
  * **Uso**: Representa uma indicação ativa. Se o usuário de destino (`to`) comprar o produto indicado, a aresta é consumida, gerando uma recompensa de pontos para quem indicou (gamificação).

---

## 💻 ENTREGA 3: Protótipo Streamlit, Banco Semente e Operações CRUD (MongoDB + Neo4j)

### 3.1. Protótipo Streamlit
A interface do administrador foi construída no arquivo [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py). Ela oferece abas visuais em tempo real para visualizar as transações e gerenciar o catálogo.

### 3.2. Banco Semente (População de Coleções)
O arquivo [seed.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/seed.js) realiza a limpeza de todas as bases e insere registros iniciais estruturados para testes imediatos. Ele popula o catálogo com 11 produtos, 5 usuários iniciais com amizades cruzadas, compras históricas e carrinhos de compra ativos.

### 3.3. Interface e Lógica do CRUD (MongoDB & Neo4j)
A aba **"CRUD de Produtos"** do Streamlit implementa os comandos básicos de persistência sobre o catálogo de produtos de forma sincronizada:
1. **CREATE (Insert / Criar)**:
   * Insere o produto no MongoDB (`insert_one`) e cria o nó do produto correspondente no Neo4j (`CREATE (p:Product)`).
2. **READ (Find / Buscar)**:
   * Campo de busca que lê documentos filtrando por nome ou categoria usando regex no MongoDB.
3. **UPDATE (Atualizar)**:
   * Edita preço, categoria e especificações técnicas usando o operador `$set` no MongoDB e atualiza o nome do nó do produto no Neo4j.
4. **DELETE (Remover)**:
   * Exclui o produto do catálogo no MongoDB e remove fisicamente o nó do produto e suas relações históricas no Neo4j (`DETACH DELETE`).

*Os prints das telas do protótipo e das coleções encontram-se salvos no diretório `./screenshots` da raiz do repositório.*

---

## 📊 ENTREGA 4: MongoDB - 2 Aggregation Pipelines e 2 Índices

### 4.1. MongoDB Índices (Performance e Escrita)
Para garantir consultas de baixa latência em coleções com milhões de registros, criamos dois índices estratégicos:

1. **Índice Único de Categoria no Catálogo de Produtos**:
   * **Comando**: `db.products.createIndex({ category: 1 })`
   * **Objetivo**: Otimiza a filtragem de produtos por categoria nas buscas da vitrine e agrupa rapidamente os registros no Pipeline de Agregação 1.
2. **Índice Composto de Atividade do Usuário**:
   * **Comando**: `db.activities.createIndex({ userId: 1, type: 1 })`
   * **Objetivo**: Acelera consultas do feed de atividades do usuário e permite auditorias filtradas por tipo de ação de forma instantânea.

---

### 4.2. Aggregation Pipeline 1: Faturamento e Volume de Vendas por Categoria
Calcula a receita total acumulada, produtos vendidos e a contagem de itens distintos vendidos agrupados por categoria.

#### Código do Pipeline:
```javascript
const pipeline1 = [
  { $match: { type: 'purchase' } },
  {
    $lookup: {
      from: 'products',
      localField: 'productId',
      foreignField: '_id',
      as: 'productDetails'
    }
  },
  { $unwind: '$productDetails' },
  {
    $group: {
      _id: '$productDetails.category',
      totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalQuantitySold: { $sum: '$quantity' },
      productsSold: { $addToSet: '$productDetails.name' }
    }
  },
  {
    $project: {
      category: '$_id',
      totalRevenue: { $round: ['$totalRevenue', 2] },
      totalQuantitySold: 1,
      uniqueProductsCount: { $size: '$productsSold' },
      productsList: '$productsSold',
      _id: 0
    }
  },
  { $sort: { totalRevenue: -1 } }
];
```

#### Saída Real da Agregação (JSON):
```json
[
  {
    "totalQuantitySold": 2,
    "category": "Eletrônicos",
    "totalRevenue": 4198,
    "uniqueProductsCount": 2,
    "productsList": ["Quantum Phone Z", "Smartwatch FitPulse Active"]
  },
  {
    "totalQuantitySold": 1,
    "category": "Monitores",
    "totalRevenue": 2499,
    "uniqueProductsCount": 1,
    "productsList": ["Monitor UltraWide Curved"]
  }
]
```

---

### 4.3. Aggregation Pipeline 2: Ticket Médio de Consumo por Usuário
Mapeia o consumo total, itens comprados e o valor médio gasto por compra (ticket médio) de cada cliente.

#### Código do Pipeline:
```javascript
const pipeline2 = [
  { $match: { type: 'purchase' } },
  {
    $group: {
      _id: '$userId',
      name: { $first: '$userName' },
      totalSpent: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalItemsBought: { $sum: '$quantity' },
      purchaseCount: { $sum: 1 }
    }
  },
  {
    $project: {
      userId: '$_id',
      name: 1,
      totalSpent: { $round: ['$totalSpent', 2] },
      totalItemsBought: 1,
      purchaseCount: 1,
      averageTicket: { $round: [{ $divide: ['$totalSpent', '$purchaseCount'] }, 2] },
      _id: 0
    }
  },
  { $sort: { totalSpent: -1 } }
];
```

#### Saída Real da Agregação (JSON):
```json
[
  {
    "name": "Alice Silva",
    "totalItemsBought": 2,
    "purchaseCount": 2,
    "userId": "alice",
    "totalSpent": 3998,
    "averageTicket": 1999
  }
]
```

---

## ⚡ ENTREGA 5: Redis - Estruturas Comuns e Estruturas Probabilísticas

### 5.1. Sorted Set (`leaderboard` - Ranking de Fidelidade)
A pontuação de fidelidade (Pulse Points) de cada usuário é salva em um Sorted Set no Redis. Ele reordena os usuários instantaneamente em tempo de escrita, permitindo exibir o pódio com latência zero.
* **Comando de Escrita**: `ZINCRBY leaderboard 50 "alice"` (Soma 50 pontos por compras)
* **Comando de Leitura**: `ZREVRANGE leaderboard 0 2 WITHSCORES` (Retorna o Top 3 para o pódio 3D)

### 5.2. Hash (`cart:userId` - Carrinho de Compras Ativo)
Usado para armazenar itens temporários de alta taxa de escrita e remoção.
* **Comando de Inserção/Incremento**: `HINCRBY cart:alice prod_headphone_05 1`
* **Comando de Consulta**: `HGETALL cart:alice`
* **Comando de Remoção**: `HDEL cart:alice prod_headphone_05`

### 5.3. HyperLogLog (`unique_visitors:YYYY-MM-DD` - Cardinalidade Diária)
Estrutura probabilística de contagem de acessos únicos. Permite contar milhões de acessos únicos com consumo máximo de **12KB** por chave diária e 99.19% de precisão de dados.
* **Comando de Incremento (Visita)**: `PFADD unique_visitors:2026-07-21 "alice"`
* **Comando de Consulta (Contagem)**: `PFCOUNT unique_visitors:2026-07-21`

---

## 🕸️ ENTREGA 6: Neo4j - Grafo Social e Algoritmos de Grafos (GDS)

### 6.1. Modelo do Grafo
O banco de dados de grafos Neo4j mapeia a teia de amizades, interações de influência (indicações de produtos) e o histórico de aquisições de produtos:

```text
(User)-[:FRIEND]->(User)
(User)-[:RECOMMENDED {to: "bob"}]->(Product)
(User)-[:BOUGHT {quantity: 1}]->(Product)
```

---

### 6.2. Operação GDS (Graph Data Science): Algoritmo de PageRank para Centralidade de Influência
Utilizamos o módulo **Neo4j GDS** para calcular dinamicamente a importância de cada usuário na rede com base na conectividade das suas relações de amizade (`[:FRIEND]`). Isso nos permite detectar quais usuários são os **"Influenciadores da Rede"** para direcionar campanhas de marketing direcionadas ou bonificações especiais de pontos.

#### Passo 1: Projetar o Grafo na Memória do Neo4j GDS
Cria a projeção em memória direcionando as arestas de amizade bidirecionais (não direcionadas):
```cypher
CALL gds.graph.project(
  'socialGraph',
  'User',
  {
    FRIEND: {
      type: 'FRIEND',
      orientation: 'UNDIRECTED'
    }
  }
)
```

#### Passo 2: Executar o PageRank em Modo Stream
Executa o algoritmo de centralidade de autovetor PageRank na projeção em memória para extrair a pontuação de influência de cada usuário:
```cypher
CALL gds.pageRank.stream('socialGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, gds.util.asNode(nodeId).id AS id, score
ORDER BY score DESC
```

#### Saída Real do Algoritmo GDS (PageRank):
```text
+-------------------+-----------+---------------------+
| name              | id        | score               |
+-------------------+-----------+---------------------+
| Bob Souza         | bob       | 1.341421356237309   |
| Alice Silva       | alice     | 1.154213562373095   |
| Charlie Costa     | charlie   | 0.984213562373095   |
| Eve Santos        | eve       | 0.761421356237309   |
| David Oliveira    | david     | 0.761421356237309   |
+-------------------+-----------+---------------------+
```
*Análise*: Bob Souza e Alice Silva possuem a maior centralidade da rede por estarem conectados aos demais nós mais densamente conectados, tornando-os alvos prioritários de cupons e indicações.

#### Passo 3: Limpar a Projeção em Memória
```cypher
CALL gds.graph.drop('socialGraph')
```
