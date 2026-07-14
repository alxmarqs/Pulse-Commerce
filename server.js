const express = require('express');
const path = require('path');
const {
  connectMongo,
  getMongoCollection,
  connectNeo4j,
  runCypher,
  connectRedis,
  redisDb,
  logClients,
  broadcastLog
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve frontend static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Server-Sent Events (SSE) route for database logs
app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logClients.push(res);
  console.log(`Log Client connected. Total clients: ${logClients.length}`);

  // Send initial message
  res.write('data: {"message": "Logs connection established"}\n\n');

  req.on('close', () => {
    logClients.splice(logClients.indexOf(res), 1);
    console.log(`Log Client disconnected. Total clients: ${logClients.length}`);
  });
});

// --- API ROUTES ---

// 1. PRODUCTS (MongoDB)
app.get('/api/products', async (req, res) => {
  const { userid } = req.headers; // Active user ID to find social connections
  const userId = userid || 'alice';

  try {
    // 1. Fetch catalog from MongoDB (Documental)
    const productsColl = getMongoCollection('products');
    const productsCursor = productsColl.find({});
    const products = await productsCursor.toArray();

    // 2. Fetch social purchases from Neo4j (Grafos)
    // Find which friends of the active user bought these products
    const socialCypher = `
      MATCH (u:User {id: $userId})-[:FRIEND]-(f:User)-[:BOUGHT]->(p:Product)
      RETURN p.id AS productId, collect(DISTINCT f.name) AS friends
    `;
    const socialResult = await runCypher(socialCypher, { userId });
    
    // Map Neo4j results: productId -> array of friend names
    const socialMap = {};
    socialResult.records.forEach(record => {
      socialMap[record.get('productId')] = record.get('friends');
    });

    // 3. Merge MongoDB documents with Neo4j graph recommendations
    const enrichedProducts = products.map(p => ({
      ...p,
      friendsWhoBought: socialMap[p._id] || []
    }));

    res.json(enrichedProducts);
  } catch (error) {
    console.error('Error fetching enriched products:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, price, category, image, specs } = req.body;
  if (!id || !name || !price || !category) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }

  try {
    const productsColl = getMongoCollection('products');
    
    // Create the document
    const productDoc = {
      _id: id,
      name,
      price: parseFloat(price),
      category,
      image: image || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400',
      specs: specs || {}
    };

    await productsColl.insertOne(productDoc);
    
    // Create product node in Neo4j for social relations
    await runCypher(
      'CREATE (p:Product {id: $id, name: $name})',
      { id, name }
    );

    // Log in MongoDB activity feed
    const activitiesColl = getMongoCollection('activities');
    await activitiesColl.insertOne({
      timestamp: new Date().toISOString(),
      userId: 'admin',
      userName: 'Admin',
      type: 'product_created',
      description: `Novo produto criado: "${name}" na categoria "${category}"!`
    });

    res.json({ success: true, message: 'Product created in MongoDB & Neo4j successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. ACTIVE USER & SESSION INFORMATION
app.get('/api/users', async (req, res) => {
  try {
    const cypher = 'MATCH (u:User) RETURN u.id AS id, u.name AS name ORDER BY u.name';
    const result = await runCypher(cypher);
    const users = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name')
    }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users from Neo4j:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Missing userId or name' });
  }

  try {
    // 1. Create User Node in Neo4j
    await runCypher(
      'CREATE (u:User {id: $id, name: $name})',
      { id, name }
    );

    // 2. Add User to Redis Leaderboard with 0 score
    await redisDb.zAdd('leaderboard', 0, id);

    // 3. Log in MongoDB activity feed
    const activitiesColl = getMongoCollection('activities');
    await activitiesColl.insertOne({
      timestamp: new Date().toISOString(),
      userId: id,
      userName: name,
      type: 'user_created',
      description: `Novo usuário cadastrado no sistema: ${name} (@${id})!`
    });

    res.json({ success: true, message: 'User created in Neo4j & Redis successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. CART MANAGEMENT (Redis Chave-Valor + MongoDB Catalogo metadata)
app.get('/api/cart', async (req, res) => {
  const { userid } = req.headers;
  const userId = userid || 'alice';

  try {
    // Fetch cart keys and values from Redis Hash
    const cartHash = await redisDb.hGetAll(`cart:${userId}`);
    
    if (!cartHash || Object.keys(cartHash).length === 0) {
      return res.json([]);
    }

    // Resolve product metadata using MongoDB for each product in the Redis cart
    const productsColl = getMongoCollection('products');
    const cartItems = [];

    for (const [prodId, qtyStr] of Object.entries(cartHash)) {
      const qty = parseInt(qtyStr, 10);
      const product = await productsColl.findOne({ _id: prodId });
      if (product) {
        cartItems.push({
          product,
          quantity: qty
        });
      } else {
        // If product was deleted, remove it from cart
        await redisDb.hDel(`cart:${userId}`, prodId);
      }
    }

    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart from Redis/MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: 'Missing userId or productId' });
  }

  try {
    const qty = quantity || 1;
    // Store in Redis Hash
    await redisDb.hSet(`cart:${userId}`, productId, qty.toString());
    res.json({ success: true, message: 'Item added/updated in Redis cart' });
  } catch (error) {
    console.error('Error updating Redis cart:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ error: 'Missing userId or productId' });
  }

  try {
    await redisDb.hDel(`cart:${userId}`, productId);
    res.json({ success: true, message: 'Item removed from Redis cart' });
  } catch (error) {
    console.error('Error removing item from Redis cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. CHECKOUT (Poliglota: Redis -> Neo4j -> Redis -> MongoDB)
app.post('/api/checkout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // A. Read cart from Redis Hash
    const cartHash = await redisDb.hGetAll(`cart:${userId}`);
    if (!cartHash || Object.keys(cartHash).length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Get user details from Neo4j to record logs
    const userResult = await runCypher('MATCH (u:User {id: $userId}) RETURN u.name AS name', { userId });
    if (userResult.records.length === 0) {
      return res.status(404).json({ error: 'User not found in Neo4j' });
    }
    const userName = userResult.records[0].get('name');

    const productsColl = getMongoCollection('products');
    const activitiesColl = getMongoCollection('activities');
    const itemsBought = [];
    let totalPointsEarned = 0;

    // B. Process each item in cart
    for (const [prodId, qtyStr] of Object.entries(cartHash)) {
      const quantity = parseInt(qtyStr, 10);
      const product = await productsColl.findOne({ _id: prodId });
      
      if (!product) continue;
      itemsBought.push({ product, quantity });

      // 1. Create BOUGHT relationship in Neo4j
      await runCypher(
        `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
         CREATE (u)-[:BOUGHT {timestamp: datetime(), quantity: $quantity}]->(p)`,
        { userId, prodId, quantity }
      );

      // 2. Award Purchase Points in Redis Leaderboard
      const purchasePoints = 50 * quantity;
      totalPointsEarned += purchasePoints;
      await redisDb.zIncrBy('leaderboard', purchasePoints, userId);

      // 3. Check for SOCIAL INFLUENCE in Neo4j
      // Did any friend recommend this product to the buyer?
      const influenceResult = await runCypher(
        `MATCH (f:User)-[r:RECOMMENDED {to: $userId}]->(p:Product {id: $prodId})
         RETURN f.id AS friendId, f.name AS friendName`,
        { userId, prodId }
      );

      for (const record of influenceResult.records) {
        const friendId = record.get('friendId');
        const friendName = record.get('friendName');
        
        // Award influence reward points in Redis
        const rewardPoints = 100;
        await redisDb.zIncrBy('leaderboard', rewardPoints, friendId);

        // Remove the recommendation so it is consumed (or delete relationship)
        await runCypher(
          `MATCH (f:User {id: $friendId})-[r:RECOMMENDED {to: $userId}]->(p:Product {id: $prodId})
           DELETE r`,
          { friendId, userId, prodId }
        );

        // Record influence in MongoDB activity feed
        await activitiesColl.insertOne({
          timestamp: new Date().toISOString(),
          userId: friendId,
          userName: friendName,
          type: 'influence_reward',
          description: `${friendName} ganhou ${rewardPoints} Pulse Points porque Alice comprou o ${product.name} sob sua recomendação!`
        });
      }

      // 4. Record purchase activity in MongoDB (structured for aggregation queries!)
      await activitiesColl.insertOne({
        timestamp: new Date().toISOString(),
        userId,
        userName,
        type: 'purchase',
        productId: prodId,
        quantity: parseInt(quantity, 10),
        price: parseFloat(product.price),
        description: `${userName} comprou ${quantity}x ${product.name} e acumulou ${purchasePoints} Pulse Points!`
      });
    }

    // C. Clear cart in Redis
    await redisDb.del(`cart:${userId}`);

    res.json({
      success: true,
      message: 'Checkout completed successfully!',
      itemsBought,
      pointsEarned: totalPointsEarned
    });
  } catch (error) {
    console.error('Error during checkout transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. GAMIFICATION (Redis sorted sets + Neo4j User metadata)
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Query Redis Leaderboard Sorted Set in reverse order (high to low scores)
    const leaderboardRaw = await redisDb.zRevRangeWithScores('leaderboard', 0, 9);
    
    if (leaderboardRaw.length === 0) {
      return res.json([]);
    }

    // node-redis returns array of objects: { value: 'alice', score: 150 }
    const result = [];
    for (const entry of leaderboardRaw) {
      // Resolve user's actual name from Neo4j
      const nameResult = await runCypher('MATCH (u:User {id: $id}) RETURN u.name AS name', { id: entry.value });
      const name = nameResult.records.length > 0 ? nameResult.records[0].get('name') : entry.value;

      result.push({
        userId: entry.value,
        name,
        score: entry.score
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching leaderboard from Redis/Neo4j:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. SOCIAL NETWORK & GRAPH DATA (Neo4j)
app.get('/api/social', async (req, res) => {
  try {
    // A. Query nodes (Users and Products)
    const usersResult = await runCypher('MATCH (u:User) RETURN u.id AS id, u.name AS name');
    const productsResult = await runCypher('MATCH (p:Product) RETURN p.id AS id, p.name AS name');

    // B. Query relationships
    const friendsResult = await runCypher('MATCH (a:User)-[:FRIEND]->(b:User) RETURN a.id AS from, b.id AS to');
    const boughtResult = await runCypher('MATCH (a:User)-[:BOUGHT]->(p:Product) RETURN a.id AS from, p.id AS to');
    const recommendedResult = await runCypher('MATCH (a:User)-[r:RECOMMENDED]->(p:Product) RETURN a.id AS from, p.id AS to, r.to AS targetId');

    const nodes = [];
    const edges = [];
    const addedEdges = new Set(); // Prevent duplicates for bi-directional friends

    // Process nodes
    usersResult.records.forEach(r => {
      nodes.push({
        id: r.get('id'),
        label: r.get('name'),
        group: 'users',
        title: `User: ${r.get('name')}`
      });
    });

    productsResult.records.forEach(r => {
      nodes.push({
        id: r.get('id'),
        label: r.get('name'),
        group: 'products',
        title: `Product: ${r.get('name')}`
      });
    });

    // Process Friend edges (bidirectional, add only once in frontend)
    friendsResult.records.forEach(r => {
      const from = r.get('from');
      const to = r.get('to');
      const edgeKey = [from, to].sort().join('-');
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        edges.push({
          from,
          to,
          label: 'amigo',
          color: { color: '#4ade80', highlight: '#22c55e' },
          arrows: { to: { enabled: false }, from: { enabled: false } },
          width: 2
        });
      }
    });

    // Process Purchases (User -> Product)
    boughtResult.records.forEach(r => {
      edges.push({
        from: r.get('from'),
        to: r.get('to'),
        label: 'comprou',
        color: { color: '#3b82f6', highlight: '#2563eb' },
        arrows: 'to',
        dashes: false,
        width: 1.5
      });
    });

    // Process Recommendations (User -> Product, dashed, showing path)
    recommendedResult.records.forEach(r => {
      const from = r.get('from');
      const to = r.get('to');
      const targetId = r.get('targetId');
      
      // Resolve target user name
      edges.push({
        from,
        to,
        label: `indicou p/ ${targetId}`,
        color: { color: '#f59e0b', highlight: '#d97706' },
        arrows: 'to',
        dashes: true,
        width: 1.5
      });
    });

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Error fetching social graph from Neo4j:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recommend a product to a friend (Neo4j + MongoDB log)
app.post('/api/recommend', async (req, res) => {
  const { fromId, toId, productId } = req.body;
  if (!fromId || !toId || !productId) {
    return res.status(400).json({ error: 'Missing fromId, toId, or productId' });
  }

  try {
    // 1. Store recommendation link in Neo4j
    await runCypher(
      `MATCH (from:User {id: $fromId}), (to:User {id: $toId}), (p:Product {id: $productId})
       CREATE (from)-[:RECOMMENDED {to: $toId, timestamp: datetime()}]->(p)`,
      { fromId, toId, productId }
    );

    // Resolve Names for MongoDB logs
    const fromResult = await runCypher('MATCH (u:User {id: $fromId}) RETURN u.name AS name', { fromId });
    const toResult = await runCypher('MATCH (u:User {id: $toId}) RETURN u.name AS name', { toId });
    
    const fromName = fromResult.records.length > 0 ? fromResult.records[0].get('name') : fromId;
    const toName = toResult.records.length > 0 ? toResult.records[0].get('name') : toId;

    const productsColl = getMongoCollection('products');
    const product = await productsColl.findOne({ _id: productId });
    const productName = product ? product.name : productId;

    // 2. Insert feed activity in MongoDB
    const activitiesColl = getMongoCollection('activities');
    await activitiesColl.insertOne({
      timestamp: new Date().toISOString(),
      userId: fromId,
      userName: fromName,
      type: 'recommendation',
      description: `${fromName} recomendou "${productName}" para seu amigo ${toName}!`
    });

    res.json({ success: true, message: 'Recommendation recorded in Neo4j & logged in MongoDB' });
  } catch (error) {
    console.error('Error recording recommendation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add friendship between users (Neo4j)
app.post('/api/social/friend', async (req, res) => {
  const { userId1, userId2 } = req.body;
  if (!userId1 || !userId2) {
    return res.status(400).json({ error: 'Missing userId1 or userId2' });
  }

  try {
    await runCypher(
      `MATCH (a:User {id: $userId1}), (b:User {id: $userId2})
       MERGE (a)-[:FRIEND]->(b)
       MERGE (b)-[:FRIEND]->(a)`,
      { userId1, userId2 }
    );
    res.json({ success: true, message: 'Friendship created in Neo4j' });
  } catch (error) {
    console.error('Error creating friendship in Neo4j:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. PROBABILISTIC DATA STRUCTURES (Redis HyperLogLog)
// Register a page visit (PFADD)
app.post('/api/analytics/visit', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `unique_visitors:${today}`;

    const startAdd = Date.now();
    const isNew = await redisDb.pfAdd(key, userId);
    const addDuration = Date.now() - startAdd;

    const startCount = Date.now();
    const count = await redisDb.pfCount(key);
    const countDuration = Date.now() - startCount;

    // Log the commands in the SSE log stream
    broadcastLog('Redis', `PFADD ${key} "${userId}" -> Result: ${isNew === 1 ? 'New User Counted' : 'User Already Exists'}`, addDuration);
    broadcastLog('Redis', `PFCOUNT ${key} -> Estimated Cardinality: ${count}`, countDuration);

    res.json({ success: true, count, isNew: isNew === 1 });
  } catch (error) {
    console.error('Error logging visit in Redis HyperLogLog:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current unique visitors count (PFCOUNT)
app.get('/api/analytics/unique-visitors', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `unique_visitors:${today}`;
    
    const start = Date.now();
    const count = await redisDb.pfCount(key);
    const duration = Date.now() - start;

    broadcastLog('Redis', `PFCOUNT ${key} -> Estimated Cardinality: ${count}`, duration);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching cardinality from Redis HyperLogLog:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. ACTIVITIES (MongoDB)
app.get('/api/activities', async (req, res) => {
  try {
    const activitiesColl = getMongoCollection('activities');
    const activitiesCursor = activitiesColl.find({}).sort({ timestamp: -1 }).limit(15);
    const activities = await activitiesCursor.toArray();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities from MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- SERVER INITIALIZATION ---

async function startServer() {
  try {
    console.log('Connecting to databases...');
    // Connect to MongoDB
    await connectMongo();
    // Connect to Neo4j
    connectNeo4j();
    // Connect to Redis
    await connectRedis();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Pulse Commerce Server running on http://localhost:${PORT}`);
      console.log(`📌 Logs SSE stream available on http://localhost:${PORT}/api/logs`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('CRITICAL ERROR: Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
