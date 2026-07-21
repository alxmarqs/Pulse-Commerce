# ☁️ Guia de Hospedagem Nuvem: Arquitetura NoSQL Completa

Este guia explica como hospedar o **Pulse Commerce** de forma 100% gratuita na nuvem, dividindo a arquitetura em três camadas de bancos de dados gerenciados e duas plataformas de servidores web.

---

## 🛠️ Visão Geral da Arquitetura Cloud-Native

```mermaid
graph TD
    Client([📱 Usuários / Navegadores])
    
    subgraph Servidores Web (Hospedados na Nuvem)
        Render[🚀 Render.com<br/>Node.js Storefront]
        StreamlitCloud[📊 Streamlit Cloud<br/>Python Admin Dashboard]
    end
    
    subgraph Bancos de Dados NoSQL (Bancos Gerenciados Gratuitos)
        Atlas[(🍃 MongoDB Atlas<br/>Coleções & Logs)]
        Upstash[(⚡ Upstash Redis<br/>Carrinhos & Leaderboard)]
        Aura[(🕸️ Neo4j AuraDB<br/>Rede Social & Grafos)]
    end

    Client -->|HTTPS| Render
    Client -->|HTTPS| StreamlitCloud
    
    Render --> Atlas
    Render --> Upstash
    Render --> Aura
    
    StreamlitCloud --> Atlas
    StreamlitCloud --> Upstash
    StreamlitCloud --> Aura
```

---

## 💾 Passo 1: Criando os Bancos de Dados NoSQL (Gratuitos)

### A. MongoDB Atlas (Banco Documental)
1. Acesse [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) e crie uma conta gratuita.
2. Crie um novo Cluster selecionando a opção **M0 (Free)**.
3. Escolha o provedor de nuvem (ex: AWS) e a região mais próxima (ex: `us-east-1` ou `sa-east-1`).
4. Em **Security**, configure:
   * **Database Access**: Crie um usuário (ex: `db_user`) e uma senha forte.
   * **Network Access**: Adicione o IP `0.0.0.0/0` (permitir conexões de qualquer lugar, necessário para o Render e Streamlit Cloud).
5. Clique em **Connect** -> **Drivers** e copie a sua URI de conexão. Ela será parecida com:
   `mongodb+srv://<usuario>:<senha>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
6. Substitua `<usuario>` e `<senha>` pelos dados que você criou e adicione `/pulse_commerce` antes de `?` na URI.

### B. Upstash Redis (Cache e Rankings)
1. Acesse [upstash.com](https://upstash.com) e crie uma conta gratuita com seu GitHub ou Google.
2. Clique em **Create Database**.
3. Dê um nome ao banco (ex: `pulse-redis`), selecione o tipo **Redis**, e escolha a região.
4. Na aba **Details**, role até a seção **Connection API** e copie o endereço listado sob **Redis URL**. Ele começará com `redis://` (ou `rediss://` para conexão SSL segura). Exemplo:
   `redis://default:suasenhasupereficaz@us1-fine-snail-40112.upstash.io:40112`

### C. Neo4j AuraDB (Banco de Grafos)
1. Acesse [neo4j.com/cloud/auradb](https://neo4j.com/cloud/auradb/) e cadastre-se na conta gratuita.
2. Crie uma nova instância selecionando a opção **Aura Free**.
3. Faça o download do arquivo de credenciais (que contém a senha do usuário `neo4j`).
4. Copie a **Connection URL** da sua instância. Ela começará com `neo4j+s://`. Exemplo:
   `neo4j+s://e7a38b29.databases.neo4j.io`

---

## 🚀 Passo 2: Hospedando o E-Commerce Principal (Node.js no Render)

O **Render.com** permite hospedar serviços web diretamente a partir do seu repositório do GitHub de forma automática.

1. Acesse [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New** -> **Web Service**.
3. Selecione o seu repositório `Pulse-Commerce`.
4. Configure as seguintes definições do serviço:
   * **Name**: `pulse-commerce-loja` (ou o nome que preferir)
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Role até a seção **Environment Variables** e adicione as seguintes variáveis obtidas no Passo 1:
   * `MONGO_URL` = *Sua URI do MongoDB Atlas*
   * `REDIS_URL` = *Sua URL do Upstash Redis*
   * `NEO4J_URL` = *Sua Connection URL do Neo4j AuraDB*
   * `NEO4J_USER` = `neo4j`
   * `NEO4J_PASSWORD` = *A senha gerada pelo AuraDB*
6. Clique em **Deploy Web Service**. O Render irá baixar seu código, instalar as dependências e subir a aplicação na porta correta!

---

## 📊 Passo 3: Hospedando o Painel de Administração (Streamlit Cloud)

A própria Streamlit possui um serviço de hospedagem em nuvem gratuito integrado com repositórios GitHub.

1. Acesse [share.streamlit.io](https://share.streamlit.io) e conecte sua conta do GitHub.
2. Clique em **New app**.
3. Preencha as informações do repositório:
   * **Repository**: Selecione seu repositório (ex: `alxmarqs/Pulse-Commerce`)
   * **Branch**: `main`
   * **Main file path**: `app_streamlit.py`
4. Clique no ícone de engrenagem (**Settings**) antes de implantar, vá até a aba **Secrets** e insira as variáveis de ambiente em formato TOML:
   ```toml
   MONGO_URL = "Sua URI do MongoDB Atlas"
   REDIS_URL = "Sua URL do Upstash Redis"
   NEO4J_URL = "Sua Connection URL do Neo4j AuraDB"
   NEO4J_USER = "neo4j"
   NEO4J_PASSWORD = "Sua Senha do Neo4j AuraDB"
   ```
5. Clique em **Save** e em **Deploy!**. O Streamlit Cloud preparará o ambiente Python e carregará a tela de login NoSQL.

---

## ⚡ Passo 4: Semeando os Bancos de Dados Cloud (Seed)

Após os três bancos na nuvem estarem ativos, você precisa rodar o script de semente (`seed.js`) uma única vez para limpar e popular as coleções, criar nós, relacionamentos e o leaderboard inicial na nuvem.

Você pode fazer isso rodando o comando localmente no seu terminal, mas apontando as conexões para as URIs da nuvem:

```powershell
# No Windows PowerShell, defina as variáveis de ambiente temporárias e execute o seed:
$env:MONGO_URL="SUA_URI_MONGODB_ATLAS"
$env:REDIS_URL="SUA_URL_REDIS_UPSTASH"
$env:NEO4J_URL="SUA_URL_NEO4J_AURADB"
$env:NEO4J_USER="neo4j"
$env:NEO4J_PASSWORD="SUA_SENHA_NEO4J"

npm run seed
```

Após rodar este comando, os dados estarão semeados nos seus bancos de dados da nuvem. O Render e o Streamlit Cloud lerão essas informações instantaneamente!
