import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

const achievements = [
  {
    key: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first issue',
    category: 'task_completion',
    icon: '🎯',
    rarity: 'common',
    criteria: {
      type: 'issue_completion',
      count: 1,
    },
    points: 10,
  },
  {
    key: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 5 issues',
    category: 'task_completion',
    icon: '🚀',
    rarity: 'common',
    criteria: {
      type: 'issue_completion',
      count: 5,
    },
    points: 25,
  },
  {
    key: 'productive',
    name: 'Productive',
    description: 'Complete 10 issues',
    category: 'task_completion',
    icon: '⚡',
    rarity: 'uncommon',
    criteria: {
      type: 'issue_completion',
      count: 10,
    },
    points: 50,
  },
  {
    key: 'workhorse',
    name: 'Workhorse',
    description: 'Complete 25 issues',
    category: 'task_completion',
    icon: '💪',
    rarity: 'rare',
    criteria: {
      type: 'issue_completion',
      count: 25,
    },
    points: 100,
  },
  {
    key: 'power_user',
    name: 'Power User',
    description: 'Complete 50 issues',
    category: 'task_completion',
    icon: '⭐',
    rarity: 'epic',
    criteria: {
      type: 'issue_completion',
      count: 50,
    },
    points: 200,
  },
  {
    key: 'legendary_contributor',
    name: 'Legendary Contributor',
    description: 'Complete 100 issues',
    category: 'task_completion',
    icon: '👑',
    rarity: 'legendary',
    criteria: {
      type: 'issue_completion',
      count: 100,
    },
    points: 500,
  },
  {
    key: 'sprint_finisher',
    name: 'Sprint Finisher',
    description: 'Complete all assigned issues in a sprint',
    category: 'task_completion',
    icon: '🏁',
    rarity: 'rare',
    criteria: {
      type: 'sprint_completion',
      count: 1,
    },
    points: 75,
  },
  {
    key: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Complete 5 issues in a single day',
    category: 'task_completion',
    icon: '🏃',
    rarity: 'epic',
    criteria: {
      type: 'daily_completion',
      count: 5,
      timeframe: '1day',
    },
    points: 150,
  },
];

async function seedAchievements() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const achievementsCollection = db.collection('achievements');

    console.log('Seeding achievements...');

    for (const achievement of achievements) {
      const exists = await achievementsCollection.findOne({ key: achievement.key });

      if (exists) {
        console.log(`✓ Achievement "${achievement.name}" already exists, skipping...`);
      } else {
        await achievementsCollection.insertOne({
          ...achievement,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✓ Created achievement: ${achievement.name} (${achievement.points} points)`);
      }
    }

    console.log('\n✅ Achievement seeding complete!');
    console.log(`Total achievements: ${achievements.length}`);

  } catch (error) {
    console.error('Error seeding achievements:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the seed
seedAchievements();
