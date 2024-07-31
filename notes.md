//react app rendering into html

//index html erstellen im client als template --> getting started webpack, with basic config and index html, add basics of react
//webpack should do default bundling with build: webpack, for example webpack-start, add start: webpack start sth below
//add devserver, which should refer some requests to server
//server connected with client -> index.ts -> weiterleiten in src code, add route to be fetched from react, localhost port different than devserver
//=> direct bundling rebuild on devserver, normal server gets only special requests for backend => 2 https server running at same time
//dist directory will not get commited-> build folder that is done when built => hence only in client, put into gitignore
//common directory for packages that both server and client uses, data; conditionally load packages that are only client but used in client only
//add eslint with config file on root level
//database where user can store its plans -> server, one needs to identify user in that case, download json file and read from disk
//import his code as package
//make 4 packages: julian, canvas for webgl (sumosky), react client, server as fileserver? => how does his render loop work?

//server: 
//directly executed with node, server framework, get endpoints, webserver with files
//precomputed stuff, 1 time calculations