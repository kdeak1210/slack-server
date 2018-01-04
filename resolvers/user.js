import bcrypt from 'bcrypt';

export default {
  Query: {
    getUser: (parent, { id }, { models }) => models.User.findOne({ where: { id } }),
    allUsers: (parent, args, { models }) => models.User.findAll(),
  },

  Mutation: {
    register: async (parent, { password, ...otherArgs }, { models }) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 12); // 12 salt rounds
        models.User.create({ password: hashedPassword, ...otherArgs });
        return true;
      } catch (err) {
        return false;
      }
    },
  },
};
