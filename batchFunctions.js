export const channelBatcher = async (ids, models, user) => {
  // ids = [1, 2, 3, 4] etc
  // return = [team1: [channels], team2: [channels]] etc
  const results = await models.sequelize.query(
    `select distinct on (id) * 
    from channels as c 
    left outer join pcmembers as pc 
    on c.id = pc.channel_id
    where c.team_id in (:teamIds) and (c.public = true or pc.user_id = :userId);`,
    {
      replacements: { teamIds: ids, userId: user.id },
      model: models.Channel,
      raw: true,
    },
  );

  const data = {};

  // Group by team
  results.forEach((r) => {
    if (data[r.team_id]) {
      // Push onto the existing array
      data[r.team_id].push(r);
    } else {
      // Make it as a new array
      data[r.team_id] = [r];
    }
  });

  // [[{name: 'general'}, {name: 'channel2'}], [{name: general}], []]
  console.log(data);
  return ids.map(id => data[id]);
};


export const placeholder = '';
