'use strict'

var Utils = require('../../libs/utils')

function init () {
  Homey.log('init()')

  // Register functions to Homey
  Homey.manager('speech-input').on('speech', parseSpeach)
  Homey.manager('flow').on('action.play_movie_kodi', onFlowActionPlayMovieKodi)
  Homey.manager('flow').on('action.pause_resume_kodi', onFlowActionPauseResumeKodi)
  Homey.manager('flow').on('action.stop_kodi', onFlowActionStopKodi)
  Homey.manager('flow').on('action.play_latest_episode_kodi', onFlowActionPlayLatestEpisode)
  Homey.manager('flow').on('action.hibernate_kodi', onFlowActionHibernate)
  Homey.manager('flow').on('action.reboot_kodi', onFlowActionReboot)
  Homey.manager('flow').on('action.shutdown_kodi', onFlowActionShutdown)
  Homey.manager('flow').on('action.play_music_by_artist', onFlowActionPlayMusicByArtist)
  Homey.manager('flow').on('action.play_music_from_playlist', onFlowActionPlayMusicFromPlaylist)
  Homey.manager('flow').on('action.play_music_from_playlist.playlist.autocomplete', onFlowActionGetPlaylists)
  Homey.manager('flow').on('action.mute_kodi', onFlowActionMuteKodi)
  Homey.manager('flow').on('action.unmute_kodi', onFlowActionUnmuteKodi)
  Homey.manager('flow').on('action.subtitle_on', onFlowActionSubtitleOn)
  Homey.manager('flow').on('action.subtitle_off', onFlowActionSubtitleOff)
  Homey.manager('flow').on('action.party_mode_kodi', onFlowActionSetPartyMode)
  Homey.manager('flow').on('action.set_volume', onFlowActionSetVolume)
}
module.exports.init = init

/* ******************
	SPEECH FUNCTIONS
******************* */
function parseSpeach (speech, callback) {
  Homey.log('parseSpeach()', speech)
  console.log(speech)
  speech.triggers.some(function (trigger) {
    switch (trigger.id) {
      case 'kodi_play_movie' :
        // Parse the movie title from speech transcript
        var movieTitle = speech.transcript.replace(trigger.text, '')

        // Try to lookup the movie
        // NOTE:	no multiple device support yet, pass null as device so 1st registered device gets picked
        searchAndPlayMovie(null, movieTitle).catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
          }
        )

        // Only execute 1 trigger
        return true

      case 'kodi_play_tvshow' :
        speech.say(__('talkback.not_implemented'))
        // Only fire 1 trigger
        return true

      case 'kodi_play_music' :
        var musicTranscriptWithoutTrigger = speech.transcript.replace(trigger.text, '')
        // Check how to search for music
        if (musicTranscriptWithoutTrigger.indexOf(__('speech.by')) > -1 || musicTranscriptWithoutTrigger.indexOf(__('speech.artist')) > -1) {
          var artistSearchQuery = musicTranscriptWithoutTrigger.replace(__('speech.by'), '').replace(__('speech.artist'), '')
          // NOTE:	no multiple device support yet, pass null as device so 1st registered device gets picked
          searchAndPlayMusic(null, 'ARTIST', artistSearchQuery)
            .catch(
              function (err) {
                // Driver should throw user friendly errors
                speech.say(err)
              }
          )
        } else if (1 === 0) {
          // Add search by album / genre
        }
        // Only fire 1 trigger
        return true

      case 'kodi_play_pause' :
        Homey.manager('drivers').getDriver('kodi').playPause(null)
          .catch(
            function (err) {
              // Driver should throw user friendly errors
              speech.say(err)
            }
        )
        return true // Only fire one trigger

      case 'kodi_stop' :
        Homey.manager('drivers').getDriver('kodi').stop(null)
        .catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
          }
        )
        return true // Only fire one trigger

      case 'kodi_next' :
        Homey.manager('drivers').getDriver('kodi').nextOrPreviousTrack(null, 'next')
        .catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
          }
        )
        return true // Only fire one trigger

      case 'kodi_previous' :
        Homey.manager('drivers').getDriver('kodi').nextOrPreviousTrack(null, 'previous')
        .catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
          }
        )
        return true // Only fire one trigger

      case 'kodi_play_latest_episode' :
        var episodeTranscriptWithoutTrigger = speech.transcript.replace(trigger.text, '').replace(__('of'), '')

        playLatestEpisode(null, episodeTranscriptWithoutTrigger)
        .catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
            // 1 Retry
            speech.ask(__('question.latest_episode_retry'), function (err, result) {
              if (err) {
                speech.say(__('talkback.something_went_wrong') + ' ' + err)
              } else {
                console.log('result:', result)
                playLatestEpisode(null, result)
                .catch(
                  function (err) {
                    // Driver should throw user friendly errors
                    speech.say(err)
                  }
                )
              }
            })
          }
        )
        return true // Only fire one trigger

      case 'kodi_watch_movie' :
        speech.ask(__('question.what_movie'), function (err, result) {
          if (err) {
            speech.say(__('talkback.something_went_wrong') + ' ' + err)
          } else {
            // Try to lookup the movie (result = movietitle)
            // NOTE:	no multiple device support yet, pass null as device so 1st registered device gets picked
            searchAndPlayMovie(null, result).catch(
              function (err) {
                // Driver should throw user friendly errors
                speech.say(err)
              }
            )
          }
        })
        return true // Only fire  one trigger

      case 'kodi_hibernate' :
        // Confirm whether to hibernate
        Homey.manager('speech-input').confirm(__('question.confirm_hibernate'), function (err, confirmed) {
          if (err) {
            speech.say(__('talkback.something_went_wrong') + ' ' + err)
          } else if (confirmed) {
            // Hibernate Kodi
            Homey.manager('drivers').getDriver('kodi').hibernateKodi(null)
            .catch(
              function (err) {
                // Driver should throw user friendly errors
                speech.say(err)
              }
            )
          } else {
            // Don't do anything
          }
        })
        return true // Only fire one trigger

      case 'kodi_reboot' :
        // Confirm whether to reboot
        Homey.manager('speech-input').confirm(__('question.confirm_reboot'), function (err, confirmed) {
          if (err) {
            speech.say(__('talkback.something_went_wrong') + ' ' + err)
          } else if (confirmed) {
            // Reboot Kodi
            Homey.manager('drivers').getDriver('kodi').rebootKodi(null)
            .catch(
              function (err) {
                // Driver should throw user friendly errors
                speech.say(err)
              }
            )
          } else {
            // Don't do anything
          }
        })
        return true // Only fire trigger

      case 'kodi_shutdown' :
        // Confirm whether to reboot
        Homey.manager('speech-input').confirm(__('question.confirm_shutdown'), function (err, confirmed) {
          if (err) {
            speech.say(__('talkback.something_went_wrong') + ' ' + err)
          } else if (confirmed) {
            // Reboot Kodi
            Homey.manager('drivers').getDriver('kodi').shutdownKodi(null)
            .catch(
              function (err) {
                // Driver should throw user friendly errors
                speech.say(err)
              }
            )
          } else {
            // Don't do anything
          }
        })
        return true // Only fire trigger

      case 'kodi_start_addon' :
        // Parse the addon title from speech transcript
        var addon = speech.transcript.replace(trigger.text, '')

        // Try to lookup the movie
        // NOTE:	no multiple device support yet, pass null as device so 1st registered device gets picked
        searchAndStartAddon(null, addon).catch(
          function (err) {
            // Driver should throw user friendly errors
            speech.say(err)
          }
        )

        return true // Only fire trigger

      case 'kodi_new_movies' :
        // Get the setting for # of days to looks back
        let daysSince = Homey.manager('settings').get('days_since')
        // Use default value when no proper setting is found
        if (!Utils.isNumeric(daysSince)) {
          daysSince = 7
        }
        // Try to look up any new movies
        Homey.manager('drivers').getDriver('kodi').getNewestMovies(null, daysSince)
          .then(function (movies) {
            speech.say(__('talkback.found_following_movies', { 'days_since': daysSince }))
            movies.forEach(function (movie) {
              speech.say(movie.label)
            })
          })
          .catch(
            function (err) {
              console.log('error', err)
              // Driver should throw user friendly errors
              speech.say(err)
            }
          )

        return true // Only fire trigger

      case 'kodi_new_episodes' :
        // Get the setting for # of days to looks back
        let daysSinceEpisode = Homey.manager('settings').get('days_since')
        // Use default value when no proper setting is found
        if (!Utils.isNumeric(daysSinceEpisode)) {
          daysSinceEpisode = 7
        }
        // Try to look up any new movies
        Homey.manager('drivers').getDriver('kodi').getNewestEpisodes(null, daysSinceEpisode)
          .then(function (episodes) {
            speech.say(__('talkback.found_following_episodes', { 'days_since': daysSinceEpisode }))
            episodes.forEach(function (episode) {
              speech.say(__('talkback.found_episode', {
                'showtitle': episode.showtitle,
                'season': episode.season,
                'episode': episode.episode,
                'episode_title': episode.title
              }))
            })
          })
          .catch(
            function (err) {
              console.log('error', err)
              // Driver should throw user friendly errors
              speech.say(err)
            }
          )

        return true // Only fire trigger
    }
  })

  callback(null, true)
}

/* ******************
	FLOW ACTIONS / TRIGGER FUNCTIONS
********************/
function onFlowActionPlayMovieKodi (callback, args) {
  Homey.log('onFlowActionPlayMovieKodi', args)
  searchAndPlayMovie(args.kodi.id, args.movie_title)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionPauseResumeKodi (callback, args) {
  Homey.log('onFlowActionPauseResumeKodi()', args)
  Homey.manager('drivers').getDriver('kodi').playPause(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionStopKodi (callback, args) {
  Homey.log('onFlowActionStopKodi()', args)
  Homey.manager('drivers').getDriver('kodi').stop(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionPlayLatestEpisode (callback, args) {
  Homey.log('onFlowActionPlayLatestEpisode()', args)
  playLatestEpisode(args.kodi.id, args.series_title)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionHibernate (callback, args) {
  Homey.log('onFlowActionHibernate()', args)
  Homey.manager('drivers').getDriver('kodi').hibernateKodi(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionReboot (callback, args) {
  Homey.log('onFlowActionReboot()', args)
  Homey.manager('drivers').getDriver('kodi').rebootKodi(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionShutdown (callback, args) {
  Homey.log('onFlowActionShutdown()', args)
  Homey.manager('drivers').getDriver('kodi').shutdownKodi(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionPlayMusicByArtist (callback, args) {
  Homey.log('onFlowActionPlayMusicByArtist()', args)
  searchAndPlayMusic(args.kodi.id, 'ARTIST', args.artist)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}

function onFlowActionPlayMusicFromPlaylist (callback, args) {
  Homey.log('onFlowActionPlayMusicFromPlaylist()', args)
  playPlaylist(args.kodi.id, (args.playlist.filename !== null ? args.playlist.filename : timeOfDay()))
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error, false) })
}


function timeOfDay() {
	var d = new Date();
	var section = '';
	var folder = '/storage/.kodi/userdata/playlists/music/';
	switch(d.getHours())
	{
		case 6:
		case 7:
		case 8:
		case 9:
		case 10:
		case 11:
			section = 'Morgen';
			break;
		case 12:
		case 13:
		case 14:
		case 15:
		case 16:
		case 17:
			section = 'Middag';
			break;
		default:
			section = 'Avond';
			break;

	}
	switch(d.getDay())
	{
		case 0:
			return folder + 'Auto/Zondag_' + section + '.xsp';
		case 1:
			return folder + 'Auto/Maandag_' + section + '.xsp';
		case 2:
			return folder + 'Auto/Dinsdag_' + section + '.xsp';
		case 3:
			return folder + 'Auto/Woensdag_' + section + '.xsp';
		case 4:
			return folder + 'Auto/Donderdag_' + section + '.xsp';
		case 5:
			return folder + 'Auto/Vrijdag_' + section + '.xsp';
		case 6:
			return folder + 'Auto/Zaterdag_' + section + '.xsp';
		default:
			return folder + 'WeekendAvond.xsp';
	}
}


function onFlowActionGetPlaylists (callback, args) {
	var myItems = [
		{
            image: 'https://home.mvtk.nl/xbmc/BestAudiophileVoices.jpg',
            name: 'Best Audiophile Voices',
            description: 'Beste retro hits',
            filename: '/storage/.kodi/userdata/profiles/dts/playlists/music/Best Audiophile Voices.pls'
        },
		{
            image: 'https://home.mvtk.nl/xbmc/WYDYouthFestival.jpg',
            name: 'WYD Youth Festival',
            description: 'Jongeren muziek van de WJD',
            filename: '/storage/.kodi/userdata/playlists/music/WYD Youth Festival.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/SpringLounge.jpg',
            name: 'Spring Lounge',
            description: 'Relax muziek voor de lente',
            filename: '/storage/.kodi/userdata/playlists/music/Spring Lounge.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/SummerLounge.jpg',
            name: 'Summer Lounge',
            description: 'Relax muziek voor de zomer',
            filename: '/storage/.kodi/userdata/playlists/music/Summer Lounge.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/AutumnLounge.jpg',
            name: 'Autumn Lounge',
            description: 'Relax muziek voor de herfst',
            filename: '/storage/.kodi/userdata/playlists/music/Autumn Lounge.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/WinterLounge.jpg',
            name: 'Winter Lounge',
            description: 'Relax muziek voor de winter',
            filename: '/storage/.kodi/userdata/playlists/music/Winter Lounge.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/WeekAvond.jpg',
            name: 'Avond muziek',
            description: 'Voor door de week',
            filename: '/storage/.kodi/userdata/playlists/music/WeekAvond.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/WeekendAvond.jpg',
            name: 'Avond muziek',
            description: 'Voor in het weekend',
            filename: '/storage/.kodi/userdata/playlists/music/WeekendAvond.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/WeekendAvond.jpg',
            name: 'Avond muziek',
            description: 'Voor op de zaterdag',
            filename: '/storage/.kodi/userdata/playlists/music/Zaterdag Avond.xsp'
        },
         {
            image: 'https://home.mvtk.nl/xbmc/WeekendAvond.jpg',
            name: 'Avond muziek',
            description: 'Voor op de zondag',
            filename: '/storage/.kodi/userdata/playlists/music/Zondag Avond.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Lezen.jpg',
            name: 'Lezen',
            description: 'Rustige muziek',
            filename: '/storage/.kodi/userdata/playlists/music/Lezen.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Rustig.jpg',
            name: 'Rustig',
            description: 'Rustige relax muziek',
            filename: '/storage/.kodi/userdata/playlists/music/Rustig.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/RelaxMeditatie.jpg',
            name: 'Relax & Meditatie',
            description: 'Relax muziek & muziek uit Taizé',
            filename: '/storage/.kodi/userdata/playlists/music/RelaxMeditatie.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Meditatie.jpg',
            name: 'Meditatie',
            description: 'Rustige muziek uit Taizé',
            filename: '/storage/.kodi/userdata/playlists/music/Meditatie.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Taize.jpg',
            name: 'Taizé',
            description: 'Muziek uit Taizé',
            filename: '/storage/.kodi/userdata/playlists/music/Taize.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Instrumentaal.jpg',
            name: 'Instrumentaal',
            description: 'Instrumentale Taizé muziek',
            filename: '/storage/.kodi/userdata/playlists/music/Instrumentaal.xsp'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Feestje.jpg',
            name: 'Feestje',
            description: 'Waar is dat feestje? Hier is dat feestje!',
            filename: '/storage/.kodi/userdata/playlists/music/Feestje.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/Romantisch.jpg',
            name: 'Romantisch',
            description: 'Liefdesliedjes ik zou ze willen horen',
            filename: '/storage/.kodi/userdata/playlists/music/Romantisch.m3u'
        },
        {
            image: 'https://home.mvtk.nl/xbmc/time-of-day.jpg',
            name: 'Tijd van de dag',
            description: 'Muziek voor het huidige dagdeel',
            filename: null
        }
    ];

    myItems = myItems.filter(function(item){
    	return ( item.name.toLowerCase().indexOf( args.query.toLowerCase() ) > -1 )
    })



    callback( null, myItems );

}

function onFlowActionMuteKodi (callback, args) {
  Homey.log('onFlowActionMuteKodi()', args)
  Homey.manager('drivers').getDriver('kodi').muteKodi(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}

function onFlowActionUnmuteKodi (callback, args) {
  Homey.log('onFlowActionMuteKodi()', args)
  Homey.manager('drivers').getDriver('kodi').unmuteKodi(args.kodi.id)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}

function onFlowActionSubtitleOn (callback, args) {
  Homey.log('onFlowActionSubtitleOn()', args)
  Homey.manager('drivers').getDriver('kodi').setSubtitle(args.kodi.id, 'on')
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}

function onFlowActionSubtitleOff (callback, args) {
  Homey.log('onFlowActionSubtitleOff()', args)
  Homey.manager('drivers').getDriver('kodi').setSubtitle(args.kodi.id, 'off')
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}

function onFlowActionSetPartyMode (callback, args) {
  Homey.log('onFlowActionSetPartyMode()', args)
  Homey.manager('drivers').getDriver('kodi').setPartyMode(args.kodi.id, args.onoff)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}

function onFlowActionSetVolume (callback, args) {
  Homey.log('onFlowActionSetVolume()', args)
  Homey.manager('drivers').getDriver('kodi').setVolume(args.kodi.id, args.volume)
    .then(function () { callback(null, true) })
    .catch(function (error) { callback(error) })
}
/* ******************
	COMMON FUNCTIONS
********************/
function searchAndPlayMovie (device, movieTitle) {
  return new Promise(function (resolve, reject) {
    Homey.log('searchAndPlayMovie', device, movieTitle)

    // Get device from driver and play the movie
    var KodiDriver = Homey.manager('drivers').getDriver('kodi')

    KodiDriver.searchMovie(device, movieTitle)
      .then(
        // Play movie and trigger flows
        function (movie) {
          KodiDriver.playMovie(device, movie.movieid)
          resolve()
        }
    )
    .catch(reject)
  })
}

function searchAndStartAddon (device, addon) {
  return new Promise(function (resolve, reject) {
    Homey.log('searchAndStartAddon', device, addon)

    // Get device from driver and play the movie
    var KodiDriver = Homey.manager('drivers').getDriver('kodi')

    KodiDriver.searchAddon(device, addon)
      .then(
        // Start the addon
        function (addon) {
          KodiDriver.startAddon(device, addon.addonid)
          resolve()
        }
    )
    .catch(reject)
  })
}

// queryProperty can be ARTIST or ALBUM
function searchAndPlayMusic (device, queryProperty, searchQuery) {
  return new Promise(function (resolve, reject) {
    Homey.log('searchAndPlayMusic()', device, queryProperty, searchQuery)
    // Get the device from driver and search for music
    var KodiDriver = Homey.manager('drivers').getDriver('kodi')
    KodiDriver.searchMusic(device, queryProperty, searchQuery)
      .then(
        function (songsToPlay) {
          KodiDriver.playMusic(device, songsToPlay, true)
          resolve()
        }
      )
      .catch(reject)
  })
}


function playPlaylist (device, playlist) {
  return new Promise(function (resolve, reject) {
    Homey.log('playPlaylist()', device, playlist)
    // Get the device from driver and search for music
    var KodiDriver = Homey.manager('drivers').getDriver('kodi')
    	KodiDriver.playMusicPlaylist(device, playlist)
       .then(
        function () {
          resolve()
        }
      )
      .catch(reject)
  })
}

function playLatestEpisode (device, seriesName) {
  return new Promise(function (resolve, reject) {
    Homey.log('playLatestEpisode()', device, seriesName)
    // Get the device from driver and search for the latest episode of the series
    var KodiDriver = Homey.manager('drivers').getDriver('kodi')
    KodiDriver.getLatestEpisode(device, seriesName)
      .then(
        function (episodeToPlay) {
          KodiDriver.playEpisode(device, episodeToPlay)
          resolve()
        }
      )
      .catch(reject)
  })
}
