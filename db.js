require('dotenv').config();
const { MongoClient } = require('mongodb');
const neo4j = require('neo4j-driver');
const redis = require('redis');

// Database URLs
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const neo4jUrl = process.env.NEO4J_URL || 'bolt://127.0.0.1:7687';
const neo4jUser = process.env.NEO4J_USER || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD || 'pulsepassword';

// SSE Clients for query logs
let logClients = [];

function broadcastLog(db, query, durationMs = 0) {
  const logEntry = {
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    db,
    query: typeof query === 'object' ? JSON.stringify(query, null, 2) : query,
    durationMs
  };
  
  // Format for SSE
  logClients.forEach(client => {
    client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  });
}

// MongoDB Client
const mongoClient = new MongoClient(mongoUrl);
let mongoDb = null;

async function connectMongo() {
  const start = Date.now();
  await mongoClient.connect();
  mongoDb = mongoClient.db('pulse_commerce');
  console.log('MongoDB connected successfully');
  broadcastLog('MongoDB', 'Client Connected to database: pulse_commerce', Date.now() - start);
  return mongoDb;
}

// Helper wrapper for MongoDB logging
function getMongoCollection(collectionName) {
  const collection = mongoDb.collection(collectionName);
  return {
    find: (filter = {}, options = {}) => {
      const queryStr = `db.collection('${collectionName}').find(${JSON.stringify(filter)}${Object.keys(options).length ? ', ' + JSON.stringify(options) : ''})`;
      broadcastLog('MongoDB', queryStr);
      return collection.find(filter, options);
    },
    findOne: async (filter = {}, options = {}) => {
      const queryStr = `db.collection('${collectionName}').findOne(${JSON.stringify(filter)})`;
      const start = Date.now();
      const res = await collection.findOne(filter, options);
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    },
    insertOne: async (doc) => {
      const queryStr = `db.collection('${collectionName}').insertOne(${JSON.stringify(doc)})`;
      const start = Date.now();
      const res = await collection.insertOne(doc);
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    },
    insertMany: async (docs) => {
      const queryStr = `db.collection('${collectionName}').insertMany([... ${docs.length} documents])`;
      const start = Date.now();
      const res = await collection.insertMany(docs);
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    },
    updateOne: async (filter, update, options = {}) => {
      const queryStr = `db.collection('${collectionName}').updateOne(${JSON.stringify(filter)}, ${JSON.stringify(update)})`;
      const start = Date.now();
      const res = await collection.updateOne(filter, update, options);
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    },
    deleteMany: async (filter = {}) => {
      const queryStr = `db.collection('${collectionName}').deleteMany(${JSON.stringify(filter)})`;
      const start = Date.now();
      const res = await collection.deleteMany(filter);
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    },
    estimatedDocumentCount: async () => {
      const queryStr = `db.collection('${collectionName}').estimatedDocumentCount()`;
      const start = Date.now();
      const res = await collection.estimatedDocumentCount();
      broadcastLog('MongoDB', queryStr, Date.now() - start);
      return res;
    }
  };
}

// Neo4j Driver
let neo4jDriver = null;

function connectNeo4j() {
  const start = Date.now();
  neo4jDriver = neo4j.driver(neo4jUrl, neo4j.auth.basic(neo4jUser, neo4jPassword));
  console.log('Neo4j connection initialized');
  broadcastLog('Neo4j', `Driver initialized for URL: ${neo4jUrl}`, Date.now() - start);
}

async function runCypher(query, params = {}) {
  const start = Date.now();
  const session = neo4jDriver.session();
  try {
    const result = await session.run(query, params);
    const duration = Date.now() - start;
    
    // Log the Cypher query and parameters
    const paramStr = Object.keys(params).length ? `\nParameters: ${JSON.stringify(params)}` : '';
    broadcastLog('Neo4j', `${query}${paramStr}`, duration);
    return result;
  } finally {
    await session.close();
  }
}

// Redis Client
let redisClient = null;

async function connectRedis() {
  const start = Date.now();
  redisClient = redis.createClient({ url: redisUrl });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();
  console.log('Redis connected successfully');
  broadcastLog('Redis', `Client connected to Redis at ${redisUrl}`, Date.now() - start);
  return redisClient;
}

// Wrapper for Redis commands
const redisDb = {
  get: async (key) => {
    const start = Date.now();
    const val = await redisClient.get(key);
    broadcastLog('Redis', `GET ${key}`, Date.now() - start);
    return val;
  },
  set: async (key, value, options = {}) => {
    const start = Date.now();
    const val = await redisClient.set(key, value, options);
    const optStr = Object.keys(options).length ? ` ${JSON.stringify(options)}` : '';
    broadcastLog('Redis', `SET ${key} "${value}"${optStr}`, Date.now() - start);
    return val;
  },
  del: async (key) => {
    const start = Date.now();
    const val = await redisClient.del(key);
    broadcastLog('Redis', `DEL ${key}`, Date.now() - start);
    return val;
  },
  hSet: async (key, field, value) => {
    const start = Date.now();
    const val = await redisClient.hSet(key, field, value);
    broadcastLog('Redis', `HSET ${key} "${field}" "${value}"`, Date.now() - start);
    return val;
  },
  hGetAll: async (key) => {
    const start = Date.now();
    const val = await redisClient.hGetAll(key);
    broadcastLog('Redis', `HGETALL ${key}`, Date.now() - start);
    return val;
  },
  hDel: async (key, field) => {
    const start = Date.now();
    const val = await redisClient.hDel(key, field);
    broadcastLog('Redis', `HDEL ${key} "${field}"`, Date.now() - start);
    return val;
  },
  zAdd: async (key, score, member) => {
    const start = Date.now();
    const val = await redisClient.zAdd(key, { score, value: member });
    broadcastLog('Redis', `ZADD ${key} ${score} "${member}"`, Date.now() - start);
    return val;
  },
  zIncrBy: async (key, increment, member) => {
    const start = Date.now();
    const val = await redisClient.zIncrBy(key, increment, member);
    broadcastLog('Redis', `ZINCRBY ${key} ${increment} "${member}"`, Date.now() - start);
    return val;
  },
  zRangeWithScores: async (key, min, max, options = {}) => {
    const start = Date.now();
    const val = await redisClient.zRangeWithScores(key, min, max, options);
    const optStr = options.REV ? ' REV' : '';
    broadcastLog('Redis', `ZRANGE ${key} ${min} ${max}${optStr} WITHSCORES`, Date.now() - start);
    return val;
  },
  zRevRangeWithScores: async (key, startIdx, endIdx) => {
    const start = Date.now();
    const val = await redisClient.zRangeWithScores(key, startIdx, endIdx, { REV: true });
    broadcastLog('Redis', `ZREVRANGE ${key} ${startIdx} ${endIdx} WITHSCORES`, Date.now() - start);
    return val;
  },
  flushAll: async () => {
    const start = Date.now();
    const val = await redisClient.flushAll();
    broadcastLog('Redis', 'FLUSHALL', Date.now() - start);
    return val;
  }
};

module.exports = {
  connectMongo,
  getMongoCollection,
  connectNeo4j,
  runCypher,
  connectRedis,
  redisDb,
  logClients,
  broadcastLog,
  mongoClient,
  neo4jDriver,
  redisClient
};
