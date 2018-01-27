import axios from 'axios';

/* eslint-env jest */

/** Describes a test suite
 * describe, test, and expect are global keywords coming from Jest
 */
describe('user resolvers', () => {
  test('allUsers', async () => {
    const response = await axios.post('http://localhost:8080/graphql', {
      query: `
        query {
          allUsers {
            id
            username
            email
          }
        }
      `,
    });
    // console.log(JSON.stringify(response.data.data.allUsers));
    const { data } = response;
    expect(data).toMatchObject({
      data: {
        allUsers: [],
      },
    });
  });

  test('register', async () => {
    const response = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation {
          register(username: "testuser", email: "testuser@test.com", password: "1234567") {
            ok
            errors {
              path
              message
            }
            user {
              username
              email
            }
          }
        }
      `,
    });

    const { data } = response;
    expect(data).toMatchObject({
      data: {
        register: {
          ok: true,
          errors: null,
          user: {
            username: 'testuser',
            email: 'testuser@test.com',
          },
        },
      },
    });

    const response2 = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation {
          login(email: "testuser@test.com", password: "1234567") {
            token
            refreshToken
          }
        }
      `,
    });

    const { data: { login: { token, refreshToken } } } = response2.data;

    // Try making an authorized request using the tokens
    const response3 = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation {
          createTeam(name: "team1") {
            ok
            team {
              name
            }
          }
        }
      `,
    }, {
      headers: {
        'x-token': token,
        'x-refresh-token': refreshToken,
      },
    });

    expect(response3.data).toMatchObject({
      data: {
        createTeam: {
          ok: true,
          team: {
            name: 'team1',
          },
        },
      },
    });
  });
});
