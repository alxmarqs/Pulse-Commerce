const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'pulse_commerce';

async function runAggregations() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('Conectando ao MongoDB...');
    await client.connect();
    const db = client.db(DB_NAME);
    const activitiesColl = db.collection('activities');

    console.log('\n======================================================');
    console.log('📊 PIPELINE 1: FATURAMENTO E VENDAS POR CATEGORIA');
    console.log('Objetivo: Obter total faturado, quantidade vendida e lista de');
    console.log('produtos distintos por categoria de e-commerce.');
    console.log('======================================================');

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

    const result1 = await activitiesColl.aggregate(pipeline1).toArray();
    console.log(JSON.stringify(result1, null, 2));

    console.log('\n======================================================');
    console.log('👤 PIPELINE 2: ENGAJAMENTO E GASTOS POR USUÁRIO');
    console.log('Objetivo: Descobrir o valor total gasto por usuário, quantidade');
    console.log('total de itens comprados, contagem de pedidos e ticket médio.');
    console.log('======================================================');

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

    const result2 = await activitiesColl.aggregate(pipeline2).toArray();
    console.log(JSON.stringify(result2, null, 2));

  } catch (err) {
    console.error('Erro executando aggregations:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

runAggregations();
