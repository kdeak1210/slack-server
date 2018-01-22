export default {
  Query: {
    messages: async (parent, { channelId }, { models, user }) => [],
  },

  Mutation: {
    createMessage: async (parent, args, { models, user }) => {
      try {
        await models.Message.create({
          ...args,
          userId: user.id,
        });
        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    },
  },

};
