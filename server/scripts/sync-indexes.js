// Aligns the indexes in MongoDB with the ones declared on the schemas.
//
// Mongoose only ever *creates* indexes automatically; it never removes ones you
// have deleted from a schema. Over time that leaves behind indexes nothing
// queries, which still have to be updated on every write. `syncIndexes()` drops
// those and builds anything missing.
//
// Run with: npm run sync-indexes
require('dotenv').config();
const mongoose = require('mongoose');

const models = [
  require('../models/User'),
  require('../models/Post'),
  require('../models/Comment'),
  require('../models/Community'),
  require('../models/Vote'),
  require('../models/UserActivity'),
  require('../models/Notification'),
  require('../models/CustomFeed'),
  require('../models/Chat'),
];

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const indexSizeFor = async (model) => {
  const [stats] = await model.collection.aggregate([
    { $collStats: { storageStats: {} } },
    { $project: { total: '$storageStats.totalIndexSize' } }
  ]).toArray();
  return stats?.total ?? 0;
};

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to ${mongoose.connection.host}\n`);

  let before = 0;
  let after = 0;

  for (const model of models) {
    const sizeBefore = await indexSizeFor(model);
    before += sizeBefore;

    // Returns the names of the indexes it dropped
    const dropped = await model.syncIndexes();

    const sizeAfter = await indexSizeFor(model);
    after += sizeAfter;

    const change = dropped.length ? `dropped: ${dropped.join(', ')}` : 'no changes';
    console.log(`${model.modelName.padEnd(14)} ${kb(sizeBefore).padStart(11)} -> ${kb(sizeAfter).padStart(11)}  ${change}`);
  }

  console.log(`\nTotal index size: ${kb(before)} -> ${kb(after)}`);

  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Index sync failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
