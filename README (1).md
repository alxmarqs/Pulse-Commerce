# Pulse Commerce: Arquitetura de E-commerce Social e Gamificado

## 1. Visão Geral
O **Pulse Commerce** é uma plataforma de e-commerce projetada para integrar dinâmicas sociais e competitivas ao processo de compra. O projeto foi desenvolvido sob o paradigma de **Persistência Poliglota**, utilizando diferentes modelos de bases de dados NoSQL para resolver problemas específicos de escalabilidade, flexibilidade de catálogo e processamento de relações complexas.

A proposta central é transpor a lógica de motivação do projeto *DietRats* para o setor de retalho, utilizando o comportamento de grupo e rankings de fidelidade como motores de conversão.

## 2. Fundamentação Técnica
O sistema abandona a rigidez do modelo relacional tradicional em favor de uma arquitetura distribuída e *schemaless*, focada em três pilares principais:

### 2.1. Processamento de Relações Complexas (Modelo de Grafos)
* **Tecnologia:** Neo4j
* **Aplicação:** Mapeamento da rede social de consumidores, círculos de influência e histórico de interações.
* **Justificativa:** A utilização de grafos permite consultas transversais de alta performance para identificar padrões de compra entre amigos e calcular graus de influência, viabilizando o sistema de recompensas coletivas.

### 2.2. Gestão de Conteúdo e Catálogo (Modelo de Documentos)
* **Tecnologia:** MongoDB
* **Aplicação:** Armazenamento do catálogo de produtos e feed de atividades sociais.
* **Justificativa:** O modelo de documentos soluciona o problema da incompatibilidade de impedância e permite que o catálogo de produtos seja extensível sem a necessidade de migrações de esquema (*downtime*), suportando múltiplos atributos por categoria.

### 2.3. Alta Disponibilidade e Desempenho (Modelo Chave-Valor)
* **Tecnologia:** Redis
* **Aplicação:** Gestão de sessões, carrinhos de compras ativos e tabelas de classificação (leaderboards) em tempo real.
* **Justificativa:** Garante latência mínima em operações de escrita e leitura de alta frequência, essenciais para a manutenção da competitividade entre os usuários.

## 3. Atributos do Sistema
* **Escalabilidade Horizontal:** Projetado para operação em clusters, permitindo o aumento da capacidade de processamento conforme a demanda.
* **Persistência Poliglota:** Seleção estratégica do motor de base de dados com base nas características da entidade e do acesso ao dado.
* **Gamificação Social:** Implementação de rankings e gatilhos de venda baseados em comportamento coletivo e escassez social (FOMO).

## 4. Estrutura de Implementação
O projeto está estruturado para suportar uma arquitetura orientada a eventos, onde cada ação do utilizador (compra, visualização ou recomendação) propaga atualizações de estado entre os diferentes modelos de dados de forma assíncrona e eficiente.
<img width="870" height="875" alt="image" src="https://github.com/user-attachments/assets/ec9a46a4-5e68-4416-ad42-951260ed6ae0" />


## 5. Referências Bibliográficas
* SADALAGE, P. J.; FOWLER, M. **NoSQL Distilled: A Brief Guide to the Emerging World of Polyglot Persistence**. Addison-Wesley, 2012.
