import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '@users/schemas/user.schema';
import { UserRole } from '@common/enums';

export async function seedUsers(userModel: Model<UserDocument>): Promise<UserDocument[]> {
  console.log('Seeding users...');

  // Check if users already exist
  const existingUsers = await userModel.countDocuments();
  if (existingUsers > 0) {
    console.log('Users already seeded. Skipping...');
    return userModel.find().exec();
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      email: 'admin@darblockchain.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0052CC&color=fff',
      preferences: {
        theme: 'light',
        emailNotifications: true,
        language: 'en',
      },
    },
    {
      email: 'pm@darblockchain.com',
      password: hashedPassword,
      firstName: 'Project',
      lastName: 'Manager',
      role: UserRole.PROJECT_MANAGER,
      isActive: true,
      avatar: 'https://ui-avatars.com/api/?name=Project+Manager&background=00875A&color=fff',
      preferences: {
        theme: 'light',
        emailNotifications: true,
        language: 'en',
      },
    },
    {
      email: 'john.dev@darblockchain.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Developer',
      role: UserRole.DEVELOPER,
      isActive: true,
      avatar: 'https://ui-avatars.com/api/?name=John+Developer&background=6554C0&color=fff',
      preferences: {
        theme: 'dark',
        emailNotifications: true,
        language: 'en',
      },
    },
    {
      email: 'sarah.dev@darblockchain.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Smith',
      role: UserRole.DEVELOPER,
      isActive: true,
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Smith&background=FF5630&color=fff',
      preferences: {
        theme: 'dark',
        emailNotifications: false,
        language: 'en',
      },
    },
    {
      email: 'viewer@darblockchain.com',
      password: hashedPassword,
      firstName: 'Viewer',
      lastName: 'User',
      role: UserRole.VIEWER,
      isActive: true,
      avatar: 'https://ui-avatars.com/api/?name=Viewer+User&background=172B4D&color=fff',
      preferences: {
        theme: 'light',
        emailNotifications: false,
        language: 'en',
      },
    },
  ];

  const createdUsers = await userModel.insertMany(users);
  console.log(`✓ Seeded ${createdUsers.length} users`);

  return createdUsers;
}
