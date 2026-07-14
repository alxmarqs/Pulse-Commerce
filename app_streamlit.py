import streamlit as st
import json
from datetime import datetime
from pymongo import MongoClient
import redis
from neo4j import GraphDatabase

# Configure page style
st.set_page_config(page_title="Pulse Commerce - Streamlit Prototype", layout="wide", page_icon="⚡")

st.title("⚡ Pulse Commerce - Protótipo NoSQL")
st.markdown("Este protótipo em Streamlit (Python) conecta-se aos mesmos bancos NoSQL (MongoDB, Redis, Neo4j) da aplicação principal.")

# --- DATABASE CONNECTION UTILITIES ---
@st.cache_resource
def get_mongo_client():
    return MongoClient("mongodb://127.0.0.1:27017")

@st.cache_resource
def get_redis_client():
    return redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

@st.cache_resource
def get_neo4j_driver():
    return GraphDatabase.driver("bolt://127.0.0.1:7687", auth=("neo4j", "pulsepassword"))

try:
    mongo_client = get_mongo_client()
    mongo_db = mongo_client["pulse_commerce"]
    
    r_client = get_redis_client()
    
    n4j_driver = get_neo4j_driver()
    
    st.sidebar.success("✅ Bancos NoSQL Conectados (127.0.0.1)")
except Exception as e:
    st.sidebar.error(f"❌ Erro de conexão: {e}")

# Helper for Neo4j queries
def run_cypher(query, params=None):
    with n4j_driver.session() as session:
        result = session.run(query, params or {})
        return [record.data() for record in result]

# --- USER AUTHENTICATION STATE & LOGIC ---
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
if "user_id" not in st.session_state:
    st.session_state.user_id = None
if "user_name" not in st.session_state:
    st.session_state.user_name = None

# Authentication Interface if not logged in
if not st.session_state.logged_in:
    st.markdown("### 🔐 Autenticação NoSQL")
    auth_tab1, auth_tab2 = st.tabs(["🔑 Entrar (Login)", "📝 Criar Conta (Sign Up)"])
    
    with auth_tab1:
        st.write("Entre com suas credenciais do banco de dados Neo4j (ex: `alice` / `alice`, `bob` / `bob`).")
        login_id = st.text_input("ID do Usuário:", key="login_id").lower().strip()
        login_pass = st.text_input("Senha:", type="password", key="login_pass")
        
        if st.button("Entrar", key="btn_login", type="primary"):
            if not login_id or not login_pass:
                st.error("Por favor, preencha todos os campos.")
            else:
                try:
                    user_data = run_cypher("MATCH (u:User {id: $id}) RETURN u.password AS password, u.name AS name", {"id": login_id})
                    if user_data:
                        stored_password = user_data[0].get("password")
                        stored_name = user_data[0].get("name")
                        
                        if stored_password == login_pass:
                            st.session_state.logged_in = True
                            st.session_state.user_id = login_id
                            st.session_state.user_name = stored_name
                            st.success(f"Bem-vindo(a), {stored_name}!")
                            st.rerun()
                        else:
                            st.error("Senha incorreta.")
                    else:
                        st.error("Usuário não encontrado.")
                except Exception as ex:
                    st.error(f"Erro ao autenticar no Neo4j: {ex}")
                    
    with auth_tab2:
        st.write("Cadastre uma nova conta. Os dados serão propagados no Neo4j, Redis e MongoDB.")
        new_id = st.text_input("ID do Usuário (minúsculo, sem espaços):", key="new_id").lower().strip()
        new_name = st.text_input("Nome Completo:", key="new_name")
        new_pass = st.text_input("Senha:", type="password", key="new_pass")
        confirm_pass = st.text_input("Confirmar Senha:", type="password", key="confirm_pass")
        
        if st.button("Criar Conta & Inicializar", key="btn_register"):
            if not new_id or not new_name or not new_pass:
                st.error("Todos os campos são obrigatórios.")
            elif new_pass != confirm_pass:
                st.error("As senhas não coincidem.")
            else:
                try:
                    existing = run_cypher("MATCH (u:User {id: $id}) RETURN u.id AS id", {"id": new_id})
                    if existing:
                        st.error("Este ID de usuário já existe.")
                    else:
                        # 1. Create User Node with password in Neo4j
                        run_cypher("CREATE (u:User {id: $id, name: $name, password: $password})", {"id": new_id, "name": new_name, "password": new_pass})
                        # 2. Add score 0 in Redis leaderboard
                        r_client.zadd("leaderboard", {new_id: 0})
                        # 3. Log user registration activity in MongoDB
                        mongo_db["activities"].insert_one({
                            "timestamp": datetime.utcnow().isoformat(),
                            "userId": new_id,
                            "userName": new_name,
                            "type": "user_registered",
                            "description": f"Novo usuário '{new_name}' (@{new_id}) se cadastrou no sistema!"
                        })
                        st.success("Conta criada! Vá para a aba 'Entrar' e faça login.")
                except Exception as ex:
                    st.error(f"Erro ao criar conta: {ex}")
                    
    st.stop()  # Interrompe a renderização do restante do painel

# If logged in, display session status and logout button in sidebar
st.sidebar.markdown(f"### 👤 Usuário Ativo\n**{st.session_state.user_name}** (`@{st.session_state.user_id}`)")
if st.sidebar.button("🚪 Sair (Logout)", use_container_width=True):
    st.session_state.logged_in = False
    st.session_state.user_id = None
    st.session_state.user_name = None
    st.rerun()

# --- NAVIGATION TABS ---
tab_store, tab_crud, tab_analytics = st.tabs([
    "🛒 Loja & Checkout Poliglota (Funcionalidade Principal)",
    "✍️ CRUD de Produtos (MongoDB)",
    "📊 Analytics NoSQL & Leaderboards"
])

# ==========================================
# TAB 1: STORE & POLYGLOT CHECKOUT
# ==========================================
with tab_store:
    st.header("🛍️ Catálogo de Produtos e Checkout Poliglota")
    
    active_user_id = st.session_state.user_id
    selected_user_name = st.session_state.user_name
    st.markdown(f"Logado como: **{selected_user_name}** (`@{active_user_id}`)")
    
    # 2. Track visit in Redis HyperLogLog (Probabilistic Structure)
    try:
        today_str = datetime.now().strftime("%Y-%m-%d")
        hll_key = f"unique_visitors:{today_str}"
        r_client.pfadd(hll_key, active_user_id)
        visitors_count = r_client.pfcount(hll_key)
        st.sidebar.metric("👥 Visitantes Hoje (Redis HLL)", f"{visitors_count} únicos")
    except Exception as ex:
        st.sidebar.warning(f"Aviso HLL: {ex}")
        
    col_products, col_cart = st.columns([2, 1])
    
    with col_products:
        st.subheader("Produtos no Catálogo (MongoDB)")
        products = list(mongo_db["products"].find({}))
        
        for p in products:
            with st.container():
                st.write(f"### {p['name']}")
                st.write(f"**Categoria:** {p['category']} | **Preço:** R$ {p['price']:.2f}")
                
                # Check for recommendations in Neo4j
                try:
                    friends = run_cypher(
                        "MATCH (u:User {id: $userId})-[:FRIEND]-(f:User)-[:BOUGHT]->(p:Product {id: $prodId}) "
                        "RETURN DISTINCT f.name AS friendName",
                        {"userId": active_user_id, "prodId": p["_id"]}
                    )
                    if friends:
                        friend_names = ", ".join([f["friendName"] for f in friends])
                        st.info(f"👥 Amigos que compraram: {friend_names}")
                except Exception:
                    pass
                
                if st.button(f"Adicionar ao Carrinho ({p['name']})", key=f"add_{p['_id']}"):
                    # Save in Redis Hash (cart:userId -> prodId: qty)
                    r_client.hincrby(f"cart:{active_user_id}", p["_id"], 1)
                    st.success(f"Adicionado: 1x {p['name']} no carrinho do Redis!")
                    st.rerun()
                    
    with col_cart:
        st.subheader(f"🛒 Carrinho de {selected_user_name} (Redis)")
        cart_key = f"cart:{active_user_id}"
        cart_items = r_client.hgetall(cart_key)
        
        if not cart_items:
            st.write("O carrinho está vazio.")
        else:
            total_cart = 0.0
            items_list = []
            
            for prod_id, qty in cart_items.items():
                qty = int(qty)
                product = mongo_db["products"].find_one({"_id": prod_id})
                if product:
                    subtotal = product["price"] * qty
                    total_cart += subtotal
                    st.write(f"- **{qty}x {product['name']}** - R$ {product['price']:.2f} (Subtotal: R$ {subtotal:.2f})")
                    items_list.append((product, qty))
                else:
                    r_client.hdel(cart_key, prod_id)
            
            st.write(f"### Total: R$ {total_cart:.2f}")
            
            # Checkout Action (Polyglot Transaction)
            if st.button("Finalizar Compra (Transação Poliglota)", type="primary"):
                try:
                    for product, qty in items_list:
                        # 1. Create Purchase node/edge in Neo4j
                        run_cypher(
                            "MATCH (u:User {id: $userId}), (p:Product {id: $prodId}) "
                            "CREATE (u)-[:BOUGHT {timestamp: datetime(), quantity: $qty}]->(p)",
                            {"userId": active_user_id, "prodId": product["_id"], "qty": qty}
                        )
                        
                        # 2. Award Points in Redis Leaderboard
                        purchase_points = 50 * qty
                        r_client.zincrby("leaderboard", purchase_points, active_user_id)
                        
                        # 3. Check for social recommendations and reward friends
                        recommendations = run_cypher(
                            "MATCH (f:User)-[r:RECOMMENDED {to: $userId}]->(p:Product {id: $prodId}) "
                            "RETURN f.id AS friendId, f.name AS friendName",
                            {"userId": active_user_id, "prodId": product["_id"]}
                        )
                        for rec in recommendations:
                            r_client.zincrby("leaderboard", 100, rec["friendId"])
                            run_cypher(
                                "MATCH (f:User {id: $friendId})-[r:RECOMMENDED {to: $userId}]->(p:Product {id: $prodId}) "
                                "DELETE r",
                                {"friendId": rec["friendId"], "userId": active_user_id, "prodId": product["_id"]}
                            )
                            # Log influence reward in MongoDB
                            mongo_db["activities"].insert_one({
                                "timestamp": datetime.utcnow().isoformat(),
                                "userId": rec["friendId"],
                                "userName": rec["friendName"],
                                "type": "influence_reward",
                                "description": f"{rec['friendName']} ganhou 100 Pulse Points de influência pela compra de {selected_user_name}!"
                            })
                            
                        # 4. Log purchase in MongoDB
                        mongo_db["activities"].insert_one({
                            "timestamp": datetime.utcnow().isoformat(),
                            "userId": active_user_id,
                            "userName": selected_user_name,
                            "type": "purchase",
                            "productId": product["_id"],
                            "quantity": qty,
                            "price": product["price"],
                            "description": f"{selected_user_name} comprou {qty}x {product['name']} (+{purchase_points} pts)!"
                        })
                    
                    # 5. Clear cart in Redis
                    r_client.delete(cart_key)
                    st.balloons()
                    st.success("✅ Compra finalizada! Transações salvas no MongoDB, Redis e Neo4j!")
                    st.rerun()
                except Exception as ex:
                    st.error(f"Erro na transação: {ex}")

# ==========================================
# TAB 2: PRODUCT CRUD (MongoDB)
# ==========================================
with tab_crud:
    st.header("✍️ CRUD de Produtos (Coleção MongoDB)")
    
    crud_mode = st.radio("Selecione a Operação CRUD:", ["FIND (Listar/Buscar)", "INSERT (Criar)", "UPDATE (Atualizar)", "DELETE (Remover)"], horizontal=True)
    
    # --- FIND (Read) ---
    if crud_mode == "FIND (Listar/Buscar)":
        st.subheader("🔍 Buscar Produtos")
        search_query = st.text_input("Filtrar por nome ou categoria:")
        
        if search_query:
            filtered_prods = list(mongo_db["products"].find({
                "$or": [
                    {"name": {"$regex": search_query, "$options": "i"}},
                    {"category": {"$regex": search_query, "$options": "i"}}
                ]
            }))
        else:
            filtered_prods = list(mongo_db["products"].find({}))
            
        for p in filtered_prods:
            with st.expander(f"{p['name']} - R$ {p['price']:.2f} ({p['category']})"):
                st.write(f"**ID:** {p['_id']}")
                st.write("**Especificações técnicas:**")
                st.json(p.get("specs", {}))
                
    # --- INSERT (Create) ---
    elif crud_mode == "INSERT (Criar)":
        st.subheader("➕ Adicionar Novo Produto")
        
        with st.form("insert_product_form"):
            new_id = st.text_input("ID Único (ex: prod_teclado_05):")
            new_name = st.text_input("Nome do Produto:")
            new_price = st.number_input("Preço (R$):", min_value=0.0, step=0.01)
            new_category = st.text_input("Categoria:")
            new_image = st.text_input("URL da Imagem:")
            new_specs_raw = st.text_area("Especificações técnicas (JSON format):", value='{\n  "marca": "NovaMarca",\n  "cor": "Preto"\n}')
            
            submit_insert = st.form_submit_button("Cadastrar Produto")
            
            if submit_insert:
                if not new_id or not new_name or new_price <= 0 or not new_category:
                    st.error("Por favor, preencha os campos obrigatórios.")
                else:
                    try:
                        specs = json.loads(new_specs_raw)
                        product_doc = {
                            "_id": new_id,
                            "name": new_name,
                            "price": new_price,
                            "category": new_category,
                            "image": new_image or "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400",
                            "specs": specs
                        }
                        # Insert in MongoDB
                        mongo_db["products"].insert_one(product_doc)
                        
                        # Also create node in Neo4j for social consistency
                        run_cypher("CREATE (p:Product {id: $id, name: $name})", {"id": new_id, "name": new_name})
                        
                        st.success(f"Produto '{new_name}' cadastrado no MongoDB e Neo4j com sucesso!")
                    except json.JSONDecodeError:
                        st.error("JSON de especificações inválido.")
                    except Exception as ex:
                        st.error(f"Erro ao inserir: {ex}")
                        
    # --- UPDATE (Update) ---
    elif crud_mode == "UPDATE (Atualizar)":
        st.subheader("✏️ Atualizar Produto Existente")
        
        prod_list = list(mongo_db["products"].find({}))
        prod_choices = {p["name"]: p["_id"] for p in prod_list}
        
        select_prod_name = st.selectbox("Selecione o produto para editar:", list(prod_choices.keys()))
        
        if select_prod_name:
            target_id = prod_choices[select_prod_name]
            p = mongo_db["products"].find_one({"_id": target_id})
            
            with st.form("update_product_form"):
                up_name = st.text_input("Nome do Produto:", value=p["name"])
                up_price = st.number_input("Preço (R$):", min_value=0.0, step=0.01, value=float(p["price"]))
                up_category = st.text_input("Categoria:", value=p["category"])
                up_image = st.text_input("URL da Imagem:", value=p.get("image", ""))
                up_specs_raw = st.text_area("Especificações técnicas (JSON):", value=json.dumps(p.get("specs", {}), indent=2, ensure_ascii=False))
                
                submit_update = st.form_submit_button("Salvar Alterações")
                
                if submit_update:
                    try:
                        specs = json.loads(up_specs_raw)
                        mongo_db["products"].update_one(
                            {"_id": target_id},
                            {"$set": {
                                "name": up_name,
                                "price": up_price,
                                "category": up_category,
                                "image": up_image,
                                "specs": specs
                            }}
                        )
                        # Sync name with Neo4j Product Node
                        run_cypher("MATCH (p:Product {id: $id}) SET p.name = $name", {"id": target_id, "name": up_name})
                        
                        st.success(f"Produto '{up_name}' atualizado com sucesso!")
                    except json.JSONDecodeError:
                        st.error("JSON de especificações inválido.")
                    except Exception as ex:
                        st.error(f"Erro ao atualizar: {ex}")
                        
    # --- DELETE (Delete) ---
    elif crud_mode == "DELETE (Remover)":
        st.subheader("❌ Remover Produto")
        
        prod_list = list(mongo_db["products"].find({}))
        prod_choices = {p["name"]: p["_id"] for p in prod_list}
        
        select_prod_name = st.selectbox("Selecione o produto para remover:", list(prod_choices.keys()))
        
        if select_prod_name:
            target_id = prod_choices[select_prod_name]
            
            if st.button(f"Confirmar Exclusão do Produto ({select_prod_name})", type="primary"):
                try:
                    # Delete from MongoDB
                    mongo_db["products"].delete_one({"_id": target_id})
                    
                    # Delete from Neo4j
                    run_cypher("MATCH (p:Product {id: $id}) DETACH DELETE p", {"id": target_id})
                    
                    st.success(f"Produto '{select_prod_name}' removido do MongoDB e Neo4j!")
                    st.rerun()
                except Exception as ex:
                    st.error(f"Erro ao deletar: {ex}")

# ==========================================
# TAB 3: ANALYTICS & NO SQL AGGREGATIONS
# ==========================================
with tab_analytics:
    st.header("📊 Análise e Estatísticas de Bancos NoSQL")
    
    col_lead, col_aggregations = st.columns([1, 2])
    
    with col_lead:
        st.subheader("🏆 Leaderboard de Fidelidade (Redis ZSET)")
        try:
            lead_raw = r_client.zrevrange("leaderboard", 0, 9, withscores=True)
            for idx, (user_id, score) in enumerate(lead_raw):
                # Fetch user name from Neo4j
                name_res = run_cypher("MATCH (u:User {id: $id}) RETURN u.name AS name", {"id": user_id})
                name = name_res[0]["name"] if name_res else user_id
                st.write(f"**{idx+1}º** {name} (`@{user_id}`) — **{int(score)} pts**")
        except Exception as e:
            st.error(f"Erro Redis: {e}")
            
    with col_aggregations:
        st.subheader("📈 Execução de Aggregation Pipelines (MongoDB)")
        
        st.markdown("**1. Faturamento por Categoria (Pipeline 1)**")
        pipeline1 = [
            { "$match": { "type": "purchase" } },
            {
                "$lookup": {
                    "from": "products",
                    "localField": "productId",
                    "foreignField": "_id",
                    "as": "productDetails"
                }
            },
            { "$unwind": "$productDetails" },
            {
                "$group": {
                    "_id": "$productDetails.category",
                    "totalRevenue": { "$sum": { "$multiply": ["$quantity", "$price"] } },
                    "totalQuantitySold": { "$sum": "$quantity" },
                    "productsSold": { "$addToSet": "$productDetails.name" }
                }
            },
            {
                "$project": {
                    "category": "$_id",
                    "totalRevenue": { "$round": ["$totalRevenue", 2] },
                    "totalQuantitySold": 1,
                    "uniqueProductsCount": { "$size": "$productsSold" },
                    "productsList": "$productsSold",
                    "_id": 0
                }
            },
            { "$sort": { "totalRevenue": -1 } }
        ]
        
        try:
            res1 = list(mongo_db["activities"].aggregate(pipeline1))
            st.table(res1)
        except Exception as e:
            st.error(f"Erro Pipeline 1: {e}")
            
        st.markdown("**2. Análise de Compras e Ticket Médio por Usuário (Pipeline 2)**")
        pipeline2 = [
            { "$match": { "type": "purchase" } },
            {
                "$group": {
                    "_id": "$userId",
                    "name": { "$first": "$userName" },
                    "totalSpent": { "$sum": { "$multiply": ["$quantity", "$price"] } },
                    "totalItemsBought": { "$sum": "$quantity" },
                    "purchaseCount": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "userId": "$_id",
                    "name": 1,
                    "totalSpent": { "$round": ["$totalSpent", 2] },
                    "totalItemsBought": 1,
                    "purchaseCount": 1,
                    "averageTicket": { "$round": [{ "$divide": ["$totalSpent", "$purchaseCount"] }, 2] },
                    "_id": 0
                }
            },
            { "$sort": { "totalSpent": -1 } }
        ]
        
        try:
            res2 = list(mongo_db["activities"].aggregate(pipeline2))
            st.table(res2)
        except Exception as e:
            st.error(f"Erro Pipeline 2: {e}")

    # Display MongoDB activity feed
    st.subheader("📰 Log de Atividades Recentes (Coleção MongoDB)")
    try:
        acts = list(mongo_db["activities"].find({}).sort("timestamp", -1).limit(10))
        for a in acts:
            st.text(f"[{a['timestamp']}] {a.get('description', '')}")
    except Exception as e:
        st.error(f"Erro MongoDB: {e}")
