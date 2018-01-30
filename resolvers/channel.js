import formatErrors from '../formatErrors';
import { requiresAuth } from '../permissions';

export default {
  Mutation: {
    getOrCreateChannel: requiresAuth.createResolver(async (parent, { teamId, members }, { models, user }) => {
      members.push(user.id); // The members' ids' who they select, and the currentUser
      // check if dm channel already exists with these members (Note: @> in psql means 'contains')
      const [data, result] = await models.sequelize.query(`
        select c.id 
        from channels as c, pcmembers pc 
        where pc.channel_id = c.id and c.dm = true and c.public = false and c.team_id = ${teamId}
        group by c.id 
        having array_agg(pc.user_id) @> Array[${members.join(',')}] and count(pc.user_id) = ${members.length};
      `, { raw: true });
      console.log(data, result);

      if (data.length) {
        // If we have data, grab the id from the first one and thats our channel
        return data[0].id;
      }

      // There's no data returned, so we need to create the channel
      const channelId = await models.sequelize.transaction(async (transaction) => {
        const channel = await models.Channel.create({
          name: 'hello',
          public: false,
          dm: true,
          teamId,
        }, { transaction });

          // private channel, create a TABLE to know who is invited to the team
          // Filter currentuser out,add back in (member regardless if explicitly added self)
        const cId = channel.dataValues.id;
        const pcmembers = members.map(m => ({ userId: m, channelId: cId }));
        await models.PCMember.bulkCreate(pcmembers, { transaction });
        return cId;
      });

      return channelId;
    }),
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
