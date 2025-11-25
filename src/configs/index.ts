// jwt configs
export const jwt_config = {
  access_secret: process.env.ACCESS_TOKEN_SECRET || 'for_development_access',
  refresh_secret: process.env.REFRESH_TOKEN_SECRET || 'for_development_refresh',
  secretKey: process.env.ACCESS_TOKEN_SECRET || 'for_development',
  expiresIn: '96h',
  refresh_expiresIn: '30d'
};
