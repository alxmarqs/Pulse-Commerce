const {
  connectMongo,
  getMongoCollection,
  connectNeo4j,
  runCypher,
  connectRedis,
  redisDb,
  mongoClient,
  neo4jDriver,
  redisClient
} = require('./db');

const productsData = [
  {
    _id: "prod_phone_01",
    name: "Quantum Phone Z",
    price: 3499.00,
    category: "Eletrônicos",
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400",
    specs: {
      brand: "QuantumTech",
      screen: "6.7 inch OLED",
      battery: "5000 mAh",
      camera: "108 MP Triple",
      storage: "256 GB"
    }
  },
  {
    _id: "prod_keyboard_02",
    name: "Teclado Mecânico CyberClick",
    price: 549.90,
    category: "Periféricos",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
    specs: {
      switches: "Cherry MX Brown",
      layout: "ABNT2",
      backlight: "RGB Customizável",
      connection: "USB-C Removível"
    }
  },
  {
    _id: "prod_chair_03",
    name: "Cadeira Ergonômica AeroSit",
    price: 1890.00,
    category: "Móveis",
    image: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=400",
    specs: {
      material: "Mesh Premium respirável",
      weight_limit: "150kg",
      armrests: "Ajuste 4D",
      warranty: "5 anos"
    }
  },
  {
    _id: "prod_coffee_04",
    name: "Cafeteira Smart Espresso",
    price: 1299.00,
    category: "Eletrodomésticos",
    image: "https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=400",
    specs: {
      pressure: "19 Bar",
      wifi_connected: true,
      water_tank: "1.8L",
      colors: ["Preto", "Prata"]
    }
  },
  {
    _id: "prod_headphone_05",
    name: "Headphone SoundAura Pro",
    price: 899.00,
    category: "Áudio",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    specs: {
      battery_life: "40 horas",
      bluetooth: "5.2",
      anc_levels: 3,
      codec: "LDAC / AAC"
    }
  },
  {
    _id: "prod_monitor_06",
    name: "Monitor UltraWide Curved",
    price: 2499.00,
    category: "Monitores",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
    specs: {
      size: "34 polegadas",
      resolution: "3440 x 1440 UWQHD",
      refresh_rate: "165Hz",
      panel: "VA Curved 1500R"
    }
  },
  {
    _id: "prod_mouse_07",
    name: "Mouse Wireless Neon Glide",
    price: 349.90,
    category: "Periféricos",
    image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400",
    specs: {
      dpi: "26000 DPI",
      sensor: "PixArt 3395",
      weight: "55g UltraLight",
      battery_life: "Até 80 horas"
    }
  },
  {
    _id: "prod_desk_08",
    name: "Mesa Regulável SmartDesk",
    price: 2790.00,
    category: "Móveis",
    image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400",
    specs: {
      height_range: "70cm - 120cm",
      preset_memories: 4,
      motors: "Dual Motor Silencioso",
      load_capacity: "120kg"
    }
  },
  {
    _id: "prod_watch_09",
    name: "Smartwatch FitPulse Active",
    price: 699.00,
    category: "Eletrônicos",
    image: "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400",
    specs: {
      display: "AMOLED 1.43 polegadas",
      gps: "Integrado Multi-Sistemas",
      sensors: "Batimento, Sono, Oxigênio SpO2",
      water_protection: "5 ATM (50m)"
    }
  },
  {
    _id: "prod_speaker_10",
    name: "Caixa de Som BassBox X",
    price: 499.00,
    category: "Áudio",
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400",
    specs: {
      power: "60W RMS",
      battery_life: "Até 24 horas",
      protection: "IP67 Resistente a Água",
      connection: "Bluetooth 5.3"
    }
  },
  {
    _id: "prod_light_11",
    name: "Luminária Neon Sunset",
    price: 189.90,
    category: "Decoração",
    image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400",
    specs: {
      rgb_colors: "16 milhões de cores",
      control: "App Wi-Fi & Alexa",
      modes: "Sincronização musical",
      power: "USB 5V"
    }
  }
];

const usersData = [
  { id: 'alice', name: 'Alice Silva' },
  { id: 'bob', name: 'Bob Souza' },
  { id: 'charlie', name: 'Charlie Costa' },
  { id: 'david', name: 'David Oliveira' },
  { id: 'eve', name: 'Eve Santos' }
];

async function seed() {
  console.log('--- INICIANDO SEMENTE DE DADOS (SEED) ---');
  
  try {
    // 1. Conectar aos bancos
    await connectMongo();
    connectNeo4j();
    await connectRedis();

    // 2. MongoDB Seed
    console.log('Limpando coleções MongoDB...');
    const productsColl = getMongoCollection('products');
    const activitiesColl = getMongoCollection('activities');
    await productsColl.deleteMany({});
    await activitiesColl.deleteMany({});

    console.log('Inserindo produtos no MongoDB...');
    await productsColl.insertMany(productsData);

    console.log('Inserindo atividades iniciais no MongoDB...');
    await activitiesColl.insertMany([
      {
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        userId: 'alice',
        userName: 'Alice Silva',
        type: 'purchase',
        productId: 'prod_phone_01',
        quantity: 1,
        price: 3499.00,
        description: 'Alice comprou 1x Quantum Phone Z!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        userId: 'charlie',
        userName: 'Charlie Costa',
        type: 'purchase',
        productId: 'prod_keyboard_02',
        quantity: 1,
        price: 549.90,
        description: 'Charlie comprou 1x Teclado Mecânico CyberClick!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        userId: 'bob',
        userName: 'Bob Souza',
        type: 'purchase',
        productId: 'prod_monitor_06',
        quantity: 1,
        price: 2499.00,
        description: 'Bob comprou 1x Monitor UltraWide Curved!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        userId: 'david',
        userName: 'David Oliveira',
        type: 'purchase',
        productId: 'prod_mouse_07',
        quantity: 2,
        price: 349.90,
        description: 'David comprou 2x Mouse Wireless Neon Glide!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        userId: 'eve',
        userName: 'Eve Santos',
        type: 'purchase',
        productId: 'prod_watch_09',
        quantity: 1,
        price: 699.00,
        description: 'Eve comprou 1x Smartwatch FitPulse Active!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        userId: 'alice',
        userName: 'Alice Silva',
        type: 'purchase',
        productId: 'prod_speaker_10',
        quantity: 1,
        price: 499.00,
        description: 'Alice comprou 1x Caixa de Som BassBox X!'
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
        userId: 'eve',
        userName: 'Eve Santos',
        type: 'recommendation',
        description: 'Eve recomendou Headphone SoundAura Pro para Alice Silva'
      }
    ]);

    // 3. Neo4j Seed
    console.log('Limpando banco Neo4j...');
    await runCypher('MATCH (n) DETACH DELETE n');

    console.log('Criando nós de Usuários no Neo4j...');
    for (const u of usersData) {
      await runCypher(
        'CREATE (u:User {id: $id, name: $name})',
        u
      );
    }

    console.log('Criando nós de Produtos no Neo4j...');
    for (const p of productsData) {
      await runCypher(
        'CREATE (p:Product {id: $id, name: $name})',
        { id: p._id, name: p.name }
      );
    }

    console.log('Criando relacionamentos de amizade (:FRIEND)...');
    const friendships = [
      ['alice', 'bob'],
      ['alice', 'charlie'],
      ['bob', 'david'],
      ['charlie', 'eve'],
      ['david', 'eve']
    ];
    for (const [u1, u2] of friendships) {
      await runCypher(
        `MATCH (a:User {id: $u1}), (b:User {id: $u2})
         CREATE (a)-[:FRIEND]->(b), (b)-[:FRIEND]->(a)`,
        { u1, u2 }
      );
    }

    console.log('Criando histórico de compras no Neo4j...');
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'alice', prodId: 'prod_phone_01' }
    );
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'charlie', prodId: 'prod_keyboard_02' }
    );
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'bob', prodId: 'prod_monitor_06' }
    );
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'david', prodId: 'prod_mouse_07' }
    );
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'eve', prodId: 'prod_watch_09' }
    );
    await runCypher(
      `MATCH (u:User {id: $userId}), (p:Product {id: $prodId})
       CREATE (u)-[:BOUGHT]->(p)`,
      { userId: 'alice', prodId: 'prod_speaker_10' }
    );

    console.log('Criando recomendação ativa no Neo4j...');
    await runCypher(
      `MATCH (from:User {id: $fromId}), (to:User {id: $toId}), (p:Product {id: $prodId})
       CREATE (from)-[:RECOMMENDED {to: $toId}]->(p)`,
      { fromId: 'eve', toId: 'alice', prodId: 'prod_headphone_05' }
    );
    await runCypher(
      `MATCH (from:User {id: $fromId}), (to:User {id: $toId}), (p:Product {id: $prodId})
       CREATE (from)-[:RECOMMENDED {to: $toId}]->(p)`,
      { fromId: 'bob', toId: 'david', prodId: 'prod_monitor_06' }
    );
    await runCypher(
      `MATCH (from:User {id: $fromId}), (to:User {id: $toId}), (p:Product {id: $prodId})
       CREATE (from)-[:RECOMMENDED {to: $toId}]->(p)`,
      { fromId: 'charlie', toId: 'eve', prodId: 'prod_light_11' }
    );

    // 4. Redis Seed
    console.log('Limpando chaves Redis...');
    await redisDb.flushAll();

    console.log('Inicializando ranking de fidelidade (Leaderboard) no Redis...');
    const initialScores = [
      { id: 'alice', score: 150 },
      { id: 'bob', score: 100 },
      { id: 'charlie', score: 80 },
      { id: 'david', score: 50 },
      { id: 'eve', score: 20 }
    ];
    for (const item of initialScores) {
      await redisDb.zAdd('leaderboard', item.score, item.id);
    }

    console.log('Inserindo itens nos carrinhos ativos no Redis...');
    await redisDb.hSet('cart:bob', 'prod_chair_03', '1');
    await redisDb.hSet('cart:charlie', 'prod_coffee_04', '2');

    console.log('--- SEED CONCLUÍDO COM SUCESSO ---');
  } catch (error) {
    console.error('Erro durante a execução do seed:', error);
  } finally {
    if (mongoClient) await mongoClient.close();
    if (neo4jDriver) await neo4jDriver.close();
    if (redisClient) await redisClient.disconnect();
    process.exit(0);
  }
}

seed();
