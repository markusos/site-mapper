# Site Mapper

A minimal web crawler that maps out all dicoverable pages on a given site and prints out dot-file format that can be used to generate a site map graph.

### How to use:

Clone this Git repository:

```
$ git clone git@github.com:markusos/site-mapper.git
```

Install dependencies:

```
$ npm install
```

Run the scrip to crawl your website:

```
$ node sitemap.js https://ostberg.dev/ > map.dot
```

If you want to generate a site map graph from the dot-file output you need to have Graphviz installed

```
$ brew install graphviz
```

Run Graphviz on the dot-file with:

```
$ sfdp -Tsvg map.dot -o sitemap.svg
```

Result:

![alt tag](https://raw.github.com/markusos/site-mapper/master/sitemap.png)

### License

The MIT License (MIT)

Copyright (c) 2016 Markus Östberg
