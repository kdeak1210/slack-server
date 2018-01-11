import _ from 'lodash';

export default (e, models) => {
  if (e instanceof models.sequelize.ValidationError) {
    return e.errors.map(x => _.pick(x, ['path', 'message']));
  }
  // Else its not a sequelize validation error (don't know the error)
  return [{ path: 'name', message: 'something went wrong' }];
};
