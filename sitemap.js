/**
 * Site Map Crawler
 *
 * Markus Östberg
 * 2025-01-19
 */

const puppeteer = require('puppeteer');

let site = '';
let pages = {};
let visited = {};
let pageCounter = 0;
let debug = true

// Set max dept of recursive pages to scrape
let maxDepth = 4

async function scrapePage(page, browser, depth) {
    if (depth >= maxDepth) {
        console.error("Reached maxDept on page: " + page);
        return null;
    }

    if (debug) {
        try {
            const url = new URL(page);
            console.error("Scraping page:");
            console.error(url.protocol); // "https:"
            console.error(url.hostname); // "www.example.com"
            console.error(url.pathname); // "/path/to/page"
            console.error(url.search); // "?query=string"
            console.error(url.hash); // "#hash"
        } catch (error) {
            console.error("Failed to parse page url: " + page);
        }
    }

    const pageInstance = await browser.newPage();

    try {
        await pageInstance.goto(page);
    } catch (error) {
        console.error("Failed to load page:" + page);
        await pageInstance.close();
        return null;
    }
        
    pageCounter++;

    // Get link list
    let links = await pageInstance.evaluate(getLinks);

    links = links.map(normalizeRelativeLink);
    links = links.filter(filterNonUniqueLink);
    links = links.filter(filterExternal);
    
    let title = await pageInstance.title();

    pages[page] = { url: page, title: title, links: links };

    links.filter(filterScrapedPages).forEach(function(link) {
        pages[link] = { url: link, title: '', links: [] };
    });

    links = links.filter(filterVisitedLinks);

    // Push unexplored pages to queue
    for (const link of links) {
        // Save page as queued
        visited[link] = true;

        // Scrape the page
        await scrapePage(link, browser, depth + 1, maxDepth);
    }

    await pageInstance.close();
}

// Get all links not marked with nofollow
function getLinks() {
    const links = document.querySelectorAll('a:not([rel="nofollow"])');
    return Array.prototype.map.call(links, function(e) {
        return e.getAttribute('href');
    });
}

// Filter out non unique links
function filterNonUniqueLink(link, index, self) {
    return self.indexOf(link) === index;
}

function filterVisitedLinks(link) {
    return typeof visited[link] === "undefined";
}

function filterScrapedPages(link) {
    return typeof pages[link] === "undefined";
}

function filterExternal(link) {
    return link.startsWith(site);
}

function normalizeRelativeLink(link) {
    if (link.startsWith('/')) {
        link = site + link.substring(1);
    }
    return link;
}

// Polyfill functions
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        const subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        const lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

// Main Crawler script
(async () => {
    const browser = await puppeteer.launch();

    if (process.argv.length > 2) {
        site = process.argv[2];
    } else {
        console.log("You need to provide a site url to crawl. E.g: https://ostberg.dev/");
        await browser.close();
        process.exit();
    }

    console.log("digraph sitemap {");
    console.log("   overlap=false;");
    console.log("   bgcolor=transparent;");
    console.log("   splines=true;");
    console.log("   rankdir=TB;");
    console.log("   node [shape=Mrecord, fontname=\"Arial\", fontsize=18, style=filled, fillcolor=deepskyblue];");

    // Save home page as queued
    visited[site] = true;
    // Set starting dept for scraping site
    depth = 0

    // Start scraping the site
    await scrapePage(site, browser, depth);

    // Create dot file nodes and edges
    Object.keys(pages).forEach(function(key) {
        const nodeName = key.replace(/\W/g, '');
        if (nodeName) {
            console.log("   " + nodeName + ' [label = "' + pages[key].title.replace(/"/g, '\\"') + '\\n' + pages[key].url.replace(site, '/') + '"];');
        }
    });

    Object.keys(pages).forEach(function(key) {
        pages[key].links.forEach(function(link) {
            const fromNodeName = key.replace(/\W/g, '');
            const toNodeName = link.replace(/\W/g, '');

            if (fromNodeName && toNodeName) {
                console.log("   " + fromNodeName + ' -> ' + toNodeName);
            }
        });
    });

    console.log("}");
    await browser.close();
    process.exit();
})();
