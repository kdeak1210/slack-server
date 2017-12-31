export default (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    name: {
      type: DataTypes.STRING,
      unique: true,
    },
  });

  Message.associate = (models) => {
    // 1 : M relation
    Message.belongsTo(models.Channel, {
      foreignKey: 'channelId',
    });
    Message.belongsTo(models.User, {
      foreignKey: 'userId',
    });
  };

  return Message;
};
