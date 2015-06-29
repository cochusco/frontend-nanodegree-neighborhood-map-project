Neighborhood  Map project .
========================
## General description
[Project in github pages](http://cochusco.github.io/frontend-nanodegree-neighborhood-map-project/dist/)
The purpose of this application is to collect local news about a city , get the location the news inside the city  and show it in a map and a list view.
You can select  the city , search by news content , sort by date , hide and delete news.
The news content is collected through  a general purpose search API (Bing API , google news search is deprecated) so it is difficult to get specific city local news and location for that and the information can be imprecise.
The approach to get the news information and location is to query  as much precise as the API permits  , in this case (Bing news search API) the search query  is constructed with the country and city name , if there is marked (Bing specification to choose the country where the news are generated ) it  will be added to the query.   Once we get the news we apply a single regular expression  to detect  street  names , if there is street name the news  are included  , only one new is permitted for each street.  (IE ,if we search local news in London we do not  want many news talking about downing  street as this is the most common street name in London news and usually talks about politics).
Because the difficulty to get specify queries to each language **news searches are performed in English and the best results are obtained in English speaking places.** (IE , for Berlin we need a German query for the API and a specific regular expression in this language to get the street location for the news.).

##  Used APIs, libraries and frameworks.
- Bootstrap.
- Knockout.
- jquery.
- Google map API. (maps, geocode(get place coordinates), places (to autocomplete cities).
- Bing search API.(to get the news)
- embedly API. (to get additional news information, like the image from the news link , also a service to get the resized thumbnails instead the original image.)

##  Project structure.
- **Root.**
Readme gulp an npm configuration files.
    - **app folder.**
Application sources (unminified , with comments, original images...).
    - **dist folder.**
Gulp optimized files (minified , removed comments ...).

## Instructions.
In the console, run `npm install` in the root folder to install the required gulp plugins.
Run `gulp` to generate the optimized contents in the dist folder.
- - -

# Udacity Project guidelines.

## Project Overview
You will develop a single page application featuring a map of your neighborhood or a neighborhood you would like to visit. You will then add additional functionality to this map including highlighted locations, third-party data about those locations and various ways to browse the content.

## How will I complete this Project?
1.	Review our course JavaScript Design Patterns.
2.	Download the Knockout framework.
3.	Write code required to add a full-screen map to your page using the Google Maps API.
4.	Write code required to add map markers identifying a number of locations you are interested in within this neighborhood.
5.	Implement the search bar functionality to search and filter your map markers. There should be a filtering function on markers that already show up. Simply providing a search function through a third-party API is not enough.
6.	Implement a list view of the identified locations.
7.	Add additional functionality using third-party APIs when a map marker, search result, or list view entry is clicked (ex. Yelp reviews, Wikipedia, Flickr images, etc). If you need a refresher on making AJAX requests to third-party servers, check out our Intro to AJAX course.







