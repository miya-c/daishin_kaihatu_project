// Test fixtures for license API responses

export const licenseResponses = {
  active: { authorized: true, message: 'OK', cacheTTL: 900 },
  revoked: { authorized: false, message: 'License revoked', cacheTTL: 0 },
  expiringValid: {
    authorized: true,
    message: 'OK (expiring)',
    cacheTTL: 900,
  },
  expiringExpired: {
    authorized: false,
    message: 'Grace period expired',
    cacheTTL: 0,
  },
  expiringNoDate: {
    authorized: false,
    message: 'Expiring license requires an expiry date',
    cacheTTL: 0,
  },
  notFound: {
    authorized: false,
    message: 'Script ID not found',
    cacheTTL: 0,
  },
};
