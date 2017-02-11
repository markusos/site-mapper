/**
 * Site Map Crawler
 *
 * Markus Östberg
 * 2016-01-07
 */

var pages = {};
var visited = {};
var pageCounter = 0;

var site = '';

var casper = require('casper').create();

function scrapePage(page) {

    casper.thenOpen(page, function(response) {
        
        pageCounter++;

        var links = [];

        // Get link list
        links = this.evaluate(getLinks);

        links = links.map(normalizeRelativeLink);
        links = links.filter(filterNonUniqueLink);
        links = links.filter(filterExternal);

        var title = this.getTitle();

        pages[page] = {url: page, title: title, links: links};

        links.filter(filterScrapedPages).forEach(function(link) {
            pages[link] = {url: link, title: '', links: []};
        });

        links = links.filter(filterVisitedLinks);

        // Push unexplored pages to queue
        links.forEach(function(link) {
            // Save page as queued
            visited[link] = true;

            // Scrape the page
            scrapePage(link);
        });
    });
}

// Get all links not marked with nofollow
function getLinks() {
    var links = document.querySelectorAll('a:not([rel="nofollow"])');
    return Array.prototype.map.call(links, function(e) {
        return e.getAttribute('href');
    });
}

// Filter out non unique links
function filterNonUniqueLink(link, index, self) { 
    return self.indexOf(link) === index;
}

function filterVisitedLinks(link, index, self) {
    return typeof visited[link] === "undefined"
}

function filterScrapedPages(link, index, self) {
    return typeof pages[link] === "undefined"
}

function filterExternal(link, index, self) {    
    return link.startsWith(site);
}

function normalizeRelativeLink(link) {
    if (link.startsWith('/')) {
        link = site + link.substring(1);
    }

    return link;
}

//Polyfill functions
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

// Main Crawler script

if(casper.cli.has(0)) {
    site = casper.cli.get(0)
} else {
    casper.echo("You need to provide a site url to crawl. E.g: http://markusos.github.io/");
    casper.exit();
}


casper.start(site);

casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');

casper.then(function() {

    // Set up dot file render settings
    casper.echo("digraph sitemap {");
    casper.echo("   overlap=false;");
    casper.echo("   bgcolor=transparent;");
    casper.echo("   splines=true;");
    casper.echo("   rankdir=TB;");
    casper.echo("   node [shape=Mrecord, fontname=\"Arial\", fontsize=18, style=filled, fillcolor=deepskyblue];");

    // Save home page as queued
    visited[site] = true;
    // Start scraping the site
    scrapePage(site);

});

casper.run(function() {

    // Create dot file nodes and edges
    Object.keys(pages).forEach(function(key) {
        var nodeName = key.replace(/\W/g, '')
        if (nodeName) {
            casper.echo("   " + nodeName + ' [label = "' + pages[key].title.replace(/"/g, '\\"') + '\\n' + pages[key].url.replace(site, '/') + '"];')
        }
    });

    Object.keys(pages).forEach(function(key) {
        
        pages[key].links.forEach(function(link) {
            var fromNodeName = key.replace(/\W/g, '')
            var toNodeName = link.replace(/\W/g, '')

            if(fromNodeName && toNodeName) {
                casper.echo("   " + fromNodeName + ' -> ' + toNodeName);
            }
        });
    });

    casper.echo("}")
    this.exit();

});