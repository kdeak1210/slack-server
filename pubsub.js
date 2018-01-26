import { PubSub } from 'graphql-subscriptions';

/** Ensures we use the same PubSub across the whole application */
export default new PubSub();
