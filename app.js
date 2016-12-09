$(document).ready(function() {
  //Set up Handlebars templates
  var genreTemplateSource = $("#genre-template").html();
  var genreTemplate = Handlebars.compile(genreTemplateSource);

  var playerTemplateSource = $("#player-template").html();
  var playerTemplate = Handlebars.compile(playerTemplateSource);

  var tokenMatches = window.location.hash.match(/access_token=(.*)&token_type=*/);

  //Set up global variable to hold genre, artist, and track information
  var fullData;

  if (tokenMatches) {
    //Hide login screen if we're logged in
    $("#login-screen").hide();

    var token = tokenMatches[1];

    var genres = ["jazz", "fusion", "classical", "baroque", "opera", "blues", "bluegrass", "indie", "asian", "avant garde", "singer songwriter", "alternative", "caribbean", "folk", "indian", "tribal", "african", "rock", "punk", "dance", "latin", "progressive", "metal", "hip hop", "soul", "world", "reggae", "brazilian", "country", "electronic", "pop", "funk", "comedy", "spoken word"];

    $.ajax({
      type: "GET",
      url: "https://api.spotify.com/v1/me/following?type=artist&limit=50",
      headers: {
        "Authorization": "Bearer " + token
      },
      success: function(data) {
        var followingArtists = data.artists.items;
        var allArtists = [];

        followingArtists.forEach(function(artist) {
          //Loop through each artist and assign a genre to it based on regular expression matching from approved genres
          for (var i = 0; i < artist.genres.length; i++) {
            var genre = artist.genres[i];

            //If pattern is matched from approved genres set this as the artist's genre
            for (var j = 0; j < genres.length; j++) {
              //Build regex based on pre-defined genres and match against artist genre
              var pattern = new RegExp(genres[j], "ig");

              if (pattern.test(genre)) {
                return allArtists.push({
                  artist: artist,
                  genre: genres[j]
                });
              }
            }
          }

          //If no genre could be determined, give a default
          return allArtists.push({
            artist: artist,
            genre: "undetermined"
          });
        });

        allArtists.forEach(function(artistObj) {
          $.ajax({
            type: "GET",
            url: "https://api.spotify.com/v1/artists/" + artistObj.artist.id + "/top-tracks?country=us",
            success: function(trackData) {
              artistObj.tracks = trackData.tracks;
            }
          });
        });

        //Group the artists based on genre
        fullData = _.groupBy(allArtists, function(artist) {
          return artist.genre;
        });

        console.log(fullData, "FULL DATA");

        //Loop through data from Spotify and display genres on the UI using Handlebars
        for (var genre in fullData) {
          $("#genre-container").append(genreTemplate({
            genre: genre
          }));
        }
      },
      error: function() {
        alert("Error getting following artists");
      }
    });

  }

  //Close player on click of the X
  $(document).on("click", ".player-close", function() {
    var $playerContainer = $("#player-container");

    $playerContainer.animate({
      "bottom": "-100%"
    }, function() {
      $playerContainer.hide();
    });
  });

  //Play music for genre
  $(document).on("click", ".square", function() {
    var selectedGenre = $(this).attr("data-genre");

    playMusic(selectedGenre);
  });

  //Play music function that recurses upon completion of track
  function playMusic(selectedGenre) {
    var genreArtist = _.sample(fullData[selectedGenre], 1)[0];
    var randomTrack = _.sample(genreArtist.tracks, 1)[0];

    var artistImage = genreArtist.artist.images[0].url;

    if (!artistImage) {
      artistImage = "http://placehold.it/150x150";
    }

    $("#player-container").html(playerTemplate({
      artistImage: artistImage,
      artistName: genreArtist.artist.name,
      trackTitle: randomTrack.name,
      songSource: randomTrack.preview_url
    }));

    $("#player-container").show().animate({
      "bottom": "0"
    });

    $("#audio-player")[0].play();

    $("#audio-player").on("ended", function() {
      playMusic(selectedGenre);
    });
  }
});
