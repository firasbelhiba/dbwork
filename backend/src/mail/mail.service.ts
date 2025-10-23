import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM')}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw error to prevent email failures from breaking the app
    }
  }

  async sendIssueAssignedEmail(
    recipientEmail: string,
    recipientName: string,
    issueKey: string,
    issueTitle: string,
    assignedByName: string,
    issueUrl: string,
  ): Promise<void> {
    const subject = `[${issueKey}] Issue assigned to you`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052CC; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .issue-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Issue Assigned</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${assignedByName}</strong> has assigned an issue to you.</p>
            <div class="issue-card">
              <h3>${issueKey}: ${issueTitle}</h3>
            </div>
            <a href="${issueUrl}" class="button">View Issue</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendIssueUpdatedEmail(
    recipientEmail: string,
    recipientName: string,
    issueKey: string,
    issueTitle: string,
    updatedByName: string,
    changes: string[],
    issueUrl: string,
  ): Promise<void> {
    const subject = `[${issueKey}] Issue updated`;
    const changesHtml = changes.map((change) => `<li>${change}</li>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052CC; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .issue-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .changes { background-color: #FFF0B3; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
          ul { margin: 10px 0; padding-left: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Issue Updated</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${updatedByName}</strong> has updated an issue you're watching.</p>
            <div class="issue-card">
              <h3>${issueKey}: ${issueTitle}</h3>
              <div class="changes">
                <strong>Changes made:</strong>
                <ul>${changesHtml}</ul>
              </div>
            </div>
            <a href="${issueUrl}" class="button">View Issue</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendCommentAddedEmail(
    recipientEmail: string,
    recipientName: string,
    issueKey: string,
    issueTitle: string,
    commenterName: string,
    commentText: string,
    issueUrl: string,
  ): Promise<void> {
    const subject = `[${issueKey}] New comment`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052CC; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .issue-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .comment { background-color: #F4F5F7; padding: 15px; border-left: 3px solid #0052CC; margin: 15px 0; font-style: italic; }
          .button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Comment</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${commenterName}</strong> commented on an issue you're watching.</p>
            <div class="issue-card">
              <h3>${issueKey}: ${issueTitle}</h3>
              <div class="comment">
                "${commentText}"
              </div>
            </div>
            <a href="${issueUrl}" class="button">View Issue</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendMentionEmail(
    recipientEmail: string,
    recipientName: string,
    mentionedByName: string,
    mentionContext: string,
    mentionUrl: string,
  ): Promise<void> {
    const subject = `${mentionedByName} mentioned you`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052CC; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .mention-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .context { background-color: #E6FCFF; padding: 15px; border-left: 3px solid #00A3BF; margin: 15px 0; }
          .button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>You Were Mentioned</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${mentionedByName}</strong> mentioned you.</p>
            <div class="mention-card">
              <div class="context">
                ${mentionContext}
              </div>
            </div>
            <a href="${mentionUrl}" class="button">View Context</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendSprintStartedEmail(
    recipientEmail: string,
    recipientName: string,
    sprintName: string,
    projectName: string,
    sprintGoal: string,
    startDate: Date,
    endDate: Date,
    sprintUrl: string,
  ): Promise<void> {
    const subject = `Sprint "${sprintName}" has started`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #00875A; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .sprint-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { padding: 8px 0; border-bottom: 1px solid #DFE1E6; }
          .button { display: inline-block; background-color: #00875A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Sprint Started</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>A new sprint has started in <strong>${projectName}</strong>.</p>
            <div class="sprint-card">
              <h3>${sprintName}</h3>
              <div class="info-row"><strong>Goal:</strong> ${sprintGoal}</div>
              <div class="info-row"><strong>Start Date:</strong> ${startDate.toLocaleDateString()}</div>
              <div class="info-row"><strong>End Date:</strong> ${endDate.toLocaleDateString()}</div>
            </div>
            <a href="${sprintUrl}" class="button">View Sprint</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendSprintCompletedEmail(
    recipientEmail: string,
    recipientName: string,
    sprintName: string,
    projectName: string,
    completedPoints: number,
    totalPoints: number,
    completionRate: number,
    sprintUrl: string,
  ): Promise<void> {
    const subject = `Sprint "${sprintName}" has been completed`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6554C0; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .sprint-card { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 32px; font-weight: bold; color: #0052CC; }
          .stat-label { font-size: 12px; color: #6B778C; text-transform: uppercase; }
          .button { display: inline-block; background-color: #6554C0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Sprint Completed</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Sprint <strong>${sprintName}</strong> in ${projectName} has been completed!</p>
            <div class="sprint-card">
              <h3>Sprint Summary</h3>
              <div class="stats">
                <div class="stat">
                  <div class="stat-value">${completedPoints}</div>
                  <div class="stat-label">Completed Points</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${totalPoints}</div>
                  <div class="stat-label">Total Points</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${completionRate}%</div>
                  <div class="stat-label">Completion Rate</div>
                </div>
              </div>
            </div>
            <a href="${sprintUrl}" class="button">View Sprint Report</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    temporaryPassword: string,
    loginUrl: string,
  ): Promise<void> {
    const subject = 'Welcome to Dar Blockchain Project Management';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0052CC; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f4f5f7; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #0052CC; }
          .warning { background-color: #FFF0B3; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .button { display: inline-block; background-color: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6B778C; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to Dar Blockchain!</h2>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Your account has been created successfully. Here are your login credentials:</p>
            <div class="credentials">
              <p><strong>Email:</strong> ${recipientEmail}</p>
              <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security reasons.
            </div>
            <a href="${loginUrl}" class="button">Login Now</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from Dar Blockchain Project Management</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(recipientEmail, subject, html);
  }
}
