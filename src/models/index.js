import Sequelize from 'sequelize';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async () => {
  let connected = false;
  let maxReconnects = 20;
  let sequelize;

  while (!connected && maxReconnects) {
    try {
      // Init, (db_name, username, password)
      sequelize = new Sequelize(process.env.TEST_DB || 'slack', 'postgres', 'postgres', {
        dialect: 'postgres',
        protocol: 'postgres',
        operatorsAliases: Sequelize.Op,
        host: process.env.DB_HOST || 'localhost', // by default looks for localhost
        define: {
          underscored: true,
        },
      });
      connected = true;
    } catch (err) {
      console.log('Reconnecting in 5 seconds');
      // eslint-disable-next-line no-await-in-loop
      await sleep(5000);
      maxReconnects -= 1;
    }
  }

  if (!connected) {
    return null;
  }

  const models = {
    User: sequelize.import('./user'),
    Channel: sequelize.import('./channel'),
    Message: sequelize.import('./message'),
    Team: sequelize.import('./team'),
    Member: sequelize.import('./member'),
    DirectMessage: sequelize.import('./directMessage'),
    PCMember: sequelize.import('./pcmember'),
  };

  // Loop through all the models and associate them together
  Object.keys(models).forEach((modelName) => {
    if ('associate' in models[modelName]) {
      models[modelName].associate(models);
    }
  });

  models.sequelize = sequelize;
  models.Sequelize = Sequelize;

  return models;
};
