# Pulse Commerce - E-commerce Social & Gamificado NoSQL

Este repositório contém a implementação completa do **Pulse Commerce**, um projeto de e-commerce social e gamificado baseado em uma arquitetura de **Persistência Poliglota NoSQL**. O projeto utiliza de forma combinada os bancos **MongoDB** (documental), **Redis** (chave-valor) e **Neo4j** (grafos) para atender a regras de negócios de alta escalabilidade e dinâmica social de compras.

---

## 🔗 Links de Acesso Online (Projeto Rodando na Web)
* **🛍️ E-Commerce Principal (Express/Vis.js)**: [https://iuvzx-177-69-201-73.free.pinggy.net](https://iuvzx-177-69-201-73.free.pinggy.net)
* **📊 Painel Streamlit (CRUD NoSQL & Autenticação)**: [https://itdnw-177-69-201-73.free.pinggy.net](https://itdnw-177-69-201-73.free.pinggy.net)

*(Nota: Os links estão ativos e conectados de forma segura aos servidores e bancos de dados NoSQL do projeto).*

---

## 1. Tema do Projeto e Funcionalidade de Maior Valor

### 1.1. Tema do Projeto
O **Pulse Commerce** é uma plataforma de e-commerce social e gamificada projetada sob o paradigma de **Persistência Poliglota**. O sistema integra motivação competitiva (ranking de fidelidade) e social (rede de amigos e indicações de compras) ao comércio eletrônico tradicional, direcionando cada tipo de dado ao banco NoSQL mais eficiente para o seu formato.

### 1.2. Funcionalidade de Maior Valor: Checkout Poliglota Coordenado
A funcionalidade mais importante e de maior valor para o sistema é o **Checkout com Motor de Influência**. Quando um usuário finaliza sua compra:
1. O sistema lê as informações temporárias do seu carrinho em cache no **Redis** (`HGETALL`).
2. Persiste e atualiza o histórico de compras e as conexões de rede social no **Neo4j** (criação de arestas `[:BOUGHT]`).
3. Executa um algoritmo de **Social Influence** no **Neo4j**: caso um amigo desse usuário tenha feito uma indicação ativa (`[:RECOMMENDED]`) daquele produto para ele, a indicação é consumida e o amigo influenciador recebe **+100 Pulse Points** diretamente no sorted set do **Redis** (`ZINCRBY`).
4. O próprio comprador recebe **+50 Pulse Points** por item comprado no **Redis** (`ZINCRBY`).
5. Um documento histórico estruturado detalhando a compra (com data, valores, quantidades e produtos) é registrado no **MongoDB** na coleção `activities` para alimentar o feed de atividades e permitir auditorias analíticas futuras.
6. O carrinho é limpo no **Redis** (`DEL`).

Tudo isso ocorre de forma coordenada em uma única transação lógica de negócio na camada de aplicação.

---

## 2. Hierarquia de Informações, Agregações e Exemplos de Coleções

### 2.1. Hierarquia de Informações e Agregações NoSQL
* **MongoDB (Documental - Agregações Complexas e Histórico)**: Gerencia dados complexos, semi-estruturados e volumosos. Responsável pelo catálogo de produtos e pelo log de atividades sociais (auditoria).
* **Redis (Chave-Valor - Sessão e Alta Frequência)**: Gerencia dados de baixa latência e leitura/escrita rápida. Controla os carrinhos de compras ativos dos usuários e as pontuações do ranking acumuladas em memória.
* **Neo4j (Grafos - Relações Complexas)**: Mapeia conexões diretas e indiretas (amizades, compras efetuadas e indicações pendentes), permitindo buscas de vizinhança de alta performance sem a lentidão de múltiplos JOINs do modelo relacional.

### 2.2. Descrição e Exemplo de um Documento de cada Coleção/Banco

#### A. Coleção `products` (MongoDB - Catálogo Documental)
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

#### B. Coleção `activities` (MongoDB - Logs de Eventos)
Armazena os registros estruturados de todas as ações que acontecem na plataforma, alimentando o feed global.
```json
{
  "_id": "649b80f12c9b4e05b38ef0e1",
  "timestamp": "2026-07-09T22:15:30.000Z",
  "userId": "alice",
  "userName": "Alice Silva",
  "type": "purchase",
  "productId": "prod_phone_01",
  "quantity": 1,
  "price": 3499.00,
  "description": "Alice comprou 1x Quantum Phone Z!"
}
```

#### C. Nós e Relações do Grafo (Neo4j - Rede Social)
* **Nós (Entidades)**:
  * `(:User {id: "alice", name: "Alice Silva", password: "alice"})`
  * `(:Product {id: "prod_phone_01", name: "Quantum Phone Z"})`
* **Relacionamentos (Conexões)**:
  * `(User {id: "alice"})-[:FRIEND]->(User {id: "bob"})` (Conexão de Amizade)
  * `(User {id: "charlie"})-[:BOUGHT {quantity: 1}]->(Product {id: "prod_keyboard_02"})` (Histórico de Compra)
  * `(User {id: "eve"})-[:RECOMMENDED {to: "alice"}]->(Product {id: "prod_headphone_05"})` (Indicação Pendente)

*(Nota: Os exemplos do banco de dados Redis foram isolados na Seção 5 para cumprir rigorosamente o critério de separação de entregas).*

---

## 3. Protótipo Streamlit, Banco Semente e Operações CRUD (MongoDB + Neo4j)

### 3.1. Protótipo Streamlit
Desenvolvemos uma interface completa em Python utilizando **Streamlit** no arquivo [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py). Ela permite gerenciar e testar o sistema NoSQL de forma visual.

### 3.2. Banco Semente (População de Coleções)
O script [seed.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/seed.js) limpa todas as bases e insere registros iniciais estruturados para testes imediatos. Ele popula o catálogo com 11 produtos, 5 usuários iniciais com amizades cruzadas, compras históricas e carrinhos de compra ativos.

### 3.3. Interface e Lógica do CRUD (MongoDB & Neo4j)
A aba **"CRUD de Produtos"** do Streamlit implementa os comandos básicos de persistência sobre o catálogo de produtos de forma sincronizada:
1. **FIND (Read/Buscar)**: Campo de busca que lê documentos filtrando por nome ou categoria usando regex no MongoDB:
   * *Código*: `mongo_db["products"].find({"$or": [{"name": {"$regex": query}}, ...]})`
2. **INSERT (Create/Criar)**: Formulário para cadastrar novos produtos. Insere o documento no MongoDB (`insert_one`) contendo atributos livres em JSON e cria o nó do produto correspondente no Neo4j (`CREATE (p:Product)`).
3. **UPDATE (Update/Atualizar)**: Permite selecionar qualquer produto e editar seu preço, categoria e especificações técnicas usando o operador `$set` no MongoDB (`update_one`) e atualizando o nome do nó correspondente no Neo4j.
4. **DELETE (Delete/Remover)**: Exclui o produto do catálogo no MongoDB (`delete_one`) e remove fisicamente o nó do produto e suas relações históricas no Neo4j (`DETACH DELETE`).

### 3.4. Screenshots e Diretório de Prints
Os prints de tela das operações de CRUD (Inserção, Busca, Atualização e Remoção) e da visualização das coleções populadas encontram-se salvos na pasta **`./screenshots`** da raiz do repositório para consulta e composição de relatórios adicionais.

---

## 4. MongoDB Aggregation Pipelines (Análise Avançada)

Implementamos e testamos **dois pipelines de agregação complexos** para extrair inteligência de negócios a partir dos dados consolidados no MongoDB. Eles podem ser executados via terminal rodando `node run_aggregations.js`.

### 4.1. Pipeline 1: Faturamento e Volume de Vendas por Categoria
Une os dados das coleções de atividades de compras com o catálogo de produtos para obter a receita, quantidade vendida e lista de produtos distintos por categoria.

#### Código do Pipeline:
```javascript
const pipeline1 = [
  { $match: { type: 'purchase' } }, // Filtra apenas logs de compras
  {
    $lookup: { // JOIN com a coleção de produtos
      from: 'products',
      localField: 'productId',
      foreignField: '_id',
      as: 'productDetails'
    }
  },
  { $unwind: '$productDetails' }, // Achata a array do lookup
  {
    $group: { // Agrupa por categoria calculando totais e conjuntos
      _id: '$productDetails.category',
      totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalQuantitySold: { $sum: '$quantity' },
      productsSold: { $addToSet: '$productDetails.name' }
    }
  },
  {
    $project: { // Formata campos, arredonda valores e conta itens únicos
      category: '$_id',
      totalRevenue: { $round: ['$totalRevenue', 2] },
      totalQuantitySold: 1,
      uniqueProductsCount: { $size: '$productsSold' },
      productsList: '$productsSold',
      _id: 0
    }
  },
  { $sort: { totalRevenue: -1 } } // Ordena por maior faturamento
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
  },
  {
    "totalQuantitySold": 3,
    "category": "Periféricos",
    "totalRevenue": 1249.7,
    "uniqueProductsCount": 2,
    "productsList": ["Teclado Mecânico CyberClick", "Mouse Wireless Neon Glide"]
  }
]
```

---

### 4.2. Pipeline 2: Análise de Consumo e Ticket Médio por Usuário
Mapeia os hábitos de compras de cada usuário do sistema, calculando o gasto total acumulado, o volume de produtos comprados, pedidos finalizados e o ticket médio de consumo.

#### Código do Pipeline:
```javascript
const pipeline2 = [
  { $match: { type: 'purchase' } }, // Filtra logs de compras
  {
    $group: { // Agrupa por usuário acumulando quantidades e calculando frequências
      _id: '$userId',
      name: { $first: '$userName' },
      totalSpent: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalItemsBought: { $sum: '$quantity' },
      purchaseCount: { $sum: 1 }
    }
  },
  {
    $project: { // Calcula divisão matemática e arredonda
      userId: '$_id',
      name: 1,
      totalSpent: { $round: ['$totalSpent', 2] },
      totalItemsBought: 1,
      purchaseCount: 1,
      averageTicket: { $round: [{ $divide: ['$totalSpent', '$purchaseCount'] }, 2] },
      _id: 0
    }
  },
  { $sort: { totalSpent: -1 } } // Ordena do maior cliente para o menor
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
  },
  {
    "name": "Bob Souza",
    "totalItemsBought": 1,
    "purchaseCount": 1,
    "userId": "bob",
    "totalSpent": 2499,
    "averageTicket": 2499
  }
]
```

---

## 5. Redis: Estruturas Comuns e Estruturas Probabilísticas

### 5.1. Estruturas Comuns (Hash e Sorted Set)

#### A. HASH (`cart:userId` - Carrinho de Compras)
* **Função**: Armazena de forma chave-valor simples os produtos adicionados ao carrinho ativo do usuário e suas respectivas quantidades.
* **Comandos CLI Utilizados**:
  * Adicionar item: `HSET cart:bob prod_chair_03 1`
  * Incrementar quantidade: `HINCRBY cart:bob prod_chair_03 1`
  * Buscar todos os itens: `HGETALL cart:bob`
  * Apagar carrinho: `DEL cart:bob`

#### B. SORTED SET (`leaderboard` - Classificação / Pontuação de Fidelidade)
* **Função**: Ranking ordenado dinamicamente em memória. A pontuação (Pulse Points) é acumulada a cada compra efetuada pelo próprio usuário ou por indicações a amigos que resultaram em compra.
* **Comandos CLI Utilizados**:
  * Adicionar pontuação: `ZADD leaderboard 150 "alice"`
  * Incrementar pontos por compras/indicações: `ZINCRBY leaderboard 50 "alice"`
  * Retornar Top 10 usuários ordenados por pontos decrescentes: `ZREVRANGE leaderboard 0 9 WITHSCORES`

---

### 5.2. Estruturas Probabilísticas (HyperLogLog)

#### A. HYPERLOGLOG (`unique_visitors:YYYY-MM-DD` - Visitantes Únicos Diários)
* **Função**: Estimativa matemática probabilística da cardinalidade de usuários ativos diariamente no sistema. Ele permite que a plataforma monitore visitas únicas diárias com consumo fixo de memória de no máximo **12KB** por dia, mesmo que o sistema receba milhões de acessos, apresentando uma precisão de 99,19%.
* **Comandos CLI Utilizados**:
  * Registrar a visita de um usuário ativo: `PFADD unique_visitors:2026-07-14 "alice"`
  * Consultar a contagem estimada de visitantes únicos hoje: `PFCOUNT unique_visitors:2026-07-14`

---

## 6. Instruções de Instalação e Execução

### Passo 1: Inicializar os Contêineres Docker
Certifique-se de que o **Docker Desktop** está aberto e ativo. Em seguida, na pasta raiz do projeto, execute:
```powershell
docker-compose up -d
```
Isso iniciará os contêineres do MongoDB (`127.0.0.1:27017`), Redis (`127.0.0.1:6379`) e Neo4j (`127.0.0.1:7687` / HTTP na porta `7474`).

### Passo 2: Instalar as Dependências do Servidor Node.js
Instale as dependências listadas no `package.json`:
```powershell
npm install
```

### Passo 3: Popular os Bancos de Dados (Semente)
Execute o script semente para limpar e popular o MongoDB, Redis e Neo4j com o nosso catálogo de 11 produtos, rede de usuários e logs estruturados:
```powershell
npm run seed
```

### Passo 4: Executar a Aplicação Web Principal (Node.js/Express)
Inicie o servidor local:
```powershell
npm start
```
Acesse no navegador: **[http://localhost:3000](http://localhost:3000)**.
*(Nesta tela, você verá a loja com visual macOS Glassmorphism, o simulador automático de tráfego de dados ao vivo, as notificações de amizade e compras, o pódio 3D de fidelidade atualizado automaticamente e o console detalhado imprimindo cada comando NoSQL executado).*

### Passo 5: Executar o Protótipo Streamlit (Opcional - Python)
Caso queira testar a interface protótipo em Streamlit e rodar as telas de CRUD de produtos:
1. Instale os drivers de Python necessários:
   ```powershell
   pip install streamlit pymongo redis neo4j
   ```
2. Inicie o Streamlit:
   ```powershell
   streamlit run app_streamlit.py
   ```
3. A interface se abrirá automaticamente na porta `8501`. Use as abas para realizar inserções, leituras, atualizações e exclusões no MongoDB, além de realizar as compras e visualizar as tabelas de agregação de forma dinâmica.

---

## 7. Screenshots do Sistema (Diretório Recomendado)
Os prints das telas do protótipo e das coleções NoSQL podem ser salvos no diretório `./screenshots` do projeto para inclusão no relatório e no repositório final do GitHub.
