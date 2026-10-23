import jwt from 'jsonwebtoken';

export const generateAccessToken = user => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      // Advisory only — the frontend uses this to decide what to render.
      // Enforcement always re-reads permissions from the database.
      permissions: user.role === 'ADMIN' ? null : user.permissions || [],
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const generateRefreshToken = user => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

export const verifyRefreshToken = token => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
};

export const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = res => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
};
