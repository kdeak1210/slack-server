import { PubSub, withFilter } from 'graphql-subscriptions';

import { requiresAuth } from '../permissions';

const pubsub = new PubSub();

const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

export default {
  Subscription: {
    /** newChannelMessage - when pubsub publishes a NEW_CHANNEL_MESSAGE event,
     *  checks if the event's channelId matches its target payload's channelId
     */
    newChannelMessage: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(NEW_CHANNEL_MESSAGE),
        (payload, args) => payload.channelId === args.channelId,
      ),
    },
  },
  Message: {
    // Resolve the 'user' field for all messages
    user: ({ user, userId }, args, { models }) => {
      if (user) {
        return user;
      }
      // eslint-disable-next-line consistent-return
      return models.User.findOne({ where: { id: userId } }, { raw: true });
    },
  },
  Query: {
    messages: requiresAuth.createResolver(async (parent, { channelId }, { models }) =>
      models.Message.findAll(
        { order: [['created_at', 'ASC']], where: { channelId } },
        { raw: true },
      )),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const message = await models.Message.create({
          ...args,
          userId: user.id,
        });

        // Wrap in async function so resolver won't hang w/ multiple awaits
        const asyncFunc = async () => {
          // Find and attach the user ourselves to the newChannelMessage event (sequelize problems)
          const currentUser = await models.User.findOne({
            where: {
              id: user.id,
            },
          });

          // send message to pubsub w/ NCM event, & the dataValues from sequelize object
          pubsub.publish(NEW_CHANNEL_MESSAGE, {
            channelId: args.channelId,
            newChannelMessage: {
              ...message.dataValues,
              user: currentUser.dataValues,
            },
          });
        };

        asyncFunc();

        return true;
      } catch (err) {
        console.log(err);
        return false;
      }
    }),
  },

};
