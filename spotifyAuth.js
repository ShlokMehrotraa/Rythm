// spotifyAuth.js
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: 'bb268f6bb7f844d59237c74aee55162d',
  clientSecret: '82e987ecdced416d9ef1ab207451bcd1',
});

spotifyApi.clientCredentialsGrant()
  .then(data => {
    console.log('Access token expires in ' + data.body['expires_in']);
    // Save the access token for future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  })
  .catch(err => {
    console.log('Error retrieving access token', err);
  });

module.exports = spotifyApi;
