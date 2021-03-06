export default (sequelize, DataTypes) => {
  const Message = sequelize.define('message', {
    text: DataTypes.STRING,
    url: DataTypes.STRING,
    mimetype: DataTypes.STRING,
  }, {
    indexes: [
      {
        unique: false,
        fields: ['created_at'],
      },
    ],
  });

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
