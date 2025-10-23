import { Model } from 'mongoose';
import { Comment, CommentDocument } from '@comments/schemas/comment.schema';
import { IssueDocument } from '@issues/schemas/issue.schema';
import { UserDocument } from '@users/schemas/user.schema';

export async function seedComments(
  commentModel: Model<CommentDocument>,
  issues: IssueDocument[],
  users: UserDocument[],
): Promise<CommentDocument[]> {
  console.log('Seeding comments...');

  // Check if comments already exist
  const existingComments = await commentModel.countDocuments();
  if (existingComments > 0) {
    console.log('Comments already seeded. Skipping...');
    return commentModel.find().exec();
  }

  const pm = users.find((u) => u.email === 'pm@darblockchain.com');
  const john = users.find((u) => u.email === 'john.dev@darblockchain.com');
  const sarah = users.find((u) => u.email === 'sarah.dev@darblockchain.com');

  // Get some issues to comment on
  const jwtIssue = issues.find((i) => i.title === 'Implement JWT authentication');
  const projectIssue = issues.find((i) => i.title === 'Implement project management features');
  const issueTrackingIssue = issues.find((i) => i.title === 'Build issue tracking system');

  const comments = [];

  if (jwtIssue) {
    comments.push(
      {
        issueId: jwtIssue._id,
        userId: pm._id,
        content: 'Great work on the authentication module! Make sure to implement rate limiting for login attempts to prevent brute force attacks.',
        reactions: [
          { userId: john._id, reaction: '👍' },
          { userId: sarah._id, reaction: '💯' },
        ],
      },
      {
        issueId: jwtIssue._id,
        userId: john._id,
        content: 'Thanks! I\'ve added Throttler guard with 10 attempts per minute limit. Also implemented refresh token rotation for better security.',
        reactions: [
          { userId: pm._id, reaction: '🚀' },
        ],
      },
    );
  }

  if (projectIssue) {
    comments.push(
      {
        issueId: projectIssue._id,
        userId: sarah._id,
        content: 'Should we add project templates feature in this story or create a separate one?',
        reactions: [],
      },
      {
        issueId: projectIssue._id,
        userId: pm._id,
        content: 'Let\'s keep it separate. We can add templates in the next sprint once the core features are stable.',
        parentCommentId: null, // Will be updated after first comment is created
        reactions: [
          { userId: sarah._id, reaction: '👍' },
        ],
      },
      {
        issueId: projectIssue._id,
        userId: john._id,
        content: 'I\'m about 50% done with this. The member management API is complete, working on project statistics now.',
        reactions: [],
      },
    );
  }

  if (issueTrackingIssue) {
    comments.push(
      {
        issueId: issueTrackingIssue._id,
        userId: pm._id,
        content: 'This is a critical feature. Make sure to include:\n- Advanced filtering (by status, type, priority, assignee)\n- Full-text search\n- Bulk operations\n- Time tracking with logs\n- Watchers and blockers',
        reactions: [
          { userId: john._id, reaction: '✅' },
        ],
      },
      {
        issueId: issueTrackingIssue._id,
        userId: john._id,
        content: 'All features listed are implemented! Currently writing comprehensive tests for the filtering and search functionality.',
        reactions: [
          { userId: pm._id, reaction: '🎉' },
          { userId: sarah._id, reaction: '👏' },
        ],
      },
      {
        issueId: issueTrackingIssue._id,
        userId: sarah._id,
        content: 'The bulk update API is really powerful! Will make it super easy to update multiple issues at once from the Kanban board.',
        reactions: [
          { userId: john._id, reaction: '😊' },
        ],
      },
    );
  }

  const createdComments = await commentModel.insertMany(comments);
  console.log(`✓ Seeded ${createdComments.length} comments`);

  // Update parent comment reference for threaded reply
  if (createdComments.length >= 4) {
    await createdComments[3].updateOne({ parentCommentId: createdComments[2]._id });
  }

  return createdComments;
}
