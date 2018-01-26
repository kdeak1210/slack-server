import formatErrors from '../formatErrors';
import { requiresAuth } from '../permissions';

export default {
  Team: {
    channels: ({ id }, args, { models }) => models.Channel.findAll({ where: { teamId: id } }),
    directMessageMembers: ({ id }, args, { models, user }) =>
      models.sequelize.query(
        'select distinct on (u.id) u.id, u.username from users as u join direct_messages as dm on (u.id = dm.sender_id) or (u.id = dm.receiver_id) where (:currentUserId = dm.sender_id or :currentUserId = dm.receiver_id) and dm.team_id = :teamId',
        {
          replacements: { currentUserId: user.id, teamId: id },
          model: models.User,
          raw: true,
        },
      ),
  },
  Query: {
    teamMembers: requiresAuth.createResolver(async (parents, { teamId }, { models }) =>
      models.sequelize.query(
        'select * from users as u join members as m on m.user_id = u.id where m.team_id = ?',
        {
          replacements: [teamId], // replaces the '?'s in query string
          model: models.User,
          raw: true,
        },
      )),
  },
  Mutation: {
    addTeamMember: requiresAuth.createResolver(async (parent, { email, teamId }, { models, user }) => {
      try {
        // run these two queries synchronously (remove await), then await BOTH to resolve (faster)
        const memberPromise = models.Member.findOne(
          { where: { teamId, userId: user.id } },
          { raw: true },
        );
        const userToAddPromise = models.User.findOne({ where: { email } }, { raw: true });
        const [member, userToAdd] = await Promise.all([memberPromise, userToAddPromise]);
        if (!member.admin) {
          return {
            ok: false,
            errors: [{ path: 'email', message: 'You cannot add members to the team' }],
          };
        }
        if (!userToAdd) {
          return {
            ok: false,
            errors: [{ path: 'email', message: 'Could not find user with email given' }],
          };
        }
        await models.Member.create({ userId: userToAdd.id, teamId });
        return {
          ok: true,
        };
      } catch (err) {
        console.log(err);
        return {
          ok: false,
          errors: formatErrors(err, models),
        };
      }
    }),

    createTeam: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        // Use 'transaction', ensures team not created if error creating 'general' channel
        const response = await models.sequelize.transaction(async () => {
          const team = await models.Team.create({ ...args });
          await models.Channel.create({ name: 'general', public: true, teamId: team.id });
          await models.Member.create({ teamId: team.id, userId: user.id, admin: true });
          return team;
        });

        return {
          ok: true,
          team: response,
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
