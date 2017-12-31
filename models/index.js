import Sequelize from 'sequelize';

// Init, (db_name, username, password)
const sequelize = new Sequelize('slack', 'postgres', 'postgres', {
  dialect: 'postgres',
  protocol: 'postgres',
});

const models = {
  User: sequelize.import('./user'),
  Channel: sequelize.import('./channel'),
  Message: sequelize.import('./message'),
  Team: sequelize.import('./team'),
};

// Loop through all the models and associate them together
Object.keys(models).forEach((modelName) => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

export default models;
