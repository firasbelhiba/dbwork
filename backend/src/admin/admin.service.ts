import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { AppSettings, AppSettingsDocument, ProjectRoleDefinition, DEFAULT_PROJECT_ROLES } from './schemas/app-settings.schema';

export interface TimerSettings {
  timerAutoStopHour: number;
  timerAutoStopMinute: number;
  timerAutoStopEnabled: boolean;
  timerAutoStopTimezone: string;
  timerAutoStopWeekdaysOnly: boolean;
}

export interface CreateProjectRoleDto {
  name: string;
  label: string;
  color: string;
}

export interface UpdateProjectRoleDto {
  label?: string;
  color?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  // Collections to export (read-only operation)
  private readonly exportableCollections = [
    'users',
    'projects',
    'issues',
    'sprints',
    'comments',
    'notifications',
    'achievements',
    'userachievements',
    'activities',
    'activitylogs',
    'attachments',
    'feedbacks',
    'feedbackcomments',
    'changelogs',
  ];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(AppSettings.name) private appSettingsModel: Model<AppSettingsDocument>,
  ) {}

  /**
   * Export entire database - READ ONLY operation
   * Safe for production use as it only reads data
   */
  async exportDatabase(): Promise<{
    exportedAt: string;
    collections: Record<string, any[]>;
    summary: Record<string, number>;
  }> {
    this.logger.log('Starting database export...');

    const collections: Record<string, any[]> = {};
    const summary: Record<string, number> = {};

    for (const collectionName of this.exportableCollections) {
      try {
        const collection = this.connection.collection(collectionName);

        // Read-only find operation
        const documents = await collection.find({}).toArray();

        // Sanitize sensitive data for users collection
        if (collectionName === 'users') {
          collections[collectionName] = documents.map(doc => {
            const sanitized = { ...doc };
            // Remove sensitive fields
            delete sanitized.password;
            delete sanitized.refreshToken;
            return sanitized;
          });
        } else {
          collections[collectionName] = documents;
        }

        summary[collectionName] = documents.length;
        this.logger.log(`Exported ${documents.length} documents from ${collectionName}`);
      } catch (error) {
        this.logger.warn(`Collection ${collectionName} not found or empty, skipping...`);
        collections[collectionName] = [];
        summary[collectionName] = 0;
      }
    }

    this.logger.log('Database export completed successfully');

    return {
      exportedAt: new Date().toISOString(),
      collections,
      summary,
    };
  }

  /**
   * Export specific collection - READ ONLY operation
   */
  async exportCollection(collectionName: string): Promise<{
    exportedAt: string;
    collection: string;
    documents: any[];
    count: number;
  }> {
    if (!this.exportableCollections.includes(collectionName)) {
      throw new Error(`Collection '${collectionName}' is not available for export`);
    }

    this.logger.log(`Starting export of collection: ${collectionName}`);

    try {
      const collection = this.connection.collection(collectionName);
      let documents = await collection.find({}).toArray();

      // Sanitize sensitive data for users collection
      if (collectionName === 'users') {
        documents = documents.map(doc => {
          const sanitized = { ...doc };
          delete sanitized.password;
          delete sanitized.refreshToken;
          return sanitized;
        });
      }

      this.logger.log(`Exported ${documents.length} documents from ${collectionName}`);

      return {
        exportedAt: new Date().toISOString(),
        collection: collectionName,
        documents,
        count: documents.length,
      };
    } catch (error) {
      this.logger.error(`Error exporting collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of exportable collections
   */
  getExportableCollections(): string[] {
    return [...this.exportableCollections];
  }

  /**
   * Get database statistics - READ ONLY operation
   */
  async getDatabaseStats(): Promise<{
    totalDocuments: number;
    collections: Record<string, number>;
    databaseSize: string;
  }> {
    this.logger.log('Fetching database statistics...');

    const collections: Record<string, number> = {};
    let totalDocuments = 0;

    for (const collectionName of this.exportableCollections) {
      try {
        const collection = this.connection.collection(collectionName);
        const count = await collection.countDocuments();
        collections[collectionName] = count;
        totalDocuments += count;
      } catch (error) {
        collections[collectionName] = 0;
      }
    }

    // Get database stats
    let databaseSize = 'Unknown';
    try {
      const stats = await this.connection.db.stats();
      const sizeInMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
      databaseSize = `${sizeInMB} MB`;
    } catch (error) {
      this.logger.warn('Could not retrieve database size');
    }

    return {
      totalDocuments,
      collections,
      databaseSize,
    };
  }

  /**
   * Get or create app settings (singleton pattern)
   */
  private async getOrCreateSettings(): Promise<AppSettingsDocument> {
    let settings = await this.appSettingsModel.findOne({ key: 'app_settings' }).exec();

    if (!settings) {
      this.logger.log('Creating default app settings...');
      settings = await this.appSettingsModel.create({
        key: 'app_settings',
        timerAutoStopHour: 17,
        timerAutoStopMinute: 30,
        timerAutoStopEnabled: true,
        timerAutoStopTimezone: 'Africa/Tunis',
        timerAutoStopWeekdaysOnly: true,
      });
    }

    return settings;
  }

  /**
   * Get timer auto-stop settings
   */
  async getTimerSettings(): Promise<TimerSettings> {
    const settings = await this.getOrCreateSettings();

    return {
      timerAutoStopHour: settings.timerAutoStopHour,
      timerAutoStopMinute: settings.timerAutoStopMinute,
      timerAutoStopEnabled: settings.timerAutoStopEnabled,
      timerAutoStopTimezone: settings.timerAutoStopTimezone,
      timerAutoStopWeekdaysOnly: settings.timerAutoStopWeekdaysOnly,
    };
  }

  /**
   * Update timer auto-stop settings
   */
  async updateTimerSettings(updates: Partial<TimerSettings>): Promise<TimerSettings> {
    this.logger.log('Updating timer settings:', updates);

    // Validate hour (0-23)
    if (updates.timerAutoStopHour !== undefined) {
      if (updates.timerAutoStopHour < 0 || updates.timerAutoStopHour > 23) {
        throw new Error('Hour must be between 0 and 23');
      }
    }

    // Validate minute (0-59)
    if (updates.timerAutoStopMinute !== undefined) {
      if (updates.timerAutoStopMinute < 0 || updates.timerAutoStopMinute > 59) {
        throw new Error('Minute must be between 0 and 59');
      }
    }

    const settings = await this.appSettingsModel.findOneAndUpdate(
      { key: 'app_settings' },
      { $set: updates },
      { new: true, upsert: true },
    ).exec();

    this.logger.log(`Timer settings updated: ${settings.timerAutoStopHour}:${settings.timerAutoStopMinute.toString().padStart(2, '0')}`);

    return {
      timerAutoStopHour: settings.timerAutoStopHour,
      timerAutoStopMinute: settings.timerAutoStopMinute,
      timerAutoStopEnabled: settings.timerAutoStopEnabled,
      timerAutoStopTimezone: settings.timerAutoStopTimezone,
      timerAutoStopWeekdaysOnly: settings.timerAutoStopWeekdaysOnly,
    };
  }

  /**
   * Get all project roles
   */
  async getProjectRoles(): Promise<ProjectRoleDefinition[]> {
    const settings = await this.getOrCreateSettings();
    return settings.projectRoles || DEFAULT_PROJECT_ROLES;
  }

  /**
   * Create a new project role
   */
  async createProjectRole(dto: CreateProjectRoleDto): Promise<ProjectRoleDefinition[]> {
    this.logger.log('Creating new project role:', dto);

    const settings = await this.getOrCreateSettings();
    const roles = settings.projectRoles || [...DEFAULT_PROJECT_ROLES];

    // Validate name format (lowercase, underscores only)
    const nameRegex = /^[a-z][a-z0-9_]*$/;
    if (!nameRegex.test(dto.name)) {
      throw new BadRequestException('Role name must be lowercase letters, numbers, and underscores only, starting with a letter');
    }

    // Check if role with this name already exists
    if (roles.some(r => r.name === dto.name)) {
      throw new BadRequestException(`Role with name "${dto.name}" already exists`);
    }

    const newRole: ProjectRoleDefinition = {
      id: dto.name,
      name: dto.name,
      label: dto.label,
      color: dto.color,
      isDefault: false,
      order: roles.length,
    };

    roles.push(newRole);

    await this.appSettingsModel.findOneAndUpdate(
      { key: 'app_settings' },
      { $set: { projectRoles: roles } },
      { new: true, upsert: true },
    ).exec();

    this.logger.log(`Project role "${dto.label}" created successfully`);
    return roles;
  }

  /**
   * Update a project role
   */
  async updateProjectRole(roleId: string, dto: UpdateProjectRoleDto): Promise<ProjectRoleDefinition[]> {
    this.logger.log(`Updating project role ${roleId}:`, dto);

    const settings = await this.getOrCreateSettings();
    const roles = settings.projectRoles || [...DEFAULT_PROJECT_ROLES];

    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) {
      throw new NotFoundException(`Role with id "${roleId}" not found`);
    }

    // Update the role
    if (dto.label !== undefined) {
      roles[roleIndex].label = dto.label;
    }
    if (dto.color !== undefined) {
      roles[roleIndex].color = dto.color;
    }

    await this.appSettingsModel.findOneAndUpdate(
      { key: 'app_settings' },
      { $set: { projectRoles: roles } },
      { new: true, upsert: true },
    ).exec();

    this.logger.log(`Project role "${roleId}" updated successfully`);
    return roles;
  }

  /**
   * Delete a project role (only custom roles can be deleted)
   */
  async deleteProjectRole(roleId: string): Promise<ProjectRoleDefinition[]> {
    this.logger.log(`Deleting project role ${roleId}`);

    const settings = await this.getOrCreateSettings();
    const roles = settings.projectRoles || [...DEFAULT_PROJECT_ROLES];

    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) {
      throw new NotFoundException(`Role with id "${roleId}" not found`);
    }

    // Check if it's a default role
    if (roles[roleIndex].isDefault) {
      throw new BadRequestException('Cannot delete default project roles');
    }

    roles.splice(roleIndex, 1);

    // Re-order remaining roles
    roles.forEach((role, index) => {
      role.order = index;
    });

    await this.appSettingsModel.findOneAndUpdate(
      { key: 'app_settings' },
      { $set: { projectRoles: roles } },
      { new: true, upsert: true },
    ).exec();

    this.logger.log(`Project role "${roleId}" deleted successfully`);
    return roles;
  }

  /**
   * Reorder project roles
   */
  async reorderProjectRoles(roleIds: string[]): Promise<ProjectRoleDefinition[]> {
    this.logger.log('Reordering project roles:', roleIds);

    const settings = await this.getOrCreateSettings();
    const roles = settings.projectRoles || [...DEFAULT_PROJECT_ROLES];

    // Validate that all role IDs exist
    for (const id of roleIds) {
      if (!roles.some(r => r.id === id)) {
        throw new BadRequestException(`Role with id "${id}" not found`);
      }
    }

    // Reorder based on the provided order
    const reorderedRoles: ProjectRoleDefinition[] = [];
    roleIds.forEach((id, index) => {
      const role = roles.find(r => r.id === id);
      if (role) {
        reorderedRoles.push({ ...role, order: index });
      }
    });

    // Add any roles that weren't in the reorder list (shouldn't happen, but just in case)
    roles.forEach(role => {
      if (!reorderedRoles.some(r => r.id === role.id)) {
        reorderedRoles.push({ ...role, order: reorderedRoles.length });
      }
    });

    await this.appSettingsModel.findOneAndUpdate(
      { key: 'app_settings' },
      { $set: { projectRoles: reorderedRoles } },
      { new: true, upsert: true },
    ).exec();

    this.logger.log('Project roles reordered successfully');
    return reorderedRoles;
  }
}
