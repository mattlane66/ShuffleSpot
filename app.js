$(document).ready(function() {

  var tokenMatches = window.location.hash.match(/access_token=(.*)&token_type=*/);

  if (tokenMatches) {
    var token = tokenMatches[1];

    var genres = ["jazz", "fusion", "classical", "baroque", "opera", "blues", "bluegrass", "folk", "rock", "metal", "hip hop", "r&b", "world", "electronic", "pop", "funk", "comedy", "spoken-word", "soul"];

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
        var fullData = _.groupBy(allArtists, function(artist) {
          return artist.genre;
        });

        //Full data set with artists, tracks, genres
        console.log(fullData);
      },
      error: function() {
        alert("Error getting following artists");
      }
    });
  }

});
