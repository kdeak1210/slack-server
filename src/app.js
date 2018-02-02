import { createServer } from 'http';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { apolloUploadExpress } from 'apollo-upload-server';
import DataLoader from 'dataloader';

import getModels from './models';
import { refreshTokens } from './auth';
import { channelBatcher } from './batchFunctions';

/* MOVE TO ENVIRONMENT */
const SECRET = '123123123';
const SECRET2 = 'abcabcabc';

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, './schemas')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, './resolvers')));

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const app = express();

// CORS * lets all sites access the server...
app.use(cors('*'));

const graphqlEndpoint = '/graphql';

// ex http://localhost:8080/files/B1ACDWhrz-ReactLogo.png
app.use('/files', express.static('files'));

const server = createServer(app);

getModels().then((models) => {
  if (!models) {
    console.log('Could not connect to database');
    return;
  }

  // custom middleware
  const addUser = async (req, res, next) => {
    const token = req.headers['x-token'];
    if (token) {
      try {
      // verify token hasn't expired, and it was signed with the SECRET
        const { user } = jwt.verify(token, SECRET);
        req.user = user;
      } catch (err) {
      // token invalid (expired or wrong secret or ...) -> attempt to refresh
        const refreshToken = req.headers['x-refresh-token'];
        const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);

        if (newTokens.token && newTokens.refreshToken) {
        // send the client back new tokens in headers
          res.set('Access-Control-Expose-Headers', 'x-token', 'x-refresh-token');
          res.set('x-token', newTokens.token);
          res.set('x-refresh-token', newTokens.refreshToken);
        }

        req.user = newTokens.user;
      }
    }
    next();
  };

  app.use(addUser);

  app.use(
    graphqlEndpoint,
    bodyParser.json(),
    apolloUploadExpress(),
    graphqlExpress(req => ({
      schema,
      context: {
        models,
        user: req.user, // from the addUser middleware
        SECRET,
        SECRET2,
        channelLoader: new DataLoader(ids => channelBatcher(ids, models, req.user)),
        serverUrl: `${req.protocol}://${req.get('host')}`,
      },
    })),
  );

  app.use(
    '/graphiql',
    graphiqlExpress({
      endpointURL: graphqlEndpoint,
      subscriptionsEndpoint: 'ws://localhost:8080/subscriptions',
    }),
  );


  // sync({ force: true }) to drop the DB.
  models.sequelize.sync({ }).then(() => {
    server.listen(8080, () => {
    // eslint-disable-next-line no-new
      new SubscriptionServer(
        {
          execute,
          subscribe,
          schema,
          onConnect: async ({ token, refreshToken }, webSocket) => {
            if (token && refreshToken) {
              try {
                const { user } = jwt.verify(token, SECRET);
                return { models, user }; // models and user going into context
              } catch (err) {
                const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
                return { models, user: newTokens.user };
              }
            }

            return { models };
          },
        },
        {
          server,
          path: '/subscriptions',
        },
      );
    });
  });
});

