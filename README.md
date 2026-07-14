# Pulse Commerce - E-commerce Social & Gamificado NoSQL

Este repositório contém a implementação completa do **Pulse Commerce**, um projeto de e-commerce social e gamificado baseado em uma arquitetura de **Persistência Poliglota NoSQL**. O projeto utiliza de forma combinada os bancos **MongoDB** (documental), **Redis** (chave-valor) e **Neo4j** (grafos) para atender a regras de negócios de alta escalabilidade e dinâmica social de compras.

---

## 🔗 Links de Acesso Online (Projeto Rodando na Web)
* **🛍️ E-Commerce Principal (Express/Vis.js)**: [https://4ebda994d46298aa-191-11-33-173.serveousercontent.com](https://4ebda994d46298aa-191-11-33-173.serveousercontent.com)
* **📊 Painel Streamlit (CRUD NoSQL & Autenticação)**: [https://171d59439e455307-191-11-33-173.serveousercontent.com](https://171d59439e455307-191-11-33-173.serveousercontent.com)

*(Nota: Os links estão ativos e conectados de forma segura aos servidores e bancos de dados NoSQL do projeto).*

---

## 1. Tema do Projeto e Funcionalidade de Maior Valor

### 1.1. Tema
O **Pulse Commerce** é uma plataforma que integra a motivação competitiva (tabela de classificação/leaderboard) e social (recomendações e influência) ao processo de compras tradicional. Ele resolve a rigidez do modelo relacional ao delegar a cada tipo de banco NoSQL a tarefa em que ele possui o melhor desempenho teórico e prático.

### 1.2. Funcionalidade de Maior Valor: O Checkout Poliglota Coordenado
A funcionalidade de maior valor para o sistema é o **Checkout de Compra com Motor de Influência**. Quando um usuário finaliza uma compra:
1. O sistema lê as informações temporárias do seu carrinho em cache no **Redis** (`HGETALL`).
2. Persiste e atualiza o histórico de compras e as conexões de rede social no **Neo4j** (criação de arestas `[:BOUGHT]`).
3. Executa um algoritmo de **Social Influence** no **Neo4j**: caso um amigo desse usuário tenha feito uma indicação ativa (`[:RECOMMENDED]`) daquele produto para ele, a indicação é consumida e o amigo influenciador recebe **+100 Pulse Points** diretamente no sorted set do **Redis** (`ZINCRBY`).
4. O próprio comprador recebe **+50 Pulse Points** por item comprado no **Redis** (`ZINCRBY`).
5. Um documento histórico estruturado detalhando a compra (com data, valores, quantidades e produtos) é registrado no **MongoDB** na coleção `activities` para auditoria e feeds.
6. O carrinho é limpo no **Redis** (`DEL`).

Tudo isso ocorre de forma coordenada em uma única transação lógica de negócio na camada de aplicação.

---

## 2. Modelagem de Dados NoSQL e Exemplos de Documentos

### 2.1. Hierarquia de Informações e Agregações
* **MongoDB (Documentos)**: Gerencia dados complexos, semi-estruturados e extensíveis. Contém o catálogo de produtos (onde cada item pode ter especificações variadas sem alterar um esquema) e o log social de atividades.
* **Redis (Chave-Valor)**: Gerencia dados altamente voláteis e de acesso ultra-rápido. Armazena os itens de carrinhos ativos e o ranking de pontuações ordenado automaticamente em memória.
* **Neo4j (Grafos)**: Mapeia as relações de rede social (quem é amigo de quem, quem comprou o quê, e quem indicou um produto para quem).

### 2.2. Exemplos de Estruturas e Documentos do Sistema

#### A. Coleção `products` (MongoDB)
Coleção documental flexível (*schemaless*) contendo metadados e atributos variados dependendo da categoria do item.
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

#### B. Coleção `activities` (MongoDB)
Armazena o log histórico de ações com finalidade de auditoria e alimentação de feed de atividades dos usuários.
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

#### C. Carrinho de Compras `cart:userId` (Redis HASH)
Armazenamento chave-valor na estrutura de Hash. A chave do hash é `cart:<id_do_usuario>` e contém mapeamentos de `<id_do_produto> -> <quantidade>`.
```bash
# Redis HGETALL cart:charlie
1) "prod_coffee_04"
2) "2"
```

#### D. Leaderboard `leaderboard` (Redis SORTED SET)
Tabela de pontos mantida em ordem decrescente de pontos em memória.
```bash
# Redis ZREVRANGE leaderboard 0 -1 WITHSCORES
1) "alice"
2) "150"
3) "bob"
4) "100"
```

#### E. Contador de Visitantes Únicos `unique_visitors:YYYY-MM-DD` (Redis HYPERLOGLOG - Estrutura Probabilística)
Estrutura probabilística para estimar a quantidade de usuários únicos (cardinalidade) ativos diariamente, com uso de memória fixo extremamente reduzido (máximo de 12KB por dia) e margem de erro de apenas 0,81%.
```bash
# Redis PFADD unique_visitors:2026-07-14 "alice"
(integer) 1   # Retorna 1 se o elemento foi adicionado, ou 0 se já existia no HLL

# Redis PFCOUNT unique_visitors:2026-07-14
(integer) 1   # Retorna o total estimado de visitantes únicos naquele dia
```

#### F. Nós e Relações do Grafo (Neo4j)
* **Nós**:
  * `(:User {id: "alice", name: "Alice Silva"})`
  * `(:Product {id: "prod_phone_01", name: "Quantum Phone Z"})`
* **Relacionamentos**:
  * `(User {id: "alice"})-[:FRIEND]->(User {id: "bob"})` (Amizade)
  * `(User {id: "charlie"})-[:BOUGHT]->(Product {id: "prod_keyboard_02"})` (Compra)
  * `(User {id: "eve"})-[:RECOMMENDED {to: "alice"}]->(Product {id: "prod_headphone_05"})` (Indicação de compra pendente)

---

## 3. Protótipo de Interface Streamlit (Python)

Como parte dos requisitos acadêmicos, criamos o arquivo [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py), um protótipo de interface visual em Python que implementa a funcionalidade principal e um **CRUD completo (Create, Read, Update, Delete)** sobre a base do MongoDB.

### 3.1. Funcionalidades do Protótipo Streamlit
1. **Loja & Checkout Poliglota**: Permite que você selecione o usuário ativo, visualize o catálogo, monte seu carrinho (gravado no Redis), veja os amigos que também compraram o item (consulta Neo4j) e finalize a compra executando a transação unificada.
2. **CRUD de Produtos (MongoDB)**:
   * **FIND (Read)**: Campo de busca para filtrar produtos por nome ou categoria e expandir para ler as especificações técnicas livres salvas no formato JSON.
   * **INSERT (Create)**: Formulário completo para inserir novos produtos com especificações dinâmicas flexíveis (JSON) sincronizando a criação do nó correspondente no Neo4j.
   * **UPDATE (Update)**: Permite selecionar qualquer produto e editar seu preço, categoria e especificações técnicas.
   * **DELETE (Delete)**: Exclusão lógica e física do produto no MongoDB e remoção automática de suas referências no Neo4j.
3. **Analytics & NoSQL Status**: Visualização direta do Leaderboard em tempo real direto do Redis e o log histórico de atividades do MongoDB.

---

## 4. MongoDB Aggregation Pipelines (Análise Avançada)

Implementamos e testamos **dois pipelines de agregação complexos** para analisar os dados de vendas gerados no MongoDB. A execução dessas consultas pode ser feita rodando `node run_aggregations.js`.

### 4.1. Pipeline 1: Faturamento e Volume de Vendas por Categoria
Este pipeline junta os logs de compras com a coleção de produtos e gera um relatório contendo a receita total, a quantidade de itens vendidos e os nomes de produtos distintos por categoria de e-commerce.

#### Código do Pipeline:
```javascript
const pipeline1 = [
  // 1. Filtrar apenas atividades que representam compras
  { $match: { type: 'purchase' } },
  // 2. Realizar junção (lookup) com a coleção de produtos para buscar a categoria
  {
    $lookup: {
      from: 'products',
      localField: 'productId',
      foreignField: '_id',
      as: 'productDetails'
    }
  },
  // 3. Desestruturar a array resultante do lookup
  { $unwind: '$productDetails' },
  // 4. Agrupar por categoria e calcular somas e conjuntos de itens
  {
    $group: {
      _id: '$productDetails.category',
      totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalQuantitySold: { $sum: '$quantity' },
      productsSold: { $addToSet: '$productDetails.name' }
    }
  },
  // 5. Projetar a saída limpa, arredondar valores e contar produtos únicos
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
  // 6. Ordenar por faturamento de forma decrescente
  { $sort: { totalRevenue: -1 } }
];
```

#### Saída JSON Real da Agregação:
```json
[
  {
    "totalQuantitySold": 2,
    "category": "Eletrônicos",
    "totalRevenue": 4198,
    "uniqueProductsCount": 2,
    "productsList": [
      "Quantum Phone Z",
      "Smartwatch FitPulse Active"
    ]
  },
  {
    "totalQuantitySold": 1,
    "category": "Monitores",
    "totalRevenue": 2499,
    "uniqueProductsCount": 1,
    "productsList": [
      "Monitor UltraWide Curved"
    ]
  },
  {
    "totalQuantitySold": 3,
    "category": "Periféricos",
    "totalRevenue": 1249.7,
    "uniqueProductsCount": 2,
    "productsList": [
      "Teclado Mecânico CyberClick",
      "Mouse Wireless Neon Glide"
    ]
  },
  {
    "totalQuantitySold": 1,
    "category": "Áudio",
    "totalRevenue": 499,
    "uniqueProductsCount": 1,
    "productsList": [
      "Caixa de Som BassBox X"
    ]
  }
]
```

---

### 4.2. Pipeline 2: Análise de Engajamento e Ticket Médio por Usuário
Este pipeline analisa o volume de compras de cada usuário, calculando o valor total gasto, o número de itens comprados, a quantidade de pedidos finalizados e o ticket médio por compra.

#### Código do Pipeline:
```javascript
const pipeline2 = [
  // 1. Filtrar apenas eventos de compra
  { $match: { type: 'purchase' } },
  // 2. Agrupar por usuário acumulando quantidades, preços e ocorrências
  {
    $group: {
      _id: '$userId',
      name: { $first: '$userName' },
      totalSpent: { $sum: { $multiply: ['$quantity', '$price'] } },
      totalItemsBought: { $sum: '$quantity' },
      purchaseCount: { $sum: 1 }
    }
  },
  // 3. Projetar e calcular o ticket médio por compra de cada usuário
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
  // 4. Ordenar do usuário que gastou mais para o que gastou menos
  { $sort: { totalSpent: -1 } }
];
```

#### Saída JSON Real da Agregação:
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
  },
  {
    "name": "David Oliveira",
    "totalItemsBought": 2,
    "purchaseCount": 1,
    "userId": "david",
    "totalSpent": 699.8,
    "averageTicket": 699.8
  },
  {
    "name": "Eve Santos",
    "totalItemsBought": 1,
    "purchaseCount": 1,
    "userId": "eve",
    "totalSpent": 699,
    "averageTicket": 699
  },
  {
    "name": "Charlie Costa",
    "totalItemsBought": 1,
    "purchaseCount": 1,
    "userId": "charlie",
    "totalSpent": 549.9,
    "averageTicket": 549.9
  }
]
```

---

## 5. Instruções de Instalação e Execução

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

## 6. Screenshots do Sistema (Diretório Recomendado)
Os prints das telas do protótipo e das coleções NoSQL podem ser salvos no diretório `./screenshots` do projeto para inclusão no relatório e no repositório final do GitHub.
