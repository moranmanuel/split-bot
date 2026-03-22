export interface DatabaseConfig {
  connectionString: string;
}

export interface TimestampedRecord {
  createdAt: Date;
  updatedAt: Date;
}

export const createDatabaseConfig = (
  connectionString: string
): DatabaseConfig => ({
  connectionString,
});
