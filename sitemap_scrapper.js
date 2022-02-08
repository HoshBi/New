const fs = require("fs");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const xml2js = require("xml2js");

class BL_URL {
    constructor(url, langs) {
        this.url = url;
        if (langs) {
            this.langs = langs;
        }
    }
}

async function get_urls() {
    console.log("get_urls {");
    return new Promise((resolve, rej) => {
        axios.get("https://www.metabaseq.com/sitemap.xml").then((res) => {
            xml2js.parseString(res.data, (err, result) => {
                if (err) {
                    rej(err);
                }
                let urls = [];
                result.urlset.url.forEach((obj) => urls.push(obj.loc[0]));
                console.log("} get_urls");
                urls = urls.filter((e) => !e.includes("cerc"));
                resolve(urls);
            });
        });
    });
}


async function get_sitemap(urls) {
    console.log("sitemap {");
    return new Promise(async(pres, rej) => {
        let promises = [];

        urls.forEach((url) =>
            promises.push(
                new Promise(async(resolve, rejj) => {
                    JSDOM.fromURL(url).then((dom) => {
                        var doc = dom.window.document;
                        versions = doc.querySelectorAll("link[rel=alternate]");

                        var langs = {};
                        versions.forEach((e) => {
                            langs[e.getAttribute("hreflang")] = e.getAttribute("href");
                        });
                        resolve(new BL_URL(url, langs));
                    });
                })
            )
        );
        Promise.all(promises).then((url_objs) => {
            console.log("} sitemap");
            pres(url_objs);
        });
    });
}

async function build_xml(sitemap) {
    console.log("xml {");
    /* console.log(sitemap); */

    const TIMESTAMP = new Date().toISOString();
    let xml_string =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    sitemap.forEach((url) => {
        let xhtml = "";
        let priority = 0.64;
        let path = url.url.substring(25)

        if (path == "/en" || path == "/") {
            priority = 1;
        } else if (path == "/es/nosotros" || path == "/en/about-us" ||
            path == "/es/educacion" || path == "/en/education" ||
            path == "/es/servicios" || path == "/en/services" ||
            path == "/es/soluciones" || path == "/en/solutions" ||
            path == "/es/biblioteca" || path == "/en/resources" ||
            path == "/es/soluciones/investigacion" || path == "/en/solutions/research") {
            priority = 0.9;
        } else if (path.includes("/recursos/")) {
            if (path.includes("janeleiro-mx") ||
                path.includes("pin-automatic") ||
                path.includes("car-hacking")) {
                priority = 0.75;
            } else {
                priority = 0.64;
            }
        } else if (path == "/aviso-de-privacidad") {
            priority = 0.64;
        } else {
            let count = [...path].filter(x => x === '/').length;

            if (count < 4) {
                priority = 0.9 - (0.05 * count)
            }
        }

        Object.keys(url.langs).forEach((lang) => {
            xhtml += `<xhtml:link rel="alternate" hreflang="${lang}" href="${url.langs[lang]}"/>\n`;
        });

        xml_string +=
            `\n<url>\n  <loc>${url.url}</loc>\n` +
            xhtml +
            `<priority>${priority.toFixed(2)}</priority>\n  <lastmod>${TIMESTAMP}</lastmod>\n</url>\n`;
    });

    xml_string += "</urlset>";
    console.log("} xml");
    return xml_string;
}

async function main() {
    const urls = await get_urls();
    const sitemap = await get_sitemap(urls);
    const xml = await build_xml(sitemap);
    /* fs.writeFile(`sitemap-${new Date().toISOString()}.xml`, xml, function(err) { 
    let newDate = new Date().toISOString();
    console.log(newDate);    
    */

    let today = new Date();
    let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    let time = today.getHours() + '-' + today.getMinutes() + '-' + today.getSeconds();
    let dateTime = 'Sitemap-' + date + '-' + time + '.xml';


    fs.writeFile(dateTime, xml, function(err) {
        if (err) throw err;
        console.log("Saved!");
    });
}

main();