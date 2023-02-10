import fs from 'fs';
import http from 'http';
import url from 'url';
import fileDirName from './utils/file-dir-name.mjs';
import fillTemplate from './modules/fillTemplate.js';
const { __dirname } = fileDirName(import.meta);

const overviewTemplate = fs.readFileSync(
  `${__dirname}/templates/template-overview.html`,
  'utf-8'
);

const overviewTemplateCard = fs.readFileSync(
  `${__dirname}/templates/template-overview-card.html`,
  'utf-8'
);

const productTemplate = fs.readFileSync(
  `${__dirname}/templates/template-product.html`,
  'utf-8'
);

const data = fs.readFileSync(`${__dirname}/dev-data/data.json`, 'utf-8');
const dataObj = JSON.parse(data);

const server = http.createServer((req, res) => {
  const { query, pathname } = url.parse(req.url, true);
  console.log(query.id);

  if (pathname === '/' || pathname === '/overview') {
    res.writeHead(200, {
      'Content-type': 'text/html',
    });

    const cardsHtml = dataObj
      .map((product) => fillTemplate(overviewTemplateCard, product))
      .join('');

    const output = overviewTemplate.replace(
      /{%PRODUCT_OVERVIEW_CARDS%}/g,
      cardsHtml
    );

    res.end(output);
  } else if (pathname === '/product') {
    res.writeHead(200, {
      'Content-type': 'text/html',
    });

    const product = dataObj[query.id];
    const output = fillTemplate(productTemplate, product);

    res.end(output);
  } else if (pathname === '/api') {
    res.writeHead(200, {
      'Content-type': 'application/json',
    });

    res.end(data);
  } else {
    res.writeHead(404, {
      'Content-type': 'text/html',
      'my-own-header': 'hello-world',
    });
    res.end(`<h1>Page not found!</h1>\n<p>pathname ${pathname} not found</p>`);
  }
});

server.listen(8000, '127.0.0.1', () => {
  console.log('Server started and listening on port 8000');
});
