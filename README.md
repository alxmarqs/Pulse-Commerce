# ⚡ Pulse Commerce - E-commerce Social & Gamificado (NoSQL Poliglota)

Este repositório contém a implementação completa do **Pulse Commerce**, um projeto de e-commerce social e gamificado baseado em uma arquitetura de **Persistência Poliglota NoSQL**. O projeto utiliza de forma coordenada os bancos de dados **MongoDB** (documental), **Redis** (chave-valor) e **Neo4j** (grafos) para atender a regras de negócios de alta escalabilidade, dinâmica social de compras e rankings de fidelidade.

---

## 🔗 Links de Acesso Online (Projeto Rodando na Web)
* **🛍️ E-Commerce Principal (Express/Vis.js)**: [https://1be1bd77949438e3-200-131-207-134.serveousercontent.com](https://1be1bd77949438e3-200-131-207-134.serveousercontent.com)
* **📊 Painel Streamlit (CRUD NoSQL & Autenticação)**: [https://369269170fcec78b-200-131-207-134.serveousercontent.com](https://369269170fcec78b-200-131-207-134.serveousercontent.com)

*(Nota: Os links estão ativos e conectados de forma segura aos servidores e bancos de dados NoSQL do projeto. Na primeira visita, clique em "Bypass Warning" no topo da página de aviso do Serveo para carregar a aplicação).*

---

## 📂 1. Organização do Repositório (Estrutura de Pastas)

A estrutura do projeto está organizada de forma modular, separando a camada de persistência de dados, a interface com o usuário e a documentação acadêmica:

```text
Pulse-Commerce/
├── .env                  # Arquivo local de variáveis de ambiente (Ignorado pelo Git)
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

## 📝 2. Tema do Projeto e Funcionalidade de Maior Valor

### 2.1. Tema do Projeto
O **Pulse Commerce** é uma plataforma de comércio eletrônico social que integra mecânicas de **gamificação** (pontos acumulados e pódio de fidelidade) e **redes de influência** (feed de atividades de amigos, recomendações de produtos e compras em grupo). Cada tipo de dado é roteado para o banco de dados NoSQL mais adequado, maximizando a escalabilidade e o desempenho de leitura/escrita.

### 2.2. Funcionalidade de Maior Valor: Checkout Coordenado Poliglota
A funcionalidade principal do sistema é o **Checkout com Motor de Influência Social**, que executa um fluxo transacional poliglota coordenado na camada de aplicação:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant App as Servidor (Express)
    participant Redis as Redis (Chave-Valor)
    participant Neo4j as Neo4j (Grafos)
    participant Mongo as MongoDB (Documental)

    Cliente->>App: Finalizar Compra
    App->>Redis: HGETALL cart:userId (Lê itens temporários)
    Redis-->>App: Lista de Produtos e Quantidades
    App->>Neo4j: CREATE (:User)-[:BOUGHT]->(:Product) (Grava histórico de compras)
    App->>Neo4j: MATCH (Friend)-[:RECOMMENDED {to: userId}]->(Product) (Verifica indicações)
    Neo4j-->>App: Indicações ativas encontradas
    alt Indicação Existe (Motor de Influência)
        App->>Redis: ZINCRBY leaderboard 100 Friend (Bonifica influenciador +100pts)
        App->>Neo4j: DELETE [:RECOMMENDED] (Consome indicação)
    end
    App->>Redis: ZINCRBY leaderboard 50 Comprador (Fidelidade +50pts por item)
    App->>Mongo: insert_one() na coleção 'activities' (Loga compra no histórico)
    App->>Redis: DEL cart:userId (Esvazia carrinho)
    App-->>Cliente: Compra Finalizada com Sucesso!
```

---

## 📐 3. Modelo de Agregação e Hierarquia de Informações

### 3.1. Hierarquia de Informações por Banco de Dados
* **MongoDB (Documental)**: Responsável por dados de baixa mutabilidade e alta complexidade/volume. Contém o catálogo completo de produtos (com atributos livres por categoria) e o histórico cronológico de atividades (auditoria de compras e cadastros).
* **Redis (Chave-Valor)**: Armazena dados voláteis, de acesso ultra-rápido em memória. Controla os carrinhos de compras dos usuários ativos, o ranking do sorted set de fidelidade e a contagem probabilística de visitantes únicos.
* **Neo4j (Grafos)**: Mapeia as relações sociais complexas e interconectadas. Controla os perfis de usuários, amizades, histórico de indicações de produtos e arestas de compras realizadas.

---

### 3.2. Descrição e Exemplo de Documento de cada Coleção

#### A. Coleção `products` (MongoDB - Catálogo de Produtos)
Armazena os detalhes dos produtos à venda de forma flexível (*schemaless*). O campo `specs` varia de acordo com a categoria.
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

#### B. Coleção `activities` (MongoDB - Feed de Atividades)
Contém o log estruturado para auditorias e geração de relatórios de atividades da plataforma.
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

#### C. Chave de Carrinho no Redis (Chave-Valor: HASH)
* **Chave**: `cart:alice` (Estrutura de dados: `HASH`)
* **Campos (Fields)**: `ID_DO_PRODUTO` -> **Valores**: `QUANTIDADE`
```text
"prod_keyboard_02" -> "1"
"prod_headphone_05" -> "2"
```

#### D. Nós e Relações no Neo4j (Grafos)
* **Nós (Labels)**:
  * `(:User {id: "alice", name: "Alice Silva", password: "alice"})`
  * `(:Product {id: "prod_phone_01", name: "Quantum Phone Z"})`
* **Relacionamentos (Types)**:
  * `(:User {id: "alice"})-[:FRIEND]->(:User {id: "bob"})`
  * `(:User {id: "charlie"})-[:BOUGHT {quantity: 1}]->(:Product {id: "prod_keyboard_02"})`
  * `(:User {id: "eve"})-[:RECOMMENDED {to: "alice"}]->(:Product {id: "prod_headphone_05"})`

---

## 🖥️ 4. Protótipo Streamlit e Operações CRUD (MongoDB + Neo4j)

O painel de administração desenvolvido em Python (**`app_streamlit.py`**) implementa a interface visual para gerenciar o catálogo de produtos e os usuários.

### 4.1. Mapeamento das Operações de CRUD Sincronizadas

```mermaid
graph LR
    UI[🖥️ Streamlit Interface]
    Mongo[(🍃 MongoDB)]
    Neo4j[(🕸️ Neo4j)]

    UI -->|INSERT/CREATE| Mongo & Neo4j
    UI -->|FIND/READ| Mongo
    UI -->|UPDATE| Mongo & Neo4j
    UI -->|DELETE| Mongo & Neo4j
```

1. **CREATE (Insert / Criar)**:
   * **MongoDB**: `mongo_db["products"].insert_one(product_doc)`
   * **Neo4j**: `CREATE (p:Product {id: $id, name: $name})`
2. **READ (Find / Buscar)**:
   * **MongoDB**: `mongo_db["products"].find({"$or": [{"name": {"$regex": query, "$options": "i"}}, ...]})`
3. **UPDATE (Atualizar)**:
   * **MongoDB**: `mongo_db["products"].update_one({"_id": prod_id}, {"$set": update_fields})`
   * **Neo4j**: `MATCH (p:Product {id: $id}) SET p.name = $name`
4. **DELETE (Remover)**:
   * **MongoDB**: `mongo_db["products"].delete_one({"_id": prod_id})`
   * **Neo4j**: `MATCH (p:Product {id: $id}) DETACH DELETE p`

*Os prints comprovando o funcionamento de cada operação de CRUD e das bases populadas encontram-se salvos no diretório `./screenshots/` do repositório.*

---

## 📊 5. MongoDB: 2 Aggregation Pipelines e 2 Índices

### 5.1. MongoDB Índices (Performance e Escrita)
Para garantir consultas de baixa latência em coleções com milhões de registros, criamos dois índices estratégicos:

1. **Índice Único de Categoria no Catálogo de Produtos**:
   * **Comando**: `db.products.createIndex({ category: 1 })`
   * **Objetivo**: Otimiza a filtragem de produtos por categoria nas buscas da vitrine e agrupa rapidamente os registros no Pipeline de Agregação 1.
2. **Índice Composto de Atividade do Usuário**:
   * **Comando**: `db.activities.createIndex({ userId: 1, type: 1 })`
   * **Objetivo**: Acelera consultas do feed de atividades do usuário e permite auditorias filtradas por tipo de ação de forma instantânea.

---

### 5.2. Aggregation Pipeline 1: Faturamento e Volume de Vendas por Categoria
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

### 5.3. Aggregation Pipeline 2: Ticket Médio de Consumo por Usuário
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

## ⚡ 6. Redis: Estruturas Comuns e Estruturas Probabilísticas

### 6.1. Sorted Set (`leaderboard` - Ranking de Fidelidade)
A pontuação de fidelidade (Pulse Points) de cada usuário é salva em um Sorted Set no Redis. Ele reordena os usuários instantaneamente em tempo de escrita, permitindo exibir o pódio com latência zero.
* **Comando de Escrita**: `ZINCRBY leaderboard 50 "alice"` (Soma 50 pontos por compras)
* **Comando de Leitura**: `ZREVRANGE leaderboard 0 2 WITHSCORES` (Retorna o Top 3 para o pódio 3D)

### 6.2. Hash (`cart:userId` - Carrinho de Compras Ativo)
Usado para armazenar itens temporários de alta taxa de escrita e remoção.
* **Comando de Inserção/Incremento**: `HINCRBY cart:alice prod_headphone_05 1`
* **Comando de Consulta**: `HGETALL cart:alice`
* **Comando de Remoção**: `HDEL cart:alice prod_headphone_05`

### 6.3. HyperLogLog (`unique_visitors:YYYY-MM-DD` - Cardinalidade Diária)
Estrutura probabilística de contagem de acessos únicos. Permite contar milhões de acessos únicos com consumo máximo de **12KB** por chave diária e 99.19% de precisão de dados.
* **Comando de Incremento (Visita)**: `PFADD unique_visitors:2026-07-21 "alice"`
* **Comando de Consulta (Contagem)**: `PFCOUNT unique_visitors:2026-07-21`

---

## 🕸️ 7. Neo4j: Grafo Social e Algoritmos de Grafos (GDS)

### 7.1. Modelo do Grafo
O banco de dados de grafos Neo4j mapeia a teia de amizades, interações de influência (indicações de produtos) e o histórico de aquisições de produtos:

```text
(User)-[:FRIEND]->(User)
(User)-[:RECOMMENDED {to: "bob"}]->(Product)
(User)-[:BOUGHT {quantity: 1}]->(Product)
```

---

### 7.2. Operação GDS (Graph Data Science): Algoritmo de PageRank para Centralidade de Influência
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

---

## 🛠️ 8. Instruções de Instalação e Execução

### Passo 1: Inicializar os Contêineres Docker
Certifique-se de que o **Docker Desktop** está aberto e ativo. Em seguida, na pasta raiz do projeto, execute:
```powershell
docker-compose up -d
```

### Passo 2: Configurar o Arquivo `.env` (Nuvem ou Local)
Crie um arquivo `.env` na raiz do projeto com as chaves de conexão. Se quiser rodar 100% conectado com os bancos da nuvem que criamos (Atlas, Upstash e AuraDB):
```env
MONGO_URL="mongodb+srv://alexandremarcelomarquesfilho_db_user:gcBiN60vBbNA5OSP@pokeleilao.cosxoos.mongodb.net/pulse_commerce?retryWrites=true&w=majority&appName=pokeleilao"
REDIS_URL="rediss://default:gQAAAAAAAs7PAAIgcDFlNDJjNTFjNTViMTc0ODE1YmU5Y2NiOTlkMGU0MjY3Nw@precise-weevil-184015.upstash.io:6379"
NEO4J_URL="neo4j+ssc://83b5adac.databases.neo4j.io"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="R6V1E6to-KLsOvOqSiUiXCsyLR5vlMhfPJBNKYqYKCs"
NODE_TLS_REJECT_UNAUTHORIZED="0"
```

### Passo 3: Instalar as Dependências do Servidor Node.js
```powershell
npm install
```

### Passo 4: Popular os Bancos de Dados (Semente)
Rode o script para popular os bancos na nuvem com o catálogo e dados iniciais de grafos e índices:
```powershell
npm run seed
```

### Passo 5: Inicializar o Servidor Web e os Túneis
1. **Servidor Principal (Loja)**:
   ```powershell
   npm start
   ```
2. **Túneis Web (Serveo)**:
   ```powershell
   node run_tunnels.js
   ```
3. **Painel Admin (Streamlit)**:
   ```powershell
   streamlit run app_streamlit.py
   ```
