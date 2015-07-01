/**
 * CITY NEWS MAP .
 *
 * The purpose of this application is to collect local news about a city , get the location of the news inside
 * the city and show these in a map and a list view.
 *
 * You can select  the city , search by news content , sort by date , hide and delete news.
 *
 * The news content is collected through a general purpose search API (Bing API , google news search is deprecated)
 * so it is difficult to get specific city local news and location for that therefore the information can be imprecise.
 *
 * The approach to get the news information and location is to query as much precise as the API permits  , in this case (Bing news search API)
 * the search query is constructed with the country and city name , if there is marked (Bing specification to choose the country where
 * the news are generated ) it  will be added to the query.   Once we get the news we apply a simple regular expression  to detect street names ,
 * if there is street name the news are included  , only one new is permitted for each street.  (IE ,if we search local news in London we don’t
 *  want many news talking about downing street as this is the most common street name in London news and usually talks about politics).
 *
 * Because the difficulty to get specify queries to each language news search are performed in English and the best results are obtained in
 * English speaking places. (IE , for Berlin we need a German query for the API and a specific regular expression in this language to get the street location for the news.).
 *
 * Sometimes location results are wrong due of google geolocation API free quota limit.
 */


var GOOGLE_API_KEY = 'AIzaSyDwaX72ZHH6uRu8AABAIcFc0nKEpqBCV3U';
var MAPS_GEOCODE_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
var BING_API_KEY = '9XRXbONaSXn/TJ8YDbdpf3mZUB0B2rm7SdpPBEzq0yE';
var googleMap; // declares a global map variable.
var BING_NEWS_QUERY = 'https://api.datamarket.azure.com/Bing/Search/v1/News';
var EMBEDLY_API_KEY = 'd347b17304734ba1b66461039c7d34d1';
var NEWS_SEARCH_PAGES = 1; //number of pages for bing search (one AJAX call per page) , each page has 15 news.
var BING_NEWS_MARKETS = { //Used to get specific market information for each supported country in bing news search query.
	AU: 'en-AU',
	CA: 'en-CA',
	GB: 'en-GB',
	UK: 'en-GB',
	ID: 'en-ID',
	IE: 'en-IE',
	IN: 'en-IN',
	MY: 'en-MY',
	NZ: 'en-NZ',
	PH: 'en-PH',
	SG: 'en-SG',
	US: 'en-US',
	XA: 'en-XA',
	ZA: 'en-ZA'
};
var EMBEDLY_RESIZE_IMAGE_SERVICE_URL = 'http://i.embed.ly/1/image/resize?';
var getFormatedDate = function(date) {
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};


/**
 * Represents a coordinate.
 * @constructor
 */
function Coordinate(lon, lat) {
	this.longitude = lon;
	this.latitude = lat; // body...
}

/**
 * Represents a city.
 * @constructor
 *  @param {countryCode} International code string from the city country. (IE for Spain 'ES')
 */
function City(name, completeName, countryCode, coordinate) {
	this.name = name;
	this.completeName = completeName;
	this.countryCode = countryCode;
	this.coordinate = coordinate;
}


/**
 * Global initialization function , in this case set map canvas height and news container max-height.
 * without this modifications the map is not showed and the news container can be bigger than current screen.
 */
function initialize() {
	ko.applyBindings(new localNewsViewModel());
	var resizeFn = function() {
		var winSize = $(window).height();
		$('#map-canvas').height(winSize * 0.92);
		$('.inner-scrollbar').css({
			'max-height': winSize * 0.92
		});
	};
	$(document).ready(resizeFn);
	window.addEventListener('resize', resizeFn);

Offline.options = {checks: {image: {url: 'images/my-image.gif'}, active: 'image'}}
	var run = function(){
 if (Offline.state === 'up')
 Offline.check();
 }
 setInterval(run, 5000);

}

/**
 * Gets a thumbnail size URL from the given URL.
 */
function getThumbnail(imgUrl) {
	return getResizeImage(imgUrl, 64);
}
/**
 * Gets a resized image URL from the given URL.
 * Uses embedly resize images service.
 * @param {imgUrl}
 * @param {width} Resized image width.
 * @return resized image URL from the embedly service.
 *
 */
function getResizeImage(imgUrl, width) {
	if (!imgUrl) return imgUrl;
	return EMBEDLY_RESIZE_IMAGE_SERVICE_URL + 'key=' + EMBEDLY_API_KEY + '&url=' + imgUrl + '&width=' + width + '&grow=false';
}



/**
 * Represents a news , it's knockout dependent (has some observables) but can be used in different views. It uses observables because
 * some members have defer load and the view needs to be updated. (IE in this case, news latitude and longitude are calculated through google geocode service with news
 * information. News image URL is provided through embed.ly API)
 * @constructor
 */
function News(street, date, description, title, url, source, imgsrc) {
	this.street = street;
	this.longitude = ko.observable();
	this.latitude = ko.observable();
	this.date = new Date(date);
	this.description = description;
	this.title = title;
	this.url = url;
	this.imgsrc = ko.observable(imgsrc);
	this.source = source;
}


/**
 * Fills an observable array with news from a city. Only news with a regular expression with street will be included.
 * It uses Bing news search service to get the news a regular expression to get the street from the news a some services to get
 * the street location and adicional information , like the image URL.
 * @param {cityObj} Observable City object where the city news will be searched.
 * @param {newsOsvArr} Observable Array where news will be pushed.
 * @param {NewsClass} Class of the news constructor.(IE if you want to extend common News object.)
 */
function getNews(cityObj, newsOsvArr, NewsClass) {
	var self = this;
	// Bing Azure API uses basic auth.
	function make_base_auth(user, password) {
		var tok = user + ':' + password;
		var hash = btoa(tok);
		return 'Basic ' + hash;
	}

	// Regular expression to get the street name from the text.
	function hasStreet(text) {
		var myReText = '([A-Z][a-z]+ )+(([Ss]treet)|([Ss]t))';
		var myRe = new RegExp(myReText);
		var myArray = myRe.exec(text);
		return myArray ? myArray[0] : myArray;
	}
	var initialUrl = BING_NEWS_QUERY;
	if (BING_NEWS_MARKETS[cityObj.countryCode]) initialUrl += '?Market=' + '\'' + BING_NEWS_MARKETS[cityObj.countryCode] + '\'';
	var skipParam = 0;
	// Map to see if a new is repeated (if a street is repeated the news won't be included) , the key (or the object name) is a street name canonical representation, the content is the street name.
	var streetCache = {};
	var beforeSendFn = function(xhr) {
		// We need basic auth to use BING azure API.
		xhr.setRequestHeader('Authorization',
			make_base_auth('', BING_API_KEY));
	};
	var successFn = function(response) {

		var street;
		var streetKey;
		for (var i = 0 , len = response.d.results.length; i < len ; i++) {
			street = hasStreet(response.d.results[i].Description);
			if (street) {
				streetKey = street.replace(' ', '').toLowerCase();
				if (!streetCache[streetKey]) {
					streetCache[streetKey] = street;
					var newobj = new NewsClass(street + ' ' + cityObj.completeName, response.d.results[i].Date, response.d.results[i].Description, response.d.results[i].Title, response.d.results[i].Url, response.d.results[i].Source, null);
					pinPosterLocation(newobj.street, newobj.latitude, newobj.longitude); //Fill news location using news object.
					getUrlExtraData(newobj.url, newobj.imgsrc); // Fill news image URL.
					newsOsvArr.push(newobj);
				}
			}
		}
	};
	var errorFn = function() {
		console.log('pinPosterNew error' + cityObj);
	};
	for (var i = 1; i <= NEWS_SEARCH_PAGES; i++) {
		$.ajax({
			type: 'GET',
			url: initialUrl,
			dataType: 'json',
			context: self,
			data: {
				$skip: skipParam,
				$top: 15,
				Query: '\'' + 'street ' + cityObj.name + '\''
			},
			beforeSend: beforeSendFn,
			success: successFn,
			error: errorFn
		});
		skipParam += 15;
	}
}


/**
 * Fills latitude and longitude observables using the search string.
 * @param {searchStr} Search string (IE 'main street vancouver').
 * @param {latOsvObj} Latitude observable to be filled.
 * @param {LongOsvObj} Longitude observable to be filled.
 */
function pinPosterLocation(searchStr, latOsvObj, LongOsvObj) {
	var self = this;
	$.ajax({
		type: 'GET',
		url: MAPS_GEOCODE_API_URL,
		dataType: 'json',
		context: self,
		data: {
			'address': searchStr,

			'key': GOOGLE_API_KEY
		},
		success: function(response) {
			if (response.results.length === 0) {
				latOsvObj(0);
				LongOsvObj(0);
				return;
			}
			LongOsvObj(response.results[0].geometry.location.lng);
			latOsvObj(response.results[0].geometry.location.lat);
			// var name = placeData.formatted_address;

		},
		error: function() {
			console.log('pinPosterNew error' + searchStr);
		}
	});


}


/**
 * Fill imgage src from  URL using embed.ly service.
 * @param {imgSUrl} Url where the image will be extracted.
 * @param {srcUrlOsvb} Observable where extracted image url will be inserted.
 */
function getUrlExtraData(imgSUrl, srcUrlOsvb) {
	var url = 'http://api.embed.ly/1/oembed?';
	var self = this;
	$.ajax({
		type: 'GET',
		url: url,
		dataType: 'jsonp',
		context: self,
		data: {
			'key': EMBEDLY_API_KEY,
			'url': imgSUrl
		},
		success: function(response) {
			srcUrlOsvb(response.thumbnail_url);
		},
		error: function() {
			console.log('getNewsData error' + imgSUrl);
		}
	});
}


/**
 * Get current location according  browser IP
 * and fills observableLocation with a reduced place result object. https://developers.google.com/maps/documentation/javascript/reference#PlaceResult
 * I use this object because compatibility with google services. (Autocomplete , geocoding..)
 * @param {observableLocation} observable object where the location will be inserted.
 */
function getCurrentLocation(observableLocation) {
	$.get('http://ipinfo.io', function(response) {
		var locat = response.loc.split(',');
		var location = {
			vicinity: response.city,
			formatted_address: response.city + ', ' + response.country,
			address_components: [{
				'short_name': response.country,
				'types': ['country']
			}],
			geometry: {
				'location': {
					'A': locat[0],
					'F': locat[1]
				}
			}
		};
		observableLocation(location);
	}, 'jsonp');
}



/**
 * View model. The model are the news , location and related data set obtained from different services.
 * The basic view model components are currentNews, an observable array where the news are stored.
 * The current location observable represents the current location and on change triggers an
 * event (ko.computed) which gets the city news corresponding to that location.
 */
function localNewsViewModel() {

	var self = this;
	self.currentNews = ko.observableArray();
	self.currentLocation = ko.observable(); //   contains current location a place result object. https://developers.google.com/maps/documentation/javascript/reference#PlaceResult
	self.visibleNewsCount = ko.observable(0); // contains the number of all visible news.
	self.query = ko.observable(); // search query used in the news text search (filter) input.
	/**
	 * When location is changed triggers this computable which gets a higher abstraction level city and
	 * obtain news for that city.
	 */
	self.currentCity = ko.computed(function() {
		if (!self.currentLocation()) return;
		var countryCode;
		var curLoc = self.currentLocation();
		var adressComp = curLoc.address_components;
		for (var i = 0 , len = adressComp.length; i <len; i++) {
			if (adressComp[i].types.indexOf('country') != -1) countryCode = adressComp[i].short_name;
		}
		var cit = new City(curLoc.vicinity, curLoc.formatted_address, countryCode, new Coordinate(curLoc.geometry.location.A, curLoc.geometry.location.F));
		self.currentNews.removeAll();
		getNews(cit, self.currentNews, self.ExtdNew);
		return cit;
	}, self);
	/** Get the number of visible news inside current news array.
	 * Because the number visible news only changes when news are created , deleted
	 * or when visible meember changes , this function will be subscribed to those elements.
	 */
	self.visibleNewsCounter = function() {
		var count = 0;
		for (var i = 0 , len = self.currentNews().length; i < len; i++) {
			if (self.currentNews()[i].visible()) count++;
		}
		self.visibleNewsCount(count);
	};
	self.currentNews.subscribe(self.visibleNewsCounter); // calculate visible news when those are created or deleted.
	/**
	 * Because we may need some features which I only may use in this viewmodel (IE subscriptions to some events like visibleNewsCounter
	 * when visible member changes.) , I extend basic News class.
	 */
	self.ExtdNew = function(street, date, description, title, url, source, imgsrc) {
		News.call(this, street, date, description, title, url, source, imgsrc);
		this.visible = ko.observable(true);
		this.isSelected = ko.observable(false);
		this.clicked = ko.observable(false);
		this.visible.subscribe(this.visibleNewsCounter); // visibleNewsCounter will be triggered when visible member changes.
	};
	self.ExtdNew.prototype.visibleNewsCounter = self.visibleNewsCounter;
	// Starts news collection process by getting current location by IP.
	getCurrentLocation(self.currentLocation);



	self.hideNew = function(newsObj) {
		newsObj.visible(false);
	};


	self.deleteNew = function(newsObj) {
		self.currentNews.remove(newsObj);
	};

	self.showAll = function() {
		for (var i = 0 , len = self.currentNews().length; i < len; i++) {
			self.currentNews()[i].visible(true);
		}

	};

	self.hideAll = function() {
		for (var i = 0 , len = self.currentNews().length; i < len; i++) {
			self.currentNews()[i].visible(false);
		}

	};

	self.setSelected = function(newsObj) {
		newsObj.isSelected(true);
	};

	self.noSelected = function(newsObj) {
		newsObj.isSelected(false);
	};

	// Emulates a click event.
	self.clickedfn = function(newsObj) {
		newsObj.clicked(!newsObj.clicked());

	};

	/**
	 * Filter news hiding those which description and title fields
	 * concatenation do not contain value string.
	 * @param {value} String to filter.
	 */
	self.filter = function(value) {
		self.hideAll();
		var news = self.currentNews();
		var newText = '';
		for (var ne in news) {
			newText = (news[ne].title + ' ' + news[ne].description).toLowerCase();
			if (newText.indexOf(value.toLowerCase()) >= 0) {
				news[ne].visible(true);
			}
		}
	};

	// when query string change filter is applied.
	self.query.subscribe(self.filter);

	/**
	 * Sort news by date changing order each time function is applied.
	 */
	self.sortByDate = function() {
		if (!this._ascOrder) this._ascOrder = true;
		else this._ascOrder = !this._ascOrder;
		self.currentNews.sort(function(left, right) {
			return left.date == right.date ? 0 : (left.date < right.date ? -1 : 1);
		});
		if (!this._ascOrder) self.currentNews.reverse();
	};
}


/**
 * Custom foreach binding to paint a map.
 * Parameters in this case refer to the custom binding bind parameters (accessed  by allBindingsAccessor).
 * @param {mapForeach} Observable array to iterate through map elements (IE markers.).
 * @param {map} variable where the map will be stored.
 * @param {place} Observable element with a coordinate object.
 * @param {map_div_id} map div id.
 */
ko.bindingHandlers.mapForeach = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		var self = this;
		googleMap = new google.maps.Map(document.querySelector('#' + allBindingsAccessor().map_div_id), {
			zoom: 11
		});
		var place = allBindingsAccessor().place;
		place.subscribe(function() { // If place changes moves map center.
			allBindingsAccessor().map.setCenter(new google.maps.LatLng(place().coordinate.longitude, place().coordinate.latitude));
		}, self);
		return ko.bindingHandlers.foreach.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
	},
	update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		return ko.bindingHandlers.foreach.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
	}
};



/**
 * Custom binding to paint 'news' map markers in a map.
 * Parameters in this case refer to the custom binding bind parameters (accessed  by allBindingsAccessor).
 * @param {map} map where the markes will be painted.
 * @param {news} News object where some information will be extracted.
 * @param {clickEvntOsv} Observable which will be subcribed acting like a click event.
 * @param {selecEvnObsv}  Observable which will be subcribed acting like a selected (actually more like an onmouse over event) event.
 * @param {visibleEvntOsv} Observable which will be subcribed acting like a visible event. (Hides or shows marker.).
 */
ko.bindingHandlers.mapMarker = {
	init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
		try {
			var self = this;
			var news = allBindingsAccessor().news;
			var selecEvnt = allBindingsAccessor().selecEvnObsv;
			var visibleEvnt = allBindingsAccessor().visibleEvntOsv;
			var clickEvnt = allBindingsAccessor().clickEvntOsv;
			var position = new google.maps.LatLng(news.latitude(), news.longitude());
			var marker = new google.maps.Marker({
				map: allBindingsAccessor().map,
				position: position,
				title: news.title
			});
			news._mapMarker = marker;
			self.currentInfoWindow = null;
			// I need that in case of element removal. (IE a news element is deleted from the news array).
			ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
				var modelObj = ko.dataFor(element);
				console.log('deletd' + modelObj);
				modelObj._mapMarker.setMap(null);
			});
			// When the news component change (IE asynchronous API callback for some information. ) marker info windows is regenerated.
			news._infoWindow = ko.computed(function() {
				var contentString = '<div id="content">' +
					'<div id="siteNotice">' +
					'</div>' +
					'<h4 id="firstHeading" class="firstHeading">' + news.street + '</h4>' +
					'<img src="' + getThumbnail(news.imgsrc()) + '" width="64px">' +
					'<div id="bodyContent">' +
					'<p><b>' + news.title + '</b>, ' + news.description + ' </p>' + '<a href="' + news.url + '">' + news.source + '</a> ' + '<span style="font-size: 8pt"> ' + news.date.toLocaleDateString(); + ' </span></div></div>';
				return new google.maps.InfoWindow({
					'content': contentString,
					maxWidth: 250
				});
			}, self);
			function showHideIfoWindow(){
				if (!self.currentInfoWindow) self.currentInfoWindow = news._infoWindow(); //Initialize current info wondow if null.
				if(self.currentInfoWindow != news._infoWindow()) {
					self.currentInfoWindow.close();
					self.currentInfoWindow = news._infoWindow();
				}
				if (self.currentInfoWindow.getMap()) self.currentInfoWindow.close();
				else {
					self.currentInfoWindow.open(allBindingsAccessor().map, news._mapMarker);}
			}
			// Open / close info window on click. news._infoWindow()
			clickEvnt.subscribe(showHideIfoWindow, self);
			// Hide / show info window when visible.
			visibleEvnt.subscribe(function() {
				news._mapMarker.setMap(news.visible() ? allBindingsAccessor().map : null);
			}, self);
			// Animate marker on mouse over (selected event).
			selecEvnt.subscribe(function() {
				var animation = (news.isSelected() ? google.maps.Animation.BOUNCE : null);
				news._mapMarker.setAnimation(animation);
			}, self);
			// On mouse over over the marker changes news selected event (In this case is used to change news style in the list view).
			google.maps.event.addListener(marker, 'mouseover', function() {
				selecEvnt(true);
				news._mapMarker.setAnimation(null);
			});
			google.maps.event.addListener(marker, 'mouseout', function() {
				selecEvnt(false);
			});
			//  Hide / show info window when a marker is clicked.
			google.maps.event.addListener(marker, 'click', showHideIfoWindow);

		} catch (err) {
			console.log(err);
		}
	},
	update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
		try {
			/**
			 * Latitude and longitude in a new can change over the time so this
			 * have to be updated in the map.
			 */
			var news = allBindingsAccessor().news;
			var latlng = new google.maps.LatLng(news.latitude(), news.longitude());
			news._mapMarker.setPosition(latlng);
		} catch (err) {
			console.log(err);
		}
	}
};


/**
 * Custom binding to get autocompleted locations.
 * Parameters in this case refer to the custom binding bind parameters (accessed  by allBindingsAccessor).
 * @param {types} Array with the type of places (see google autocomplete documentation).
 * @param {output} variable where the returned place object will be stored.
 */
ko.bindingHandlers.addressAutocomplete = {
	init: function(element, valueAccessor, allBindingsAccessor) {
		var allBindings = allBindingsAccessor();
		var options = {};
		ko.utils.extend(options, allBindings.autocompleteOptions);
		var autocomplete = new google.maps.places.Autocomplete(element, options);
		google.maps.event.addListener(autocomplete, 'place_changed', function() {
			allBindings.output(autocomplete.getPlace());
		});
	},
	update: function(element, valueAccessor, allBindingsAccessor) {
		ko.bindingHandlers.value.update(element, valueAccessor);
	}
};