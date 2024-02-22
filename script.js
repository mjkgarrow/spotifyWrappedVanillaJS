// gsap.registerPlugin(ScrollTrigger)

const clientId = "e68b332488db43fb8639650151541950"
// const homepageUri = "https://wrapmenow-vanilla.netlify.app/"
const homepageUri = "http://127.0.0.1:5500/"
const scope = "user-top-read"
const colours = [
  "#ff99c8",
  "#fcf6bd",
  "#d0f4de",
  "#a9def9",
  "#e4c1f9",

  "#ff595e",
  "#ffca3a",
  "#8ac926",
  "#3CADF3",
  "#9F6FE2",

  "#f4a261",
  "#2a9d8f",
  "#e9c46a",
  "#4D8EA8",
  "#e76f51",
]
let chartScrollTriggers = [0, 0, 0, 0]

const chartInfo = {
  popularity: {
    title: "Popularity",
    yDomain: [0, 100],
    info: "Based on the total number of plays and how recent they were, 100 being most popular",
    xAxisLabel: "Rank of your most played tracks",
    yAxisLabel: "Popularity out of 100",
  },
  tempo: {
    title: "Tempo",
    yDomain: [0, 250],
    info: "Estimated tempo in beats per minute",
    xAxisLabel: "Rank of your most played tracks",
    yAxisLabel: "Beats per minute",
  },
  valence: {
    title: "Positivity",
    yDomain: [0, 1],
    info: "An indicator of cheerful or euphoric music vs sad or angry music, 1 being most positive",
    xAxisLabel: "Rank of your most played tracks",
    yAxisLabel: "Valence",
  },
  danceability: {
    title: "Danceability",
    yDomain: [0, 1],
    info: "Suitability for dancing, based on tempo, rhythm and beat strength, 1 being most danceable",
    xAxisLabel: "Rank of your most played tracks",
    yAxisLabel: "Danceability",
  },
}

let playingTrackId = ""

let currentTimePeriod = ""

let chartDrawers = []

/**
 * Initiates the Spotify login process.
 */
function login() {
  // Define the required scopes for authorization
  const scopes = "user-top-read"
  // Redirect the user to the Spotify authorization page
  window.location = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${homepageUri}&scope=${encodeURIComponent(
    scopes
  )}&response_type=token&show_dialog=false`
}

/**
 * Logs the user out by removing the access token from localStorage and redirecting to the homepage.
 */
function logout() {
  // Remove the access token from localStorage
  localStorage.removeItem("access_token")
  localStorage.removeItem("spotifyData")
  // Redirect the user to the homepage
  window.location = homepageUri
}

/**
 * Handles the page load or redirect after user authorization.
 */
async function handlePageLoadOrRedirect() {
  // Attempt to retrieve the stored access token from localStorage to see if the page
  if (getLocalStorageWithTimestamp("access_token")) {
    // Get make api calls for data and save to localStorage
    await makeApiCall()

    // Get the data
    const data = getLocalStorageWithTimestamp("spotifyData").long_term

    currentTimePeriod = "long_term"

    activateTimeRangeBtn()

    // Remove splash screen
    document.querySelector(".splash_section").remove()

    // Access token is still valid, proceed to build the site
    buildSite(data)
  } else {
    // Make splash visible, starts hidden to avoid flash at refresh
    document.querySelector(".splash_section").classList.remove("hidden")

    // Attempt to get the access token from the URL parameters after redirect
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get("access_token")

    if (accessToken) {
      // Store the access token
      setLocalStorageWithTimestamp("access_token", accessToken)

      // Redirect to homepage
      window.location = homepageUri
    }
  }
}

/**
 * Builds the site after successful authorization.
 */
function buildSite(data) {
  chartDrawers = []
  document.querySelector("main").classList.remove("hidden")

  window.scrollTo(0, 0, {
    behavior: "instant",
  })

  ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true))

  // Handle no data
  if (data.artists.length < 1 || data.tracks.length < 1) {
    const splashTitle = document.querySelector(".splash_title")
    const arrow = document.querySelector(".arrow")

    splashTitle.innerHTML =
      "No Spotify data available for that time period, sorry!"

    arrow.style.display = "none"

    deleteSections()
    return
  } else {
    document.querySelector(".splash_title").innerHTML =
      "Scroll to view your wrap"

    document.querySelector(".arrow").style.display = "block"
    deleteSections()
  }

  buildTopArtistsSection(data)
  buildTopTracksSection(data)
  buildListeningSection(data)
  buildRecommendationSection(data)
  buildTriggers(data)
}

function deleteSections() {
  const artistsSection = document.querySelector(".artists_section")
  const tracksSection = document.querySelector(".tracks_section")
  const listeningSection = document.querySelector(".listening_section")
  const recommendationSection = document.querySelector(
    ".recommendation_section"
  )

  if (
    artistsSection &&
    tracksSection &&
    listeningSection &&
    recommendationSection
  ) {
    artistsSection.remove()
    tracksSection.remove()
    listeningSection.remove()
    recommendationSection.remove()
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true))
  }
}

function buildTopArtistsSection(data) {
  let oldSection = document.querySelector(".artists_section")

  oldSection && oldSection.remove()

  const parentContainer = Object.assign(document.createElement("section"), {
    className: "artists_section",
  })

  document.querySelector("main").appendChild(parentContainer)

  const artists = data.artists.slice(0, 5)

  parentContainer.style.height = `${artists.length * 100}lvh`

  let imageHTMLStrings = []

  // Iterate through the artists array to create and append elements
  artists.forEach((artist, index) => {
    imageHTMLStrings.push(
      `
      <li>
        <img src="${artist.images[0].url}" width="600" height="600" alt="" />
        <p>#${index + 1}</p>
        <p>${artist.name}</p>
      </li>
      `
    )
  })

  const sectionTitle = Object.assign(document.createElement("div"), {
    className: "artists_section_title",
    innerHTML: "Your fave artists",
  })

  const cards = Object.assign(document.createElement("div"), {
    className: "cards",
    innerHTML: imageHTMLStrings.join(""),
  })

  const scrollerWrapper = Object.assign(document.createElement("div"), {
    className: "scroller_wrapper",
  })

  scrollerWrapper.appendChild(sectionTitle)
  scrollerWrapper.appendChild(cards)
  parentContainer.appendChild(scrollerWrapper)
}

function buildTopTracksSection(data) {
  let oldSection = document.querySelector(".tracks_section")

  oldSection && oldSection.remove()

  const tracksSectionElement = Object.assign(
    document.createElement("section"),
    {
      className: "tracks_section",
    }
  )

  document.querySelector("main").appendChild(tracksSectionElement)

  const tracks = data.tracks.slice(0, 5)

  // Create div element with class "tracks_wrapper"
  const tracksWrapperElement = Object.assign(document.createElement("div"), {
    className: "tracks_wrapper",
  })

  // Create div element with class "tracks_left_wrapper" and add text content
  const leftWrapperElement = Object.assign(document.createElement("div"), {
    className: "tracks_left_wrapper",
  })

  const leftWrapperContent = Object.assign(document.createElement("div"), {
    innerHTML: "Your top songs",
  })

  // Create div element with class "tracks_right_wrapper"
  const rightWrapperElement = Object.assign(document.createElement("div"), {
    className: "tracks_right_wrapper",
  })

  // Append the created elements to their respective parents
  leftWrapperElement.appendChild(leftWrapperContent)
  tracksWrapperElement.appendChild(leftWrapperElement)
  tracksWrapperElement.appendChild(rightWrapperElement)
  tracksSectionElement.appendChild(tracksWrapperElement)

  tracks.forEach((track, index) => {
    const trackContainer = Object.assign(document.createElement("div"), {
      className: "track_panel_wrapper",
    })

    const trackContent = Object.assign(document.createElement("div"), {
      className: "track_panel_content",
    })

    const indexParagraph = Object.assign(document.createElement("p"), {
      className: "index_par",
      textContent: `#${index + 1}`,
    })

    const trackImageWrapper = Object.assign(document.createElement("div"), {
      className: "track_image_wrapper",
    })

    const trackImage = Object.assign(document.createElement("img"), {
      id: index.toString(),
      src: track.album.images[1].url,
      alt: track.name,
      className: "track_image",
    })

    const detailsContainer = Object.assign(document.createElement("div"), {
      className: "track_labels_wrapper",
    })

    const nameParagraph = Object.assign(document.createElement("p"), {
      className: "track_name_label",
      textContent: track.name,
    })

    const artistParagraph = Object.assign(document.createElement("p"), {
      className: "track_artist_label",
      textContent: track.artists[0].name,
    })

    const buttonsWrapper = Object.assign(document.createElement("div"), {
      className: "track_buttons_wrapper",
    })

    const spotifyLink = Object.assign(document.createElement("a"), {
      className: "spotify_link",
      target: "_blank",
      href: track.external_urls.spotify,
    })

    const spotifyIcon = Object.assign(document.createElement("img"), {
      className: "spotify_icon",
      src: "static/Spotify_Icon_RGB_Black.png",
    })

    rightWrapperElement.appendChild(trackContainer)
    trackContainer.appendChild(trackContent)
    trackContent.appendChild(indexParagraph)
    trackImageWrapper.appendChild(trackImage)
    trackContent.appendChild(trackImageWrapper)
    trackContent.appendChild(detailsContainer)
    detailsContainer.appendChild(nameParagraph)
    detailsContainer.appendChild(artistParagraph)
    detailsContainer.appendChild(buttonsWrapper)
    buttonsWrapper.appendChild(spotifyLink)
    spotifyLink.appendChild(spotifyIcon)

    if (track.preview_url) {
      const [audioElement, playIconElement] = createPlayBtnAndAudio(
        track.id,
        track.preview_url
      )
      buttonsWrapper.appendChild(playIconElement)
      buttonsWrapper.appendChild(audioElement)

      // Attach the click event listener to the SVG element
      playIconElement.addEventListener("click", (event) =>
        handlePlayClick(event, track.id)
      )
    }
  })
}

function buildListeningSection(data) {
  // Delete old section
  let oldSection = document.querySelector(".listening_section")

  oldSection && oldSection.remove()

  // Create the section element and set its class
  const section = Object.assign(document.createElement("section"), {
    className: "listening_section",
    innerHTML: ` <div class="listening_intro">
    <div class="splash_card">
      <h1 class="splash_title">Your listening stats</h1>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"
        class="arrow bounce"
      >
        <path
          d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"
        />
      </svg>
    </div>
    <p>Based on data from your top 50 tracks, with trend line</p>
  </div>
  <div class="listening_charts_wrapper"></div>`,
  })

  // Append the section to the body or another element in your document
  document.querySelector("main").appendChild(section)

  createChart(data.tracks, "popularity", 5)
  createChart(data.tracks, "tempo", 6)
  createChart(data.tracks, "valence", 7)
  createChart(data.tracks, "danceability", 8)
}

function buildRecommendationSection(data) {
  // Create the section element and set its class
  const section = Object.assign(document.createElement("section"), {
    className: "recommendation_section",
    innerHTML: `
    <div class="recommendation_wrapper">
      <div class="header_container">
        <div class="header_content">
          <div class="">Music recommendations</div>
        </div>
      </div>
      <div class='vinyl_wrapper'>

          <img src="/static/vinyl.webp" class="vinyl_img"></img>
          <div class="vinyl_shadow"></div>

      </div>
    </div>
    <div class="recommendation_parent_wrapper">
      <div class="recommendation_content_wrapper"></div>
    </div>
      `,
  })

  document.querySelector("main").appendChild(section)
  const parentWrapper = document.querySelector(".recommendation_parent_wrapper")
  const wrapper = document.querySelector(".recommendation_content_wrapper")

  data.recommendations.forEach((track, index) => {
    let innerHTMLstring = `
    <div class="rec_content_wrapper">
      <div class="rec_image_wrapper">
        <img
          src="${track.album.images[track.album.images.length - 1].url}"
          alt="Great Southern Land"
          class="rec_image"
        />
      </div>
      <div class="track_buttons_wrapper"></div>
      <div class="rec_info_wrapper">
        <p class="">${track.name}</p>
        <p class="">${track.artists[0].name}</p>
      </div>
    </div>`

    const trackContainer = Object.assign(document.createElement("div"), {
      innerHTML: innerHTMLstring,
      className: "rec_wrapper",
    })

    const buttonsWrapper = trackContainer.querySelector(
      ".track_buttons_wrapper"
    )

    const spotifyLink = Object.assign(document.createElement("a"), {
      className: "spotify_link",
      target: "_blank",
      href: track.external_urls.spotify,
    })

    const spotifyIcon = Object.assign(document.createElement("img"), {
      className: "spotify_icon",
      src: "static/Spotify_Icon_RGB_Black.png",
    })

    parentWrapper.appendChild(wrapper)
    wrapper.appendChild(trackContainer)
    buttonsWrapper.appendChild(spotifyLink)
    spotifyLink.appendChild(spotifyIcon)

    if (track.preview_url) {
      const [audioElement, playIconElement] = createPlayBtnAndAudio(
        track.id,
        track.preview_url
      )
      buttonsWrapper.appendChild(playIconElement)
      buttonsWrapper.appendChild(audioElement)

      // Attach the click event listener to the SVG element
      playIconElement.addEventListener("click", (event) =>
        handlePlayClick(event, track.id)
      )
    }
  })

  wrapper.appendChild(
    Object.assign(document.createElement("div"), {
      innerHTML: `<div class="rec_content_wrapper">
    <div class="rec_image_wrapper">
      <img
        src="./static/Spotify_Icon_RGB_Black.png"
        alt="Great Southern Land"
        class="rec_image"
      />
    </div>
    <div class="rec_info_wrapper">
      <p class="">Thank you for scrolling</p>
      <p class="">I hope you enjoyed your wrap</p>
    </div>
  </div>`,
      className: "rec_wrapper",
    })
  )
}

function createChart(tracksData, searchProperty, colourIndex) {
  const chartWrapperContainer = Object.assign(document.createElement("div"), {
    className: "chart_container_wrapper",
  })

  const chartWrapper = Object.assign(document.createElement("div"), {
    className: "chart_wrapper",
  })

  const chartTitle = Object.assign(document.createElement("p"), {
    className: "chart_title",
    textContent: chartInfo[searchProperty].title,
  })

  const chartContentWrapper = Object.assign(document.createElement("div"), {
    className: "chart_content_wrapper",
    id: `${searchProperty}_chart`,
  })

  chartContentWrapper.style.backgroundColor = colours[colourIndex]

  const chartDescription = Object.assign(document.createElement("p"), {
    className: "chart_info",
    textContent: chartInfo[searchProperty].info,
  })

  const chartTooltip = Object.assign(document.createElement("div"), {
    id: `tooltip_${searchProperty}`,
  })

  chartContentWrapper.appendChild(chartTooltip)
  chartWrapperContainer.appendChild(chartWrapper)
  chartWrapper.appendChild(chartTitle)
  chartWrapper.appendChild(chartDescription)
  chartWrapper.appendChild(chartContentWrapper)

  document
    .querySelector(".listening_charts_wrapper")
    .appendChild(chartWrapperContainer)

  function calculateTrendLineData(tracksData, searchProperty) {
    const n = tracksData.length
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0

    tracksData.forEach((d, i) => {
      sumX += i
      sumY += d[searchProperty]
      sumXY += i * d[searchProperty]
      sumXX += i * i
    })

    const meanX = sumX / n
    const meanY = sumY / n
    const slope = (sumXY - sumX * meanY) / (sumXX - sumX * meanX)
    const intercept = meanY - slope * meanX

    return { slope, intercept }
  }

  function drawTrendLine(svg, x, y, tracksData, trendLineData) {
    const line = d3
      .line()
      .x((d, i) => x(i + 1))
      .y((d, i) => y(trendLineData.slope * i + trendLineData.intercept))

    let trendLine = svg
      .append("path")
      .datum(tracksData) // Bind data to the line
      .attr("class", "trendline")
      .attr("id", `trend_${searchProperty}`)
      .attr("d", line)
      .attr("fill", "none")
      .attr("opacity", 0.5)
      .attr("stroke", "white") // Choose a stroke color that stands out
      .attr("stroke-width", 5)
      .style(
        "stroke-dasharray",
        document.querySelector(`#trend_${searchProperty}`).getTotalLength()
      )
      .style(
        "stroke-dashoffset",
        document.querySelector(`#trend_${searchProperty}`).getTotalLength()
      )

    // Calculate start and end points for the line
    let x1 = x(1),
      y1 = y(trendLineData.slope * 1 + trendLineData.intercept),
      x2 = x(tracksData.length),
      y2 = y(trendLineData.slope * tracksData.length + trendLineData.intercept)

    // Calculate angle in degrees
    let angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)

    // Add text
    svg
      .append("text")
      .attr("class", "trend_line_label")
      .attr("x", x1)
      .attr("y", y2)
      .attr("dy", "-10") // Adjust to position above the end of the line
      .attr("text-anchor", "start")
      .attr("opacity", 0)
      .attr("fill", "white")
      .attr("transform", `rotate(${angle},${x2},${y2})`)
      .text("Overall trend")

    return trendLine
  }

  function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  function generatePopup(d, i) {
    return `
        <div>
          <div class="chart_popup_image_container">
            <img src="${d.album.images[d.album.images.length - 1].url}"/>
          </div>
        </div>
        <div>
          <p>
            #${i + 1}
            <br>
            ${d.name}
            <br>
            ${d.artists[0].name}
            <br>
            ${capitalise(chartInfo[searchProperty].title)}: ${d[searchProperty]}
          </p>
        </div>
        `
  }

  function drawChart() {
    // Clear existing SVG to avoid duplication on resize
    d3.select(`#${searchProperty}_chart`).select("svg").remove()

    const margin = { top: 20, right: 20, bottom: 30, left: 50 }

    // Recalculate dimensions based on the current container size
    let width =
      parseInt(d3.select(`#${searchProperty}_chart`).style("width")) -
      margin.left -
      margin.right

    let height = window.innerHeight * 0.5 - margin.top - margin.bottom

    // Your chart setup and rendering logic here, adjusted to use the updated 'width' and 'height'
    const svg = d3
      .select(`#${searchProperty}_chart`)
      .append("svg")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    // X scales
    const x = d3.scaleLinear().domain([1, tracksData.length]).range([0, width])
    // .nice()

    // Y scales
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(tracksData, (d) => d[searchProperty])])
      .range([height, 0])
      .nice()

    // X-axis
    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(
            d3
              .range(1, tracksData.length + 1)
              .filter((d) => d === 1 || d % 5 === 0)
          )
          .tickFormat((d) => d)
      )

    // Y-axis
    const yAxis = svg.append("g").call(d3.axisLeft(y))

    // X-axis label
    xAxis
      .append("text")
      .attr("y", 35)
      .attr("x", width / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(chartInfo[searchProperty].xAxisLabel)

    // Y-axis label
    yAxis
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -35)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text(chartInfo[searchProperty].yAxisLabel)

    // Calculate trend line data
    const trendLineData = calculateTrendLineData(tracksData, searchProperty)

    // Draw the trend line
    drawTrendLine(svg, x, y, tracksData, trendLineData)

    // Create anchor elements for each data point
    const anchors = svg
      .selectAll("a")
      .data(tracksData)
      .enter()
      .append("a")
      .attr("xlink:href", (d) => d.external_urls.spotify)
      .attr("target", "_blank")

    anchors
      .append("circle")
      .attr("class", "hidden")
      .attr("fill", colours[colourIndex - 5])
      .attr("r", 5)
      .attr("cx", (d, i) => x(i + 1))
      .attr("cy", (d) => y(d[searchProperty]))
      .on("mouseover", function (event, d) {
        const popup = d3
          .select(`#tooltip_${searchProperty}`)
          .style("opacity", 1)
          .style("visibility", "visible")
          .style("left", event.layerX + 10 + "px")
          .style("top", event.layerY - 10 + "px")
          .html(
            generatePopup(
              d,
              tracksData.findIndex((track) => track.id === d.id)
            )
          )

        adjustPopupPosition(popup.node())
      })
      .on("mouseout", function () {
        d3.select(`#tooltip_${searchProperty}`)
          .style("opacity", 0)
          .style("visibility", "hidden")
      })

    // Function to adjust the popup position
    function adjustPopupPosition(popup) {
      const overflowWidth =
        popup.getBoundingClientRect().right - window.innerWidth

      if (overflowWidth > 0) {
        // Popup overflows the right edge of the screen
        // Adjust the left position to move the popup to the left
        const currentLeft = parseFloat(popup.style.left)
        const currentTop = parseFloat(popup.style.top)
        popup.style.left = `${currentLeft - overflowWidth - 20}px` // Subtract overflow and a little extra
        popup.style.top = `${currentTop + 25}px` // Lower popup a bit so it doesn't cover the mouse
      }
    }
  }

  chartDrawers.push(drawChart)

  drawChart()

  let resizeTimeout
  let initialWidth = window.innerWidth

  window.addEventListener("resize", function () {
    let newWidth = window.innerWidth
    clearTimeout(resizeTimeout)
    if (Math.abs(newWidth - initialWidth) > 2) {
      resizeTimeout = setTimeout(function () {
        let d = getLocalStorageWithTimestamp("spotifyData")[currentTimePeriod]

        ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true))

        buildTriggers(d)

        drawChart() // Redraw chart with new dimensions
      }, 10)
    }
  })
}

function createPlayBtnAndAudio(trackId, trackPreviewURL) {
  // Create an audio element
  const audioElement = document.createElement("audio")
  audioElement.id = `audio-${trackId}`
  audioElement.src = trackPreviewURL
  audioElement.setAttribute("data-wave-id", trackId)

  const svgElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  )
  svgElement.id = `play-${trackId}`
  svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svgElement.setAttribute("height", "2em")
  svgElement.setAttribute("viewBox", "0 0 512 512")
  svgElement.setAttribute("class", "play_icon")

  // Create a path element and set its 'd' attribute
  const pathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  )
  pathElement.setAttribute(
    "d",
    "M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9V344c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"
  )

  // Append the path element to the SVG element
  svgElement.appendChild(pathElement)

  return [audioElement, svgElement]
}

function handlePlayClick(event, trackId) {
  event.preventDefault()
  if (playingTrackId && playingTrackId !== `audio-${trackId}`) {
    const currentPlay = document.getElementById(playingTrackId)
    currentPlay.pause()
  }

  const playIcon = document.getElementById(`play-${trackId}`)
  const audio = document.getElementById(`audio-${trackId}`)

  audio.volume = 0.1

  // Add event listeners to track audio state changes
  audio.addEventListener("play", () => {
    playIcon.classList.add("animate-spin")
  })

  audio.addEventListener("pause", () => {
    playIcon.classList.remove("animate-spin")
  })

  // Toggle play/pause
  if (audio.paused) {
    audio.play()
    playingTrackId = `audio-${trackId}`
  } else {
    audio.pause()
    playingTrackId = ""
  }
}

function buildTriggers(data) {
  let tracks = data.tracks.slice(0, 5)
  let artists = data.artists.slice(0, 5)
  buildArtistSectionTriggers(artists.length)
  buildTracksSectionTriggers(tracks.length)
  buildListeningSectionTriggers(data.tracks.length)
  buildRecommendationSectionTriggers()
}

function buildArtistSectionTriggers(dataLength) {
  let listElements = gsap.utils.toArray(".cards li")
  let images = gsap.utils.toArray(".cards li img")
  let textsElements = gsap.utils.toArray(".cards li p")

  gsap.set(images, { rotateY: -45, scale: 0.8, opacity: 0 })
  gsap.set(textsElements, { rotateY: -45, scale: 0.8, opacity: 0 })

  const TIMELINE = gsap.timeline({
    immediateRender: false,
    ease: "linear",
    scrollTrigger: {
      trigger: ".artists_section",
      start: "top top",
      end: `+=${dataLength * (100 - 100 / dataLength)}%`,
      scrub: true,
      fastScrollEnd: true,
    },
  })

  listElements.forEach((box, index) => {
    let img = box.querySelector("img")
    let text = box.querySelectorAll("p")
    let isLastElement = index === listElements.length - 1

    TIMELINE.to(
      text,
      {
        scale: 1,
        opacity: 1,
        rotationY: 0,
        duration: 1,
      },
      index < 0 ? 0 : `-=1`
    )
      .to(
        img, // rotate and skew images
        {
          scale: 1,
          opacity: 1,
          rotationY: 0,
          duration: 1,
        },
        index < 0 ? 0 : `-=1`
      )
      .to(img, {
        scale: isLastElement ? 1 : 0.8,
        opacity: isLastElement ? 1 : 0,
        rotationY: isLastElement ? 0 : 45,
        duration: isLastElement ? 0 : 1,
      })
      .to(
        text,
        {
          scale: isLastElement ? 1 : 0.8,
          opacity: isLastElement ? 1 : 0,
          rotationY: isLastElement ? 0 : 45,
          duration: isLastElement ? 0 : 1,
        },
        `-=1`
      )

    TIMELINE.to(
      listElements, // shift the images over
      {
        x: `${-100 * (index + 1)}%`,
        duration: 1,
      },
      index < 0 ? `-=1` : isLastElement ? `-=1` : `-=2`
    )

    // TIMELINE2.to(text, { opacity: 1, duration: 1, delay: 4 }).to(text, {
    //   opacity: isLastElement ? 1 : 0,
    //   duration: 1,
    // })
  })
}

function buildTracksSectionTriggers(tracksLength) {
  // Scroll trigger for background colour
  const timeline = gsap.timeline({
    scrollTrigger: {
      fastScrollEnd: true,
      trigger: ".tracks_wrapper",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  })

  colours.forEach((color, index) => {
    if (index >= tracksLength && index < tracksLength * 2) {
      timeline.to(".tracks_wrapper", {
        backgroundColor: color,
      })
    }
  })

  gsap.utils.toArray(".track_panel_wrapper").forEach((track, index) => {
    gsap.set(track, { autoAlpha: 0 })
    let imgHeight = document.querySelector(".track_image").height

    // First transition: 0 to 1
    gsap.to(track, {
      autoAlpha: 1,
      immediateRender: false,
      ease: "power1.in",
      scrollTrigger: {
        fastScrollEnd: true,
        trigger: track,
        start: `top ${index > 0 ? "90%" : "40%"}`,
        end: `top ${index > 0 ? "center" : "top"}`,
        scrub: true,
      },
    })

    // Next transition: 1 to 0
    gsap.to(track, {
      autoAlpha: 0,
      immediateRender: false,
      ease: "power1.out",
      scrollTrigger: {
        trigger: track,
        fastScrollEnd: true,
        start: `bottom-=${imgHeight} center`,
        end: "bottom 10%",
        scrub: true,
      },
    })
  })
}

function buildListeningSectionTriggers(dataLength) {
  gsap.utils.toArray(".chart_wrapper").forEach((chartWrapper) => {
    let path = chartWrapper.querySelector(`.trendline`)
    let pathLabel = chartWrapper.querySelector(`.trend_line_label`)
    let pathLength = path ? path.getTotalLength() : 0

    ScrollTrigger.create({
      fastScrollEnd: true,
      trigger: chartWrapper,
      start: "top top",
      end: "bottom top ",
      onUpdate: (self) => {
        d3.select(chartWrapper)
          .selectAll("circle")
          .attr("class", (_, i) =>
            i >= Math.floor(self.progress * dataLength) ? "hidden" : ""
          )

        pathLabel.style.opacity = self.progress * 0.5

        let newPathLength = pathLength + self.progress * pathLength

        path.style.strokeDasharray = newPathLength
      },
    })
  })
}

function buildRecommendationSectionTriggers() {
  gsap.fromTo(
    ".vinyl_shadow",
    {
      rotate: "45",
    },
    {
      rotate: "-45",
      ease: "linear",
      scrollTrigger: {
        fastScrollEnd: true,
        trigger: ".recommendation_section",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
      },
    }
  )

  // Vinyl image rotation
  gsap.to(".vinyl_img", {
    rotate: "360",
    ease: "linear",
    scrollTrigger: {
      fastScrollEnd: true,
      trigger: ".recommendation_section",
      start: "top bottom",
      end: "bottom top",
      scrub: 1,
    },
  })

  gsap.utils.toArray(".rec_wrapper").forEach((recomendation, index) => {
    gsap.set(recomendation, { autoAlpha: 0 })
    // let imgHeight = document.querySelector(".track_image").height

    // First transition: 0 to 1
    gsap.to(recomendation, {
      autoAlpha: 1,
      immediateRender: false,
      ease: "power1.inOut",
      scrollTrigger: {
        fastScrollEnd: true,
        trigger: recomendation,
        start: `center 90%`,
        end: `center center`,
        scrub: true,
      },
    })

    // Next transition: 1 to 0
    gsap.to(recomendation, {
      autoAlpha: 0,
      immediateRender: false,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: recomendation,
        fastScrollEnd: true,
        start: `center center`,
        end: "center 10%",
        scrub: true,
      },
    })
  })
}

function activateTimeRangeBtn() {
  document.querySelectorAll(".time_btn").forEach((btn) => {
    btn.classList.remove("active")
    if (btn.classList.contains(currentTimePeriod)) {
      btn.classList.add("active")
    }
  })
}

function resetTimePeriod(time) {
  playingTrackId = ""
  currentTimePeriod = time
  activateTimeRangeBtn()
  return getLocalStorageWithTimestamp("spotifyData")[time]
}

function shortTerm() {
  buildSite(resetTimePeriod("short_term"))
}

function mediumTerm() {
  buildSite(resetTimePeriod("medium_term"))
}

function longTerm() {
  buildSite(resetTimePeriod("long_term"))
}

// Call the handlePageLoadOrRedirect function when the page loads
window.onload = handlePageLoadOrRedirect
