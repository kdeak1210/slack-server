import formatErrors from '../formatErrors';
import { requiresAuth } from '../permissions';

export default {
  Mutation: {
    createChannel: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const member = await models.Member.findOne(
          { where: { teamId: args.teamId, userId: user.id } },
          { raw: true },
        );
        if (!member.admin) {
          return {
            ok: false,
            errors: [
              {
                path: 'name',
                message: 'You have to be the team owner to create channels',
              },
            ],
          };
        }
        const response = await models.sequelize.transaction(async (transaction) => {
          const channel = await models.Channel.create(args, { transaction });
          if (!args.public) {
            // private channel, create a TABLE to know who is invited to the team
            // Filter currentuser out,add back in (member regardless if explicitly added self)
            const members = args.members.filter(m => m !== user.id);
            members.push(user.id);
            const pcmembers = members.map(m => ({ userId: m, channelId: channel.dataValues.id }));
            await models.PCMember.bulkCreate(pcmembers, { transaction });
          }
          return channel;
        });
        return {
          ok: true,
          channel: response,
        };
      } catch (err) {
        console.log(err);
        return {
          ok: false,
          errors: formatErrors(err, models),
        };
      }
    }),
  },
};
