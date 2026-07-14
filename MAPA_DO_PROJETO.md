# 🗺️ Guia de Implementação: Onde Estão as Tarefas no Projeto?

Este documento serve como um mapa de auditoria para o professor. Ele aponta os arquivos exatos, endpoints e blocos de código que implementam cada requisito solicitado nas tarefas acadêmicas.

---

## 🔗 Links de Acesso Online (Projeto Rodando na Web)
* **🛍️ E-Commerce Principal (Express/Vis.js)**: [https://bf5321b4ebdb11fa-191-11-33-173.serveousercontent.com](https://bf5321b4ebdb11fa-191-11-33-173.serveousercontent.com)
* **📊 Painel Streamlit (CRUD NoSQL & Autenticação)**: [https://f1a85253e4130322-191-11-33-173.serveousercontent.com](https://f1a85253e4130322-191-11-33-173.serveousercontent.com)

---

## 1. Tema do Projeto e Funcionalidade de Maior Valor

### Requisitos:
* *1) Tema do projeto.*
* *2) Descrição da funcionalidade que mais entrega valor no arquivo README.md.*

### Onde encontrar no projeto:
* **Arquivo principal de documentação**: [README.md](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/README.md)
  * **Seção 1.1 (Tema)**: Linhas 5 a 12. Explica o e-commerce social gamificado e a dinâmica de incentivo por pontuações (Pulse Points).
  * **Seção 1.2 (Maior Valor)**: Linhas 14 a 30. Descreve detalhadamente o fluxo do **Checkout Poliglota com Motor de Influência**.
* **Código-fonte do Checkout Poliglota**:
  * **Express Backend (Node.js)**: [server.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/server.js#L235-L350). O endpoint `POST /api/checkout` lê o carrinho do Redis (`hGetAll`), cria compras no Neo4j (`:BOUGHT`), incrementa o ranking no Redis (`zIncrBy`), registra o log histórico estruturado no MongoDB (`activities`) e limpa a sessão do carrinho no Redis (`del`).
  * **Streamlit Frontend (Python)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L110-L167). Lógica de transação poliglota mapeada em Python.

---

## 2. Modelagem de Dados NoSQL e Exemplos de Documentos

### Requisitos:
* *1) Identificação da hierarquia de informações e agregações do sistema.*
* *2) Descrição e exemplo real de um documento/registro de cada coleção.*

### Onde encontrar no projeto:
* **Explicações e Exemplos Acadêmicos**: [README.md](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/README.md)
  * **Seção 2.1 (Hierarquia e Agregações)**: Linhas 34 a 45. Detalha a responsabilidade de cada banco (MongoDB para dados flexíveis e log; Redis para dados rápidos e voláteis; Neo4j para interações sociais complexas).
  * **Seção 2.2 (Exemplos de Documentos)**: Linhas 47 a 103. Contém exemplos JSON de produtos (catálogo documental), logs de atividades, comandos do Redis para hashes (carrinho), sorted sets (leaderboard), HyperLogLog (visitantes), e queries Cypher de nós/relações do Neo4j.

---

## 3. Protótipo Streamlit, Banco Semente e Operações CRUD (MongoDB + Neo4j)

### Requisitos:
* *1) Protótipo de interface da funcionalidade mais importante usando streamlit.*
* *2) Criar e popular as principais coleções (seed).*
* *3) Fazer tela e uso de INSERT, FIND, UPDATE, DELETE para o CRUD.*
* *4) Salvar prints das telas em um diretório no GitHub.*

### Onde encontrar no projeto:
* **Código do Protótipo Streamlit**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py)
* **Script Semente (Popular os 3 bancos)**: [seed.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/seed.js). Executa limpezas e inserções iniciais em lote no MongoDB, Redis e Neo4j.
* **Código das Operações CRUD (Streamlit - Python)**:
  * **Autenticação (Login & Cadastro)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L45-L125). Formulários de cadastro (escreve no Neo4j com senha, cria score no Redis, loga no MongoDB) e login.
  * **FIND (Read / Buscar)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L240-L258). Realiza busca flexível no MongoDB por regex em nome ou categoria (`mongo_db["products"].find(...)`).
  * **INSERT (Create / Criar)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L260-L295). Insere um novo produto documental no MongoDB (`insert_one`) com especificações livres em JSON (schemaless) e cria o nó correspondente no Neo4j.
  * **UPDATE (Update / Atualizar)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L297-L338). Permite selecionar qualquer produto e alterar dados usando `$set` no MongoDB (`update_one`) e sincroniza o novo nome no Neo4j.
  * **DELETE (Delete / Remover)**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L340-L366). Remove o produto do MongoDB (`delete_one`) e remove fisicamente o nó e suas relações de compra/recomendação no Neo4j (`DETACH DELETE`).
* **Diretório de Prints**: Pasta `./screenshots` sugerida na raiz do repositório para o relatório de prints.

---

## 4. MongoDB Aggregation Pipelines (Análise Avançada)

### Requisitos:
* *Escrever, entender e mostrar o resultado de 2 pipelines de agregação utilizando sort, match, lookup, project, unwind, etc.*

### Onde encontrar no projeto:
* **Código, Explicação e Logs de Saída Reais**: [README.md](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/README.md#L112-L256) (Seções 4.1 e 4.2). Contém o código javascript das pipelines, a justificativa analítica de cada estágio e o JSON real de saída.
* **Script de Execução em Terminal**: [run_aggregations.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/run_aggregations.js)
  * **Pipeline 1 (Faturamento por Categoria)**: Linhas 12 a 43. Usa os estágios `$match`, `$lookup`, `$unwind`, `$group`, `$project` e `$sort`. Usa os operadores acumuladores `$sum`, `$multiply`, `$addToSet`, `$size` e `$round`.
  * **Pipeline 2 (Análise de Consumo e Ticket Médio por Usuário)**: Linhas 49 a 80. Usa os estágios `$match`, `$group`, `$project` e `$sort`. Usa os operadores acumuladores `$sum`, `$multiply`, `$first`, `$divide` e `$round`.

---

## 5. Estruturas Comuns e Probabilísticas no Redis

### Requisitos:
* *No Redis, usar estruturas comuns e estruturas probabilísticas para implementar recursos.*

### Onde encontrar no projeto:

#### A. Estruturas Comuns (Hash e Sorted Set)
* **HASH (`cart:userId` - Carrinho de Compras)**:
  * **Adicionar ao Carrinho**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L199) (`r_client.hincrby`).
  * **Listar Itens**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L206) (`r_client.hgetall`).
  * **Consumir e Deletar**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L162) (`r_client.delete`).
  * **Backend Node.js**: [server.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/server.js#L140-L190). Endpoints `/api/cart` usando `hSet`, `hGetAll` e `hDel`.
* **SORTED SET (`leaderboard` - Classificação / Rankings)**:
  * **Incrementar Pontuação**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L137) (`r_client.zincrby`).
  * **Listar Ranks e Pontuações**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L380-L389) (`r_client.zrevrange` com `withscores=True`).
  * **Backend Node.js**: [server.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/server.js#L220-L235). Endpoints `/api/leaderboard` usando `zRevRange` e `zScore`.

#### B. Estruturas Probabilísticas (HyperLogLog)
* **HyperLogLog (`unique_visitors:YYYY-MM-DD` - Contador de Visitantes Únicos Diários)**:
  * **Backend Node.js**: [server.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/server.js#L535-L585). Endpoints `/api/analytics/visit` e `/api/analytics/unique-visitors` que utilizam os comandos probabilísticos **`PFADD`** (registrar o ID do usuário de forma comprimida) e **`PFCOUNT`** (obter a cardinalidade estimada do conjunto de visitantes em tempo O(1) com consumo de memória de no máximo 12KB).
  * **Frontend Web**: [public/index.html](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/public/index.html#L48-L53) (badge visual no header) e [public/app.js](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/public/app.js#L205-L245) (função `trackVisit` disparando chamadas Ajax para `/api/analytics/visit`).
  * **Streamlit Dashboard**: [app_streamlit.py](file:///c:/Users/contr/Dropbox/Particular/Pulse%20Commerce/app_streamlit.py#L68-L76). Executa `r_client.pfadd` e `r_client.pfcount` exibindo os resultados no painel de métricas lateral `st.sidebar.metric`.
