import jwt from 'jsonwebtoken';
import _ from 'lodash';
import bcrypt from 'bcrypt';

export const createTokens = async (user, secret, secret2) => {
  const createToken = jwt.sign(
    {
      user: _.pick(user, ['id', 'username']),
    },
    secret,
    {
      expiresIn: '30m',
    },
  );

  const createRefreshToken = jwt.sign(
    {
      user: _.pick(user, 'id'),
    },
    secret2,
    {
      expiresIn: '7d',
    },
  );

  return [createToken, createRefreshToken]; // sync
};

export const refreshTokens = async (token, refreshToken, models, SECRET, SECRET2) => {
  let userId = 0;
  try {
    const { user: { id } } = jwt.decode(refreshToken);
    userId = id;
  } catch (err) {
    return {};
  }

  if (!userId) {
    return {};
  }

  const user = await models.User.findOne({ where: { id: userId }, raw: true });

  if (!user) {
    return {};
  }

  const refreshSecret = user.password + SECRET2;

  try {
    jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    return {};
  }

  const [newToken, newRefreshToken] = await createTokens(user, SECRET, refreshSecret);
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user,
  };
};

export const tryLogin = async (email, password, models, SECRET, SECRET2) => {
  const user = await models.User.findOne({ where: { email }, raw: true });
  if (!user) {
    // User with the provided email was not found
    return {
      ok: false,
      errors: [{ path: 'email', message: 'Wrong email' }],
    };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // bad password
    return {
      ok: false,
      errors: [{ path: 'password', message: 'Wrong password' }],
    };
  }

  // Automatically expires it if the user changes their password (wont stay logged in)
  const refreshTokenSecret = user.password + SECRET2;

  const [token, refreshToken] = await createTokens(user, SECRET, refreshTokenSecret);

  return {
    ok: true,
    token,
    refreshToken,
  };
};
