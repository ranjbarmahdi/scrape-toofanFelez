const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { suitableJsonOutput, writeExcel } = require('./utils')

const delay = (ms) => new Promise((res) => setTimeout(res, ms));


// ============================================ login
// async function login(page, url ,userOrPhone, pass) {
//      try {
//           await page.goto(url, { timeout: 360000 });

//           let u = "09376993135";
//           let p = "hd6730mrm";
//           // sleep 5 second 
//           console.log("-------sleep 5 second");
//           await delay(5000);

//           // load cheerio
//           const html = await page.content();
//           const $ = cheerio.load(html);

//           const usernameInputElem = await page.$$('input#username');
//           await page.evaluate((e) => e.value = "09376993135" ,usernameInputElem[0]);
//           await delay(3000);

//           const continueElem = await page.$$('.register_page__inner > button[type=submit]');
//           await continueElem[0].click();
//           await delay(3000);

//           const passwordInputElem = await page.$$('input#myPassword');
//           await passwordInputElem[0].type("hd6730mrm");
//           // await page.evaluate((e) => e.value = "hd6730mrm" ,passwordInputElem[0]);
//           await delay(3000);

//           const enterElem = await page.$$('.register_page__inner > button[type=submit]');
//           await enterElem[0].click();
//           await delay(3000);
          
//      } catch (error) {
//           console.log("Error In login function", error);
//      }
// }

// ============================================ findAllMainLinks
async function findAllMainLinks(page, initialUrl) {
     const allMainLinks = [];
     try {
          const url = initialUrl;
          await page.goto(url, { timeout: 360000 });


          // sleep 5 second 
          console.log("-------sleep 5 second");
          await delay(5000);

          // load cheerio
          const html = await page.content();
          const $ = cheerio.load(html);

          // Getting All Main Urls In This Page
          const mainLinks = $('.wd-sub-menu.color-scheme-dark > li > a').map((i, e) =>  $(e).attr('href')).get()


          // Push This Page Products Urls To allProductsLinks
          allMainLinks.push(...mainLinks);

     } catch (error) {
          console.log("Error In findAllMainLinks function", error.message);
     }

     return Array.from(new Set(allMainLinks));
}


// ============================================ findAllPagesLinks
// async function findAllPagesLinks(page, mainLinks) {

//      const allPagesLinks = []

//      // find pagination and pages     
//      for (let i = 0; i < mainLinks.length; i++){
//           try {
//                const url = mainLinks[i];
//                await page.goto(url);
     
//                await delay(5000);
//                const html = await page.content();
//                const $ = cheerio.load(html);
               
//                // find last page number and preduce other pages urls
//                const paginationElement = $('.pagination');
//                if (paginationElement.length) {
//                     let lsatPageNumber = $(paginationElement).find('>li:last-child').text().trim();
//                     lsatPageNumber = Number(lsatPageNumber);
//                     for (let j = 1; j <= lsatPageNumber; j++){
//                          const newUrl = url + `&page=${j}`
//                          allPagesLinks.push(newUrl)
//                     }
//                }
//                else {
//                     allPagesLinks.push(url)
//                }
               
//           } catch (error) {
//                console.log("Error in findAllPagesLinks", error);
//           }
//      }      

//     return Array.from(new Set(allPagesLinks))
// }


// ============================================ findAllProductsLinks
async function findAllProductsLinks(page, allPagesLinks) {
     const allProductsLinks = [];

     for (let i = 0; i < allPagesLinks.length; i++){
          try {
               const url = allPagesLinks[i];
               await page.goto(url, { timeout: 180000 });

               // sleep 5 second when switching between pages
               console.log("-------sleep 5 second");
               await delay(5000);


               let nextPageBtn;
               do{
                    const html = await page.content();
                    const $ = cheerio.load(html);

                    // Getting All Products Urls In This Page
                    const productsUrls = $('div.products > div.product > div > h3 > a').map((i, e) => $(e).attr('href')).get()
                    
                    // Push This Page Products Urls To allProductsLinks
                    allProductsLinks.push(...productsUrls);

                    // click to go to next page
                    nextPageBtn = await page.$$('.page-numbers > li:last-child > a.next.page-numbers');
                    console.log(nextPageBtn.length);
                    if(nextPageBtn.length){
                         let btn = nextPageBtn[0];
                         await btn.click();
                    }
                    await delay(3000);
               }
               while(nextPageBtn.length)
          } catch (error) {
               console.log("Error In findAllProductsLinks function", error);
          }
     }

     return Array.from(new Set(allProductsLinks));
}


// ============================================ scrapSingleProduct
async function scrapSingleProduct(page, productURL, imagesDIR, documentsDir, rowNumber) {
     try {
          await page.goto(productURL);
     } catch (error) {
          console.log("Error In scrapSingleProduct in page.goto", error);
     }

     await delay(5000);
     const html = await page.content();
     const $ = await cheerio.load(html);

     const data = {};
     data["title"] = $('h1.product_title').length ? $('h1.product_title').text().trim() : "";
     data["category"] = $('.product_meta > .posted_in > a').length
          ? $('.product_meta > .posted_in > a')
               .map((i, a) => $(a).text().trim()).get().join(" > ")
          : "";
     
     data["brand"] = "طوفان فلز";
     data['unitOfMeasurement'] = "عدد"

     data['currency'] = ""
     data["price"] = "";
     data["xpath"] = "";
     data["offPrice"] = "";
     const offPercent = $("");
     if (offPercent.length) {
          data["price"] = $("").text().replace(/[^\u06F0-\u06F90-9]/g, "");
          data["offPrice"] = $("").text().replace(/[^\u06F0-\u06F90-9]/g, "");

          if (data["offPrice"]) {
               data["xpath"] = "";
          }
     }
     else {
          data["price"] = $('').text().replace(/[^\u06F0-\u06F90-9]/g, "");

          if (data["price"]) {
               data["xpath"] = '';
          }
     }


     // specification, specificationString
     let specification = {};
     const rowElements = await page.$$('.shop_attributes > tbody > tr');
     for (let i = 0; i < rowElements.length; i++) {
          const row = rowElements[i];

          const keyElem = await row.$$('th:first-child');
          const key = await page.evaluate(e => e.innerText?.trim().replace(':',''), keyElem[0]) || '';
          
          const valueElem = await row.$$('td:last-child');
          const value = await page.evaluate(e => e.innerText?.trim(), valueElem[0]) || '';

          specification[key] = value;
     }
     const specificationString = Object.keys(specification).map((key) => `${key} : ${specification[key]}`).join("\n");


     // descriptionString
     const descriptionString = $('.woocommerce-product-details__short-description > ul > li').length
          ? $('.woocommerce-product-details__short-description > ul > li').map((i, e) => $(e).text()).get().join('\n'): "";

     
     // Generate uuidv4
     const uuid = uuidv4().replace(/-/g, "");


     // Download Images
     let imagesUrls = $('.product-image-thumbnail > img').map((i, img) => $(img).attr("src").replace(/(-[0-9]+x[0-9]+)/g, "")).get();
     imagesUrls = Array.from(new Set(imagesUrls))
     for (let i = 0; i < imagesUrls.length; i++) {
          try {
               const imageUrl = imagesUrls[i];
               const response = await fetch(imageUrl);

               if (response.ok) {
                    const buffer = await response.buffer();
                    const imageType = path.extname(imageUrl);
                    const localFileName = `${uuid}-${i + 1}${imageType}`;
                    const imageDir = path.normalize(
                         imagesDIR + "/" + localFileName
                    );
                    fs.writeFileSync(imageDir, buffer);
               }
          } catch (error) {
               console.log("Error In Download Images", error);
          }
     }


     // download pdfs
     let pdfUrls = $('NotFound').map((i, e) => $(e).attr('href')).get().filter(href => href.includes('pdf'))
     pdfUrls = Array.from(new Set(pdfUrls))
     for (let i = 0; i < pdfUrls.length; i++) {
          try {
               const pdfUrl = imagesUrls[i];
               const response = await fetch(pdfUrl);
               if (response.ok) {
                    const buffer = await response.buffer();
                    const localFileName = `${uuid}-${i + 1}.pdf`;
                    const documentDir = path.normalize(documentsDir + "/" + localFileName);
                    fs.writeFileSync(documentDir, buffer);
               }
          } catch (error) {
               console.log("Error In Download Documents", error);
          }
     }


     // Returning Tehe Required Data For Excel
     const productExcelDataObject = {
          URL: productURL,
          xpath: data["xpath"],
          specifications: specificationString,
          description: descriptionString,
          currency: data['currency'],
          offPrice: data["offPrice"],
          price: data["price"],
          unitOfMeasurement: data['unitOfMeasurement'],
          category: data["category"],
          brand: data["brand"],
          SKU: uuid,
          name: data["title"],
          row: rowNumber
     };

     return productExcelDataObject;
}


// ============================================ Main
async function main() {
     try {
          const INITIAL_PAGE_URL = `https://www.toofanfelez.com`;
          const DATA_DIR = path.normalize(__dirname + "/toofanFelez");
          const IMAGES_DIR = path.normalize(DATA_DIR + "/images");
          const DOCUMENTS_DIR = path.normalize(DATA_DIR + "/documents");
          const PRODUCTS_DB_DIR = path.normalize(DATA_DIR + "/products.json");
          const PRODUCTS_EXCEL_DIR = path.normalize(DATA_DIR + "/products.xls");
          const UNVISITED_LINKS_DIR = path.normalize(DATA_DIR + "/unvisited.json");
          const VISITED_LINKS_DIR = path.normalize(DATA_DIR + "/visited.json");
          const PROBLEM_LINKS_DIR = path.normalize(DATA_DIR + "/problem.json");

          // Create SteelAlborz Directory If Not Exists
          if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR); }
          if (!fs.existsSync(DOCUMENTS_DIR)) { fs.mkdirSync(DOCUMENTS_DIR); }
          if (!fs.existsSync(IMAGES_DIR)) { fs.mkdirSync(IMAGES_DIR); }

          // Create Visited, Unvisited, Products Json Database If Not Exist
          if (!fs.existsSync(UNVISITED_LINKS_DIR)) { fs.writeFileSync(UNVISITED_LINKS_DIR, JSON.stringify([])); }
          if (!fs.existsSync(VISITED_LINKS_DIR)) { fs.writeFileSync(VISITED_LINKS_DIR, JSON.stringify([])); }
          if (!fs.existsSync(PRODUCTS_DB_DIR)) { fs.writeFileSync(PRODUCTS_DB_DIR, JSON.stringify([])); }
          if (!fs.existsSync(PROBLEM_LINKS_DIR)) { fs.writeFileSync(PROBLEM_LINKS_DIR, JSON.stringify([])); }

          // Load Databases
          let unVisitedLinks = require(UNVISITED_LINKS_DIR);
          const visitedLinks = require(VISITED_LINKS_DIR);
          const productsDB = require(PRODUCTS_DB_DIR);
          const problemLinks = require(PROBLEM_LINKS_DIR);

          // Lunch Browser
          const browser = await puppeteer.launch({
               headless: false, // Set to true for headless mode, false for non-headless
               executablePath:
                    process.env.NODE_ENV === "production"
                         ? process.env.PUPPETEER_EXECUTABLE_PATH
                         : puppeteer.executablePath(),
               args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });

          const page = await browser.newPage();
          await page.setViewport({
               width: 1920,
               height: 1080,
          });


          // Start Scraping
          // Find All Producst's URLs
          // if (unVisitedLinks.length == 0) {
          //      const mainLinks = await findAllMainLinks(page, INITIAL_PAGE_URL)
          //      await delay(() => "", 3000);

          //      const allProductsLinks = await findAllProductsLinks(page, mainLinks);
          //      fs.writeFileSync(UNVISITED_LINKS_DIR, JSON.stringify(allProductsLinks, null, 4));
          //      await delay(() => "", 3000);

          //      // Making Empty visitedLinks And Empty Products, because all products scraped and scraping start again
          //      if (!fs.existsSync(VISITED_LINKS_DIR)) { fs.writeFileSync(VISITED_LINKS_DIR, JSON.stringify([])); }
          //      if (!fs.existsSync(PRODUCTS_DB_DIR)) { fs.writeFileSync(PRODUCTS_DB_DIR, JSON.stringify([])); }
          // }


          // Scrape All Products
          // unVisitedLinks = require(UNVISITED_LINKS_DIR);

          let i = 0;
          // while (unVisitedLinks.length > 0) {          
          //      try {
          //           const productURL = unVisitedLinks[0];
          //           let rowNumber = productsDB.length;
          //           const productInfo = await scrapSingleProduct(page, productURL, IMAGES_DIR, DOCUMENTS_DIR, rowNumber+1);

          //           if (Object.keys(productInfo).length) {
          //                productsDB.push(productInfo);
          //                fs.writeFileSync(PRODUCTS_DB_DIR, JSON.stringify(productsDB, null, 4));

          //                // remove visited url and add it to visited urls
          //                visitedLinks.push(productURL);
          //                fs.writeFileSync(VISITED_LINKS_DIR, JSON.stringify(visitedLinks, null, 4));

          //                unVisitedLinks.splice(0, 1);
          //                fs.writeFileSync(UNVISITED_LINKS_DIR, JSON.stringify(unVisitedLinks, null, 4));

          //                i++;
          //                console.log(`${i} ==================================== product : ${rowNumber+1} `);
          //                console.log(productURL);
          //           } else {
          //                console.log(`Error in product : ${productURL} `);

          //                // remove visited url and add it to visited urls
          //                problemLinks.push(productURL);
          //                fs.writeFileSync(PROBLEM_LINKS_DIR, JSON.stringify(problemLinks, null, 4));

          //                unVisitedLinks.splice(0, 1);
          //                fs.writeFileSync(UNVISITED_LINKS_DIR, JSON.stringify(unVisitedLinks, null, 4));
          //           }
          //      } catch (error) {
          //           console.log("Error In While Loop In main Function", error);
          //      }
          // }

          // WriteExcel
          let products = require(PRODUCTS_DB_DIR);
          let suitableProducts = suitableJsonOutput(products);
          writeExcel(suitableProducts, PRODUCTS_EXCEL_DIR)

          // Close page and browser
          console.log("End");
          await page.close();
          await browser.close();
     } catch (error) {
          console.log("Error In main Function", error);
     }
}

main();
