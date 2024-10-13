const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const spotifyApi = require('./spotifyAuth');

const availableLanguages = ['English', 'Hindi', 'Punjabi', 'Español', 'French', 'German', 'Mandarin', 'Japanese'];

const app = express();
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

let userPreferences = {
  selectedGenres: [],
  selectedMoods: [],
  setDuration: 0,
  sampleSongs: [],
  selectedLanguages: []
};

// Root route to confirm server is running
app.get('/', (req, res) => {
  res.send('Welcome to the Music Recommendation API! Please use the appropriate endpoints.');
});

// Endpoint to handle genre selection (up to 3)
app.post('/api/genres', (req, res) => {
  const { genres } = req.body;
  if (genres.length <= 3) {
    userPreferences.selectedGenres = genres;
    res.status(200).json({ message: "Genres saved successfully" });
  } else {
    res.status(400).json({ error: "You can select up to 3 genres" });
  }
});

// Endpoint to handle mood selection (up to 2)
app.post('/api/moods', (req, res) => {
  const { moods } = req.body;
  if (moods.length <= 2) {
    userPreferences.selectedMoods = moods;
    res.status(200).json({ message: "Moods saved successfully" });
  } else {
    res.status(400).json({ error: "You can select up to 2 moods" });
  }
});

// Endpoint to handle duration selection
app.post('/api/duration', (req, res) => {
  const { duration } = req.body;
  userPreferences.setDuration = Number(duration); // Convert to number
  res.status(200).json({ message: "Duration saved successfully" });
});

// Endpoint to handle sample song selection
app.post('/api/samplesongs', (req, res) => {
  const { songs } = req.body;
  if (songs.length <= 5) {
    userPreferences.sampleSongs = songs;
    res.status(200).json({ message: "Sample songs saved successfully" });
  } else {
    res.status(400).json({ error: "You can select up to 5 sample songs" });
  }
});

// Endpoint to handle language selection (up to 2)
app.post('/api/languages', (req, res) => {
  const { languages } = req.body;
  if (languages.length <= 2) {
    userPreferences.selectedLanguages = languages;
    res.status(200).json({ message: "Languages saved successfully" });
  } else {
    res.status(400).json({ error: "You can select up to 2 languages" });
  }
});

// Endpoint to get summary of user choices
app.get('/api/summary', (req, res) => {
  res.status(200).json(userPreferences);
});

// Endpoint to generate playlist based on user preferences
app.get('/api/generate-playlist', async (req, res) => {
  try {
    const { selectedGenres, selectedMoods, sampleSongs, setDuration } = userPreferences;

    // Ensure setDuration is a number and is valid
    if (typeof setDuration !== 'number' || ![10, 15, 20].includes(setDuration)) {
      return res.status(400).json({ error: "Invalid duration" });
    }
    
    // Determine number of songs based on duration
    let numberOfSongs = 0;
    switch (setDuration) {
      case 10:
        numberOfSongs = 7; // 10 minutes
        break;
      case 15:
        numberOfSongs = 13; // 15 minutes
        break;
      case 20:
        numberOfSongs = 17; // 20 minutes (for paid users)
        break;
      default:
        return res.status(400).json({ error: "Invalid duration" });
    }

    // Fetch recommendations from Spotify
    let seedTracks = [];
    for (let songName of sampleSongs) {
      const searchResult = await spotifyApi.searchTracks(`track:${songName}`, { limit: 1 });
      if (searchResult.body.tracks.items.length > 0) {
        seedTracks.push(searchResult.body.tracks.items[0].id);
      } else {
        console.warn(`No results for song: ${songName}`);
      }
    }

    // Limit seed tracks to 5
    seedTracks = seedTracks.slice(0, 5);

    // Convert selected genres to Spotify genres
    const spotifyGenres = {
      'Dubstep': 'dubstep',
      'Hip hop': 'hip-hop',
      'Trance': 'trance',
      'Deep House': 'deep-house',
      'Drum and bass': 'drum-and-bass',
      'House': 'house',
      'Techno': 'techno',
      'Electro house': 'electro-house',
      'Electronic': 'electronic',
    };

    let seedGenres = selectedGenres.map(genre => spotifyGenres[genre]).slice(0, 5);

    // Prepare recommendation options
    const recOptions = {
      seed_genres: seedGenres,
      seed_tracks: seedTracks,
      limit: 50, // Get up to 50 tracks
    };

    // Adjust recommendations based on moods
    if (selectedMoods.includes('Energetic')) {
      recOptions.min_energy = 0.7;
      recOptions.min_tempo = 120;
    }

    if (selectedMoods.includes('Chill')) {
      recOptions.max_energy = 0.4;
      recOptions.max_tempo = 100;
    }

    // Fetch recommendations
    const recData = await spotifyApi.getRecommendations(recOptions);
    const recTracks = recData.body.tracks;

    // Check if tracks were returned
    if (!recTracks || recTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found based on your preferences.' });
    }

    // Compile playlist until the desired number of songs is reached
    let playlistTracks = [];
    for (let i = 0; i < numberOfSongs && i < recTracks.length; i++) {
      playlistTracks.push(recTracks[i]);
    }

    // Send the playlist back to the frontend
    res.status(200).json({ playlist: playlistTracks });
  } catch (error) {
    console.error('Error generating playlist:', error);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

// Endpoint to search for a specific song by name
app.post('/api/add-song', async (req, res) => {
  const { songName } = req.body;

  try {
    const searchResult = await spotifyApi.searchTracks(`track:${songName}`, { limit: 1 });
    if (searchResult.body.tracks.items.length > 0) {
      const track = searchResult.body.tracks.items[0];
      const songData = {
        name: track.name,
        artists: track.artists.map(artist => artist.name), // Collect artist names
        preview_url: track.preview_url,
      };
      res.status(200).json(songData);
    } else {
      res.status(404).json({ error: 'Song not found.' });
    }
  } catch (error) {
    console.error('Error searching for song:', error);
    res.status(500).json({ error: 'Failed to search for song.' });
  }
});

app.get('/api/generate-playlist', async (req, res) => {
  try {
    const { selectedGenres, selectedMoods, sampleSongs, setDuration } = userPreferences;

    // Ensure setDuration is a number and is valid
    if (typeof setDuration !== 'number' || ![10, 15, 20].includes(setDuration)) {
      return res.status(400).json({ error: "Invalid duration" });
    }

    // Determine number of songs based on duration
    let numberOfSongs = 0;
    switch (setDuration) {
      case 10:
        numberOfSongs = 7; // 10 minutes
        break;
      case 15:
        numberOfSongs = 13; // 15 minutes
        break;
      case 20:
        numberOfSongs = 17; // 20 minutes (for paid users)
        break;
      default:
        return res.status(400).json({ error: "Invalid duration" });
    }

    // Fetch recommendations from Spotify
    let seedTracks = [];
    for (let songName of sampleSongs) {
      const searchResult = await spotifyApi.searchTracks(`track:${songName}`, { limit: 1 });
      if (searchResult.body.tracks.items.length > 0) {
        seedTracks.push(searchResult.body.tracks.items[0].id);
      } else {
        console.warn(`No results for song: ${songName}`);
      }
    }

    // Limit seed tracks to 5
    seedTracks = seedTracks.slice(0, 5);

    // Convert selected genres to Spotify genres
    const spotifyGenres = {
      'Dubstep': 'dubstep',
      'Hip hop': 'hip-hop',
      'Trance': 'trance',
      'Deep House': 'deep-house',
      'Drum and bass': 'drum-and-bass',
      'House': 'house',
      'Techno': 'techno',
      'Electro house': 'electro-house',
      'Electronic': 'electronic',
    };

    let seedGenres = selectedGenres.map(genre => spotifyGenres[genre]).slice(0, 5);

    // Prepare recommendation options
    const recOptions = {
      seed_genres: seedGenres,
      seed_tracks: seedTracks,
      limit: 50, // Get up to 50 tracks
    };

    // Adjust recommendations based on moods
    if (selectedMoods.includes('Energetic')) {
      recOptions.min_energy = 0.7;
      recOptions.min_tempo = 120;
    }

    if (selectedMoods.includes('Chill')) {
      recOptions.max_energy = 0.4;
      recOptions.max_tempo = 100;
    }

    // Fetch recommendations
    const recData = await spotifyApi.getRecommendations(recOptions);
    const recTracks = recData.body.tracks;

    // Check if tracks were returned
    if (!recTracks || recTracks.length === 0) {
      return res.status(404).json({ error: 'No tracks found based on your preferences.' });
    }

    // Compile playlist until the desired number of songs is reached
    let playlistTracks = [];
    for (let i = 0; i < numberOfSongs && i < recTracks.length; i++) {
      playlistTracks.push(recTracks[i]);
    }

    // Send the playlist back to the frontend
    res.status(200).json({ playlist: playlistTracks });
  } catch (error) {
    console.error('Error generating playlist:', error);
    res.status(500).json({ error: 'Failed to generate playlist' });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
