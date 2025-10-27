export const dashboardErrorCodes = {
  userNotFound: 'USER_NOT_FOUND',
  unauthorized: 'UNAUTHORIZED',
  validationError: 'VALIDATION_ERROR',
  databaseError: 'DATABASE_ERROR',
} as const;

export type DashboardServiceError = typeof dashboardErrorCodes[keyof typeof dashboardErrorCodes];
