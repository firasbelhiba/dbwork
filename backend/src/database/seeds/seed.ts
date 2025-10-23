import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@users/schemas/user.schema';
import { Project, ProjectDocument } from '@projects/schemas/project.schema';
import { Sprint, SprintDocument } from '@sprints/schemas/sprint.schema';
import { Issue, IssueDocument } from '@issues/schemas/issue.schema';
import { Comment, CommentDocument } from '@comments/schemas/comment.schema';
import { seedUsers } from './users.seed';
import { seedProjects } from './projects.seed';
import { seedSprints } from './sprints.seed';
import { seedIssues } from './issues.seed';
import { seedComments } from './comments.seed';

async function bootstrap() {
  console.log('🌱 Starting database seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get models
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const projectModel = app.get<Model<ProjectDocument>>(getModelToken(Project.name));
    const sprintModel = app.get<Model<SprintDocument>>(getModelToken(Sprint.name));
    const issueModel = app.get<Model<IssueDocument>>(getModelToken(Issue.name));
    const commentModel = app.get<Model<CommentDocument>>(getModelToken(Comment.name));

    // Seed in order (respecting dependencies)
    const users = await seedUsers(userModel);
    const projects = await seedProjects(projectModel, users);
    const sprints = await seedSprints(sprintModel, projects);
    const issues = await seedIssues(issueModel, projects, sprints, users);
    const comments = await seedComments(commentModel, issues, users);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Sprints: ${sprints.length}`);
    console.log(`   Issues: ${issues.length}`);
    console.log(`   Comments: ${comments.length}`);
    console.log('\n💡 Login credentials:');
    console.log('   Admin: admin@darblockchain.com / password123');
    console.log('   PM: pm@darblockchain.com / password123');
    console.log('   Developer 1: john.dev@darblockchain.com / password123');
    console.log('   Developer 2: sarah.dev@darblockchain.com / password123');
    console.log('   Viewer: viewer@darblockchain.com / password123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
