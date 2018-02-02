import { withFilter } from 'graphql-subscriptions';
import { GraphQLUpload } from 'apollo-upload-server';
import { createWriteStream, unlinkSync } from 'fs';
import mkdirp from 'mkdirp';
import shortid from 'shortid';
import Promise from 'bluebird';

import { requiresAuth, requiresTeamAccess } from '../permissions';
import pubsub from '../pubsub';

// subscription type
const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

// Specify directory for uploads, and ensure it exists
mkdirp.sync('./files');

const storeFs = ({ stream, filename }) => {
  const id = shortid.generate();
  const path = `files/${id}-${filename}`;
  return new Promise((resolve, reject) => {
    stream
      .on('error', (error) => {
        if (stream.truncated) {
          // delete the truncated file
          unlinkSync(path);
        }

        reject(error);
      })
      .on('end', () => resolve({ id, path }))
      .pipe(createWriteStream(path));
  });
};

const processUpload = async (upload) => {
  const {
    stream, filename, mimetype,
    // encoding,
  } = await upload;
  const { path } = await storeFs({ stream, filename });
  return { path, mimetype };
};

export default {
  Upload: GraphQLUpload, // Required for apollo-upload
  Subscription: {
    /** newChannelMessage - when pubsub publishes a NEW_CHANNEL_MESSAGE event,
     *  checks if the event's channelId matches its target payload's channelId
     */
    newChannelMessage: {
      subscribe: requiresTeamAccess.createResolver(withFilter(
        () => pubsub.asyncIterator(NEW_CHANNEL_MESSAGE),
        (payload, args) => payload.channelId === args.channelId,
      )),
    },
  },
  Message: {
    // If theres a url present, format it so every url passed back to the client has domain name
    url: parent => (parent.url ? `${process.env.SERVER_URL || 'http://localhost:8080'}/${parent.url}` : parent.url),
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
    messages: requiresAuth.createResolver(async (parent, { cursor, channelId }, { models, user }) => {
      const channel = await models.Channel.findOne({ where: { id: channelId } }, { raw: true });

      if (!channel.public) {
        const member = await models.PCMember.findOne(
          { where: { channelId, userId: user.id } },
          { raw: true },
        );
        if (!member) {
          // non-descriptive error is fine, user'd have to be doing something weird to get here
          throw new Error('Not Authorized');
        }
      }

      const options = {
        order: [['created_at', 'DESC']],
        where: { channelId },
        limit: 35,
      };

      if (cursor) {
        // Given a cursor (date), find all elements after the cursor (created_at lt cursor?)
        options.where.created_at = {
          [models.sequelize.Op.lt]: cursor,
        };
      }

      return models.Message.findAll(options, { raw: true });
    }),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, { file, ...args }, { models, user }) => {
      try {
        const messageData = args;
        if (file) {
          const { path, mimetype } = await processUpload(file);
          console.log(`File uploaded! path: ${path}, mimetype: ${mimetype}`);
          messageData.url = path;
          messageData.mimetype = mimetype;
        }

        const message = await models.Message.create({
          ...messageData,
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
