export default (sequelize, DataTypes) => {
  const Channel = sequelize.define('channel', {
    name: DataTypes.STRING,
    public: DataTypes.BOOLEAN,
  });

  Channel.associate = (models) => {
    // 1 : M relation
    Channel.belongsTo(models.Team, {
      foreignKey: 'teamId',
    });
  };

  return Channel;
};
