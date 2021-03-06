/** Allows for the creation of a 'stack' of permissions checks
 * ex. requiresAdmin first checks requiresAuth
 */

const createResolver = (resolver) => {
  const baseResolver = resolver;
  baseResolver.createResolver = (childResolver) => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createResolver(newResolver);
  };
  return baseResolver;
};

export const requiresAuth = createResolver((parent, args, { user }) => {
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }
});

export const requiresTeamAccess = createResolver(async (parents, { channelId }, { user, models }) => {
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }

  const channel = await models.Channel.findOne({ where: { id: channelId } });
  const member = models.Member.findOne({
    where: { userId: user.id, teamId: channel.teamId },
  });
  if (!member) {
    throw new Error('You have to be a member of a team to subscribe to its messages');
  }
});

export const directMessageSubscription = createResolver(async (parents, { teamId, userId }, { user, models }) => {
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }

  // Expecting two members, one w/ userId passed in args, other from token (logged in user)
  const members = await models.Member.findAll({
    where: {
      teamId,
      [models.sequelize.Op.or]: [{ userId }, { userId: user.id }],
    },
  });

  if (members.length !== 2) {
    throw new Error('Something went wrong - not authorized to DM subscribe');
  }
});

export const requiresAdmin = requiresAuth.createResolver((parent, args, context) => {
  if (!context.user.isAdmin) {
    throw new Error('Requires admin access');
  }
});
