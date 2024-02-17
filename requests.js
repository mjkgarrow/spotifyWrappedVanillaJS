/**
 * Sets an item in localStorage with a timestamp.
 * @param {string} key - The key for the localStorage item.
 * @param {*} value - The value to be stored.
 */
function setLocalStorageWithTimestamp(key, value) {
  // Get the current timestamp
  const timestamp = new Date().getTime()
  // Create an object with the value and timestamp
  const data = { value, timestamp }
  // Stringify the object and store it in localStorage
  localStorage.setItem(key, JSON.stringify(data))
}

/**
 * Gets an item from localStorage and checks its timestamp to determine if it's still valid.
 * @param {string} key - The key of the localStorage item.
 * @returns {*} The stored value if it's within the valid period, otherwise null.
 */
function getLocalStorageWithTimestamp(key) {
  // Get the stored data from localStorage
  const storedData = localStorage.getItem(key)

  if (storedData) {
    // Parse the stored data into an object
    const { value, timestamp } = JSON.parse(storedData)
    // Get the current time
    const currentTime = new Date().getTime()
    // Define the validity period (one hour in milliseconds)
    const oneHour = 60 * 60 * 1000

    // Check if the data is older than one hour
    if (currentTime - timestamp < oneHour) {
      return value // Return the value if still valid
    } else {
      // Remove the access token from localStorage
      localStorage.removeItem("access_token")
      localStorage.removeItem("spotifyData")
      // Redirect the user to the homepage
      window.location = homepageUri
    }
  }

  return null // Return null if the data doesn't exist or is expired
}

function handleErrors(response) {
  // Check if the response status is not 200 (OK)
  if (!response.ok) {
    // Unauthorized - remove access token and redirect to homepage
    localStorage.removeItem("access_token")
    localStorage.removeItem("spotifyData")
    window.location = homepageUri

    // Throw an error anyway
    throw new Error(`Request failed with status ${response.status}`)
  }
}

async function fetchWithHeaders(endpoint, options = { method: "GET" }) {
  // Access the cookies that store the JWT and user info
  const token = getLocalStorageWithTimestamp("access_token")

  if (!token) {
    throw new Error("Authentication required")
  }

  // Merge the custom headers with the Authorization header
  const headers = Object.assign({}, options.headers, {
    Authorization: `Bearer ${token}`,
  })

  // Make the fetch request with the merged headers
  const response = await fetch("https://api.spotify.com/" + endpoint, {
    ...options,
    headers,
  })

  handleErrors(response)

  return response
}

async function getTopItems(type, timeRange, limit = 50, offset = 0) {
  try {
    let uri = `v1/me/top/${type}`
    const queryParams = []

    if (limit && limit > 0) {
      queryParams.push(`limit=${limit}`)
    }

    if (offset && offset > 0) {
      queryParams.push(`offset=${offset}`)
    }

    if (timeRange) {
      queryParams.push(`time_range=${timeRange}`)
    }

    if (queryParams.length > 0) {
      uri += `?${queryParams.join("&")}`
    }

    const response = await fetchWithHeaders(uri)
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

async function getTracksFeatures(ids, timeRange) {
  try {
    const uri = `v1/audio-features?ids=${ids.join()}`
    const response = await fetchWithHeaders(uri)
    const data = await response.json()
    return { timeRange, ...data }
  } catch (error) {
    throw error
  }
}

async function getRecommendations(seed_genres, seed_tracks, timeRange) {
  try {
    const uri = `v1/recommendations?seed_genres=${seed_genres.join()}&seed_tracks=${seed_tracks.join()}`
    const response = await fetchWithHeaders(uri)
    const data = await response.json()
    return { timeRange, ...data }
  } catch (error) {
    throw error
  }
}

async function getAllUserData() {
  try {
    const [user, playlists, following] = await Promise.all([
      getProfile(),
      getPlaylists(),
      getFollowedArtists(),
    ])

    return { user, playlists, following }
  } catch (error) {
    throw error
  }
}

function getTopKeys(objArr, itemCount, key) {
  const countedObj = objArr.slice(0, itemCount).reduce((acc, item) => {
    item[key].forEach((subItem) => {
      acc[subItem] = (acc[subItem] || 0) + 1
    })
    return acc
  }, {})

  return Object.entries(countedObj)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([genre]) => genre)
}

async function makeApiCall() {
  try {
    const types = ["tracks", "artists"]
    const timeRange = ["long_term", "medium_term", "short_term"]

    const promises = types.flatMap((type) =>
      timeRange.map((time) => getTopItems(type, time))
    )

    const results = await Promise.all(promises)

    // Process results to organize them by timeRange and type
    const spotifyData = organiseSpotifyData(results, timeRange)

    // Further processing for recommendations and stats
    await processStatsAndReccomendations(spotifyData, timeRange)

    // Save data in local storage
    setLocalStorageWithTimestamp("spotifyData", spotifyData)
  } catch (error) {
    console.error("Error fetching top items:", error)
  }
}

function organiseSpotifyData(results, timeRange) {
  return timeRange.reduce((accumulator, currentRange) => {
    // Filter results first to minimize the number of operations
    const relevantResults = results.filter((result) => {
      return (
        new URLSearchParams(new URL(result.href).search).get("time_range") ===
        currentRange
      )
    })

    // Directly reduce the filtered results into the desired structure
    const categorizedData = relevantResults.reduce(
      (data, result) => {
        const type = result.href.includes("tracks") ? "tracks" : "artists"
        data[type] = result.items // Assume items exist and overwrite for simplicity
        return data
      },
      { tracks: [], artists: [] }
    ) // Initialize with empty arrays for both tracks and artists

    accumulator[currentRange] = categorizedData

    return accumulator
  }, {})
}

async function processStatsAndReccomendations(spotifyData, timeRange) {
  const statsPromises = []
  const recommendationPromises = []

  for (const time in spotifyData) {
    // Push the promise into the array
    statsPromises.push(
      getTracksFeatures(
        spotifyData[time].tracks.map((track) => track.id),
        time
      )
    )

    // Get recommended songs
    if (spotifyData[time].tracks.length > 0) {
      const seed_tracks = spotifyData[time].tracks.reduce(
        (prev, track) => [...prev, track.id],
        []
      )
      const seed_genres = getTopKeys(spotifyData[time].artists, 5, "genres")

      recommendationPromises.push(
        getRecommendations(
          seed_genres.slice(0, 2),
          seed_tracks.slice(0, 3),
          time
        )
      )
    }
  }

  const recommendedResults = await Promise.all(recommendationPromises)
  const statsResults = await Promise.all(statsPromises)

  timeRange.forEach((time) => {
    let stats = statsResults.find((item) => item.timeRange === time)

    let recommendations = recommendedResults.find(
      (item) => item.timeRange === time
    )

    if (recommendations) {
      spotifyData[time].recommendations = recommendations.tracks
    }

    spotifyData[time].tracks = spotifyData[time].tracks.map((track) => {
      const trackStat = stats.audio_features.find(
        (item) => item.id === track.id
      )

      const mergedTrack = {
        ...track,
        danceability: trackStat.danceability,
        energy: trackStat.energy,
        key: trackStat.key,
        loudness: trackStat.loudness,
        mode: trackStat.mode,
        speechiness: trackStat.speechiness,
        acousticness: trackStat.acousticness,
        instrumentalness: trackStat.instrumentalness,
        liveness: trackStat.liveness,
        valence: trackStat.valence,
        tempo: trackStat.tempo,
        time_signature: trackStat.time_signature,
      }

      return mergedTrack
    })
  })
}
