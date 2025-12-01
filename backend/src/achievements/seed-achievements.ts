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
  // Collaboration & Teamwork
  {
    key: 'team_player',
    name: 'Team Player',
    description: 'Get assigned to your first project',
    category: 'collaboration',
    icon: '🤝',
    rarity: 'common',
    criteria: {
      type: 'project_assignment',
      count: 1,
    },
    points: 10,
  },
  {
    key: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Comment on 25 different issues',
    category: 'collaboration',
    icon: '🦋',
    rarity: 'uncommon',
    criteria: {
      type: 'unique_issues_commented',
      count: 25,
    },
    points: 50,
  },
  {
    key: 'mentor',
    name: 'Mentor',
    description: 'Be mentioned in 10 issue comments',
    category: 'collaboration',
    icon: '👨‍🏫',
    rarity: 'rare',
    criteria: {
      type: 'mentions_received',
      count: 10,
    },
    points: 100,
  },
  {
    key: 'communicator',
    name: 'Communicator',
    description: 'Write 50 comments',
    category: 'collaboration',
    icon: '💬',
    rarity: 'uncommon',
    criteria: {
      type: 'comments_written',
      count: 50,
    },
    points: 75,
  },
  // Streak & Consistency
  {
    key: 'daily_driver',
    name: 'Daily Driver',
    description: 'Work on issues for 3 consecutive days',
    category: 'communication',
    icon: '📅',
    rarity: 'uncommon',
    criteria: {
      type: 'consecutive_days',
      count: 3,
    },
    points: 50,
  },
  {
    key: 'week_warrior',
    name: 'Week Warrior',
    description: 'Work on issues for 7 consecutive days',
    category: 'communication',
    icon: '🗓️',
    rarity: 'rare',
    criteria: {
      type: 'consecutive_days',
      count: 7,
    },
    points: 100,
  },
  {
    key: 'monthly_grind',
    name: 'Monthly Grind',
    description: 'Work on issues for 30 consecutive days',
    category: 'communication',
    icon: '📆',
    rarity: 'legendary',
    criteria: {
      type: 'consecutive_days',
      count: 30,
    },
    points: 500,
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Complete an issue before 9 AM',
    category: 'communication',
    icon: '🌅',
    rarity: 'uncommon',
    criteria: {
      type: 'time_based',
      timeCondition: 'before',
      hour: 9,
    },
    points: 50,
  },
  {
    key: 'night_owl',
    name: 'Night Owl',
    description: 'Complete an issue after 10 PM',
    category: 'communication',
    icon: '🦉',
    rarity: 'uncommon',
    criteria: {
      type: 'time_based',
      timeCondition: 'after',
      hour: 22,
    },
    points: 50,
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
