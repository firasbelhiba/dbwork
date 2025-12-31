const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

mongoose.connect(MONGODB_URI).then(async () => {
  const Issue = mongoose.connection.collection('issues');
  const issues = await Issue.find({ key: { $regex: /^GIFT-/ } }).project({ key: 1, category: 1, title: 1 }).toArray();
  console.log('GIFT Issues with categories:');
  issues.forEach(i => console.log('  ' + i.key + ': category=' + (i.category || 'null') + ' - ' + (i.title?.substring(0, 30) || '')));
  await mongoose.connection.close();
});
