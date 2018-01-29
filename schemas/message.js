/* scalar Upload is required for apollo-upload-server for file uploads */

export default `
  scalar Upload

  type Message {
    id: Int!
    text: String!
    user: User!
    channel: Channel!
    created_at: String!
    url: String
    filetype: String
  }

  type File {
    id: ID!
    path: String!
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Subscription {
    newChannelMessage(channelId: Int!): Message!
  }

  type Query {
    messages(channelId: Int!): [Message!]!
  }

  type Mutation {
    createMessage(channelId: Int!, text: String, file: Upload): Boolean!
  }

`;
