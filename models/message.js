export default (sequelize, DataTypes) => {
  const Message = sequelize.define(
    'message',
    {
      name: {
        type: DataTypes.STRING,
        unique: true,
      },
    },
    {
      underscored: true,
    },
  );

  Message.associate = (models) => {
    // 1 : M relation
    Message.belongsTo(models.Channel, {
      foreignKey: {
        name: 'channelId',
        field: 'channel_id',
      },
    });
    Message.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        field: 'user_id',
      },
    });
  };

  return Message;
};
