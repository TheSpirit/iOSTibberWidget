// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: bolt;
// Tibber-widget
// v1.0.0 - første versjon - Sven-Ove Bjerkan
// v1.0.1 - Lagt til "HOME_NR" som innstilling
// v1.5.0 - Laget medium- og large-størrelse widget (foreløpig som 3 separate script)
// v2.0.0 - Viser 3 timer bakover og inntil 21 timer fremover (konfigurerbart)
// v2.0.1 - Mulighet for å legge til nettleie
// v2.0.2 - småfiks på fontfarger, o.l
// v2.0.3 - Uploaded to GitHub by Daniel Eneström (https://github.com/danielenestrom)
// v2.0.4 - avrunder pris til hele øre. Trinn-graf.
// v2.0.5 - Legg til valg av HOME_NR som parameter og visning av "bolig-navn" - takk til Marium0505!
// v2.0.6 - Translate DE
// v2.0.7 - Small changes

// Finn din token ved å logge på med Tibber-kontoen din her:
// https://developer.tibber.com/settings/accesstoken
// OBS! Din token er privat, ikke del den med noen!

const TIBBERTOKEN = "yourpersonaltibbertoken";

// I de fleste tilfeller skal HOME_NR være 0, men om man har flere abonnement (hus+hytte f.eks)
// så kan det være at man må endre den til 1 (eller 2).
// Prøv 0 først og om det kommer feilmelding, prøv med 1 (og deretter 2).
if (args.widgetParameter) {
	HOME_NUMBER = args.widgetParameter;
} else {
	HOME_NUMBER = 0; // Default - brukes om ikke man har lagt til paramter for widgeten og/eller når man ser på widgeten direkte i appen.
}

const HOME_NR = HOME_NUMBER;

// HTML-koden for bakgrunnsfarge på widget (#000000 er svart)
const BAKGRUNNSFARGE = "#000000";

// HTML-koden for tekstfarge (#FFFFFF er hvit)
const TEKSTFARGE = "#FFFFFF";

// Når prisen denne timen er høyere enn snittprisen i dag, så brukes denne tekstfargen (rød)
const TEXTFARGE_HOY = "#de4035";

// Når prisen denne timen er lavere enn snittprisen i dag, så brukes denne tekstfargen (grønn)
const TEXTFARGE_LAV = "#35de3b";

// Angi hvor mange timer bakover og fremover fra inneværende time den skal bruke
const TIMER_BAKOVER = 3;
const TIMER_FREMOVER = 21;

// Skal nettleie legges til i beløpene?
const NETTLEIE = false; // (true eller false)
const NETT_FAST = 198; // I kroner pr mnd
const NETT_KWH = 35.51; // I øre pr kWh, med punktum som desimaltegn


// Angi størrelsen på grafen
const GRAPH_WIDTH = 2400;
const GRAPH_HEIGHT = 800;

const COSTUNIT = "€";

const PRICE_PER_UNIT = "cent/kWh";

const TODAY_LABEL = "Heute"

const MONTH_LABEL = "Dieser Monat"

const STATE = "Stand";



// DU TRENGER IKKE ENDRE NOE LENGRE NED !
// --------------------------------------

// GraphQL-spørring
let body = {
  "query": "{ \
    viewer { \
      homes { \
        appNickname \
	  	  address { \
	  	    address1 \
		} \
        currentSubscription { \
          priceRating { \
            hourly { \
              entries { \
                total \
                time \
              } \
            } \
          } \
        } \
        dayConsumption: consumption (resolution: HOURLY, last: " + new Date().getHours() + ") { \
          pageInfo { \
            totalConsumption \
            totalCost \
          } \
        } \
        monthConsumption: consumption (resolution: DAILY, last: " + (new Date().getDate()-1) + ") { \
	      pageInfo { \
		    totalConsumption \
		    totalCost \
	      } \
        } \
      } \
    } \
  }"
}

let req = new Request("https://api.tibber.com/v1-beta/gql")
req.headers = {
  "Authorization": "Bearer " + TIBBERTOKEN,
  "Content-Type": "application/json"
}
req.body = JSON.stringify(body)
req.method = "POST";
let json = await req.loadJSON()

// Array med alle timepriser
let allPrices = json["data"]["viewer"]["homes"][HOME_NR]["currentSubscription"]["priceRating"]["hourly"]["entries"]

// Date-objekt for akkurat denne timen
let d = new Date();
d.setMinutes(0)
d.setSeconds(0)
d.setMilliseconds(0)//

let current_hour = d.getHours()

// Loop for å finne array-key for inneværende time
let iNow, iStart, iEnd, dLoop
for (let i = 0; i < allPrices.length; i++) {
 dLoop = new Date(allPrices[i].time)
 if (d.getTime() == dLoop.getTime()) {
   iNow = i
   iStart = (iNow-current_hour)
   iEnd = (iNow + ( 24 - current_hour -1))
   if (iEnd > allPrices.length) {
	   iEnd = (allPrices.length-1)
   }
   break;
  }
}

// Loop for å finne snittpris
let avgPrice = 0
let minPrice = 100000
let maxPrice = 0
let prices = [];
let colors = [];
let pointsize = [];

// Finn neste midnatt
d.setHours(0);
d.setDate(d.getDate()+1)

for (let i = iStart; i <= iEnd; i++) {
  if (NETTLEIE) {
    allPrices[i].total = allPrices[i].total+(NETT_KWH/100);
  }
  avgPrice += allPrices[i].total
  prices.push(Math.round(allPrices[i].total * 100));

  if (allPrices[i].total * 100 < minPrice)
    minPrice = (allPrices[i].total * 100).toFixed(2)
   if (allPrices[i].total * 100 > maxPrice)
     maxPrice = (allPrices[i].total * 100).toFixed(2)

  if (i == iNow) {
  	colors.push("'yellow'");
    pointsize.push(20);
  }
  else if (d.getTime() == new Date(allPrices[i].time).getTime()) {
    colors.push("'cyan'");
    pointsize.push(20);
  }
  else {
    colors.push("'cyan'");
    pointsize.push(7);
  }
}
avgPrice = (avgPrice / (prices.length) * 100).toFixed(2)

// Loop for å lage strek for snittprisend = new Date()
  d = new Date()
  let hour = d.getHours();

  // Omgjør til formatet HH:mm
  if (hour < 10) hour = "0" + hour;
  let min = d.getMinutes();
  if (min < 10) min = "0" + min;
  console.log(hour);
  let time = (hour + ":" + min).toString();
//   time.centerAlignText();
//   time.font = Font.lightSystemFont(8);
//   time.textColor = new Color(TEKSTFARGE);





let dTemp
let avgPrices = []
let labels = []
for (let i = iStart; i <= iEnd; i++) {
  avgPrices.push(avgPrice);
  dTemp = new Date(allPrices[i].time)
  let hours = dTemp.getHours();
  if (hours < 10)
    hours = "0"+hours;
  labels.push("'" + hours + "'");
}

let url = "https://quickchart.io/chart?w="+ GRAPH_WIDTH + "&h=" + GRAPH_HEIGHT + "&devicePixelRatio=1.0&c="
url += encodeURI("{ \
   type:'line', \
   data:{ \
      labels:[ \
         " + labels + " \
      ], \
      datasets:[ \
         { \
            label:'cent/kWh    ', \
            steppedLine:true, \
            data:[ \
               " + prices + " \
            ], \
            fill:false, \
            borderColor:'cyan', \
            borderWidth: 7, \
            pointBackgroundColor:[ \
               " + colors + " \
            ], \
            pointRadius:[ \
               " + pointsize + " \
            ] \
         }, \
         { \
            label:'Durchschnitt (" + avgPrice + " cent)', \
            data:[ \
               " + avgPrices + " \
            ], \
            fill:false, \
            borderColor:'red', \
            borderWidth: 7, \
            pointRadius: 0 \
         } \
      ] \
   }, \
   options:{ \
      legend:{ \
         labels:{ \
            fontSize:90, \
            fontColor:'white' \
         } \
      }, \
      scales:{ \
         yAxes:[ \
            { \
               ticks:{ \
                  beginAtZero:false, \
                  fontSize:100, \
                  fontColor:'white' \
               } \
            } \
         ], \
         xAxes:[ \
            { \
               ticks:{ \
                  fontSize:60, \
                  fontColor:'white' \
               } \
            } \
         ] \
      } \
   } \
}")

const GRAPH = await new Request(url).loadImage()

console.log(url);


// Hent ut totalt forbruk/kostnad hittil i dag
let totCostD = (json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalCost"]).toFixed(2)
let totForbrukD = (json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalConsumption"]).toFixed(2)
// Hent ut totalt forbruk/kostnad hittil denne mnd
let totCostM = ((json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalCost"]) + (json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalCost"])).toFixed(2)
let totForbrukM = ((json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalConsumption"]) + (json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalConsumption"])).toFixed(2)
let preiskwh = (totCostM/totForbrukM*100).toFixed(2)// 
// preiskwh = Math.round(preiskwh)
//console.log("preiskwh")
//console.log(preiskwh)

// Legg til nettleie i dagssummen?
if (NETTLEIE) {
	totCostD += NETT_FAST/new Date(d.getYear(), d.getMonth()+1, 0).getDate();
	totCostD += totForbrukD*(NETT_KWH/100);
	totCostD = Math.round(totCostD);
}

// Legg til nettleie i månedssummen?
if (NETTLEIE) {
	totCostM += NETT_FAST;
	totCostM += totForbrukM*(NETT_KWH/100);
	totCostM = Math.round(totCostM);
}

// Hent ut pris i øre for inneværende time
//let priceOre = Math.round(allPrices[iNow].total * 100)

let priceOre = 0.00;

try {
	priceOre = (allPrices[iNow].total * 100).toFixed(2);
	console.log("priceOre");
	console.log(priceOre);
} catch {
	priceOre = 0.00;
}
// console.log(allPrices[iNow])
console.log("priceOre");
console.log(priceOre);

// Hent Tibber-logoen
const TIBBERLOGO = await new Request("https://tibber.imgix.net/zq85bj8o2ot3/6FJ8FvW8CrwUdUu2Uqt2Ns/3cc8696405a42cb33b633d2399969f53/tibber_logo_blue_w1000.png").loadImage()


// Opprett widget
async function createWidget() {
  // Create new empty ListWidget instance
  let lw = new ListWidget();

  // Set new background color
//   lw.backgroundColor = new Color(BAKGRUNNSFARGE);

let fm = FileManager.iCloud();
let path = fm.documentsDirectory() + "/widget.JPG";
console.log(path)
await fm.downloadFileFromiCloud(path);
// Image.fromFile(path) can also be used
lw.backgroundImage = fm.readImage(path);
// "w" is your widget instance

  // Man kan ikke styre når widget henter ny pris
  // men, prøver her å be widget oppdatere seg etter 1 min over neste time
  var d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(1);
  lw.refreshAfterDate = d;

  // Legg til Tibber-logo i en egen stack
  

  if (NETTLEIE) {
    let txtStack = lw.addStack();
    txtStack.addSpacer(100);
    let txtNett = txtStack.addText("Alle beløp inkl nettleie");
    txtNett.centerAlignText();
    txtNett.font = Font.lightSystemFont(10);
  }

  lw.addSpacer(10);

  let stack2 = lw.addStack()

  // Venstre kolonne
  let stackV = stack2.addStack();
  stackV.layoutVertically()
  stackV.centerAlignContent()
  stackV.setPadding(0, 10, 0, 0)

  // Legg til inneværende pris i v.kolonne
  let price = stackV.addText(priceOre + "");
  price.centerAlignText();
  price.font = Font.lightSystemFont(19);
  // Pris høyere eller lavere enn snitt avgjør farge
  if (priceOre < avgPrice)
    price.textColor = new Color(TEXTFARGE_LAV)
  else if (priceOre > avgPrice)
    price.textColor = new Color(TEXTFARGE_HOY)

  const priceTxt = stackV.addText(PRICE_PER_UNIT);
  priceTxt.centerAlignText();
  priceTxt.font = Font.lightSystemFont(10);
  priceTxt.textColor = new Color(TEKSTFARGE);
  //priceTxt.textColor = new Color('green');
  
  console.log(priceOre);

  // Legg til dagens "max | min"-timespris
  let maxmin = stackV.addText(minPrice + " | " + maxPrice)
  maxmin.centerAlignText()
  maxmin.font = Font.lightSystemFont(10);
  maxmin.textColor = new Color(TEKSTFARGE);

  // Avstand mellom kolonnene
  stack2.addSpacer(10)

  // Midtre kolonne
  let stackM = stack2.addStack();
  stackM.layoutVertically()

  // Legg til forbruk hittil i dag i m.kolonne
  let forbruk = stackM.addText(totCostD + COSTUNIT);
  forbruk.rightAlignText();
  forbruk.font = Font.lightSystemFont(16);
  forbruk.textColor = new Color(TEKSTFARGE);

  let forbruk2 = stackM.addText(totForbrukD + " kWh");
  forbruk2.rightAlignText();
  forbruk2.font = Font.lightSystemFont(14);
  forbruk2.textColor = new Color(TEKSTFARGE);

  let forbrukTxt = stackM.addText(TODAY_LABEL);
  forbrukTxt.rightAlignText();
  forbrukTxt.font = Font.lightSystemFont(10);
  forbrukTxt.textColor = new Color(TEKSTFARGE);

  // Avstand mellom kolonnene
  stack2.addSpacer(10)

  // Høyre kolonne
  let stackH = stack2.addStack();
  stackH.layoutVertically()

  // Legg til forbruk hittil denne mnd i h.kolonne
  forbruk = stackH.addText(totCostM + COSTUNIT);
  forbruk.rightAlignText();
  forbruk.font = Font.lightSystemFont(16);
  forbruk.textColor = new Color(TEKSTFARGE);

  forbruk2 = stackH.addText(totForbrukM + " kWh");
  forbruk2.rightAlignText();
  forbruk2.font = Font.lightSystemFont(14);
  forbruk2.textColor = new Color(TEKSTFARGE);

  forbrukTxt = stackH.addText(MONTH_LABEL);
  forbrukTxt.rightAlignText();
  forbrukTxt.font = Font.lightSystemFont(10);
  forbrukTxt.textColor = new Color(TEKSTFARGE);
	
	// 	---------------
	stack2.addSpacer(10)
	
	let stackx = stack2.addStack();
  stackx.layoutVertically()

  // Legg til forbruk hittil denne mnd i h.kolonne
  forbruk = stackx.addText(preiskwh);
  forbruk.rightAlignText();
  forbruk.font = Font.lightSystemFont(16);
  forbruk.textColor = new Color(TEKSTFARGE);

  forbruk2 = stackx.addText("cent/kWh");
  forbruk2.rightAlignText();
  forbruk2.font = Font.lightSystemFont(14);
  forbruk2.textColor = new Color(TEKSTFARGE);
	
	d = new Date()
  let hour = d.getHours();

  // Omgjør til formatet HH:mm
  if (hour < 10) hour = "0" + hour;
  let min = d.getMinutes();
  if (min < 10) min = "0" + min;
  console.log(hour);
  let time = (hour + ":" + min).toString();
	
	forbrukTxt = stackx.addText(time);
  forbrukTxt.rightAlignText();
  forbrukTxt.font = Font.lightSystemFont(10);
  forbrukTxt.textColor = new Color(TEKSTFARGE);
  
  
	
// -------------

  // Avstand ned til grafen
  lw.addSpacer(10);


  

  let stackGraph = lw.addStack()
  let imgstack2 = stackGraph.addImage(GRAPH)
  imgstack2.imageSize = new Size(300, 100)
  imgstack2.centerAlignImage()
  stackGraph.setPadding(0, 0, 0, 0)


  // Avstand ned til bunntekst
  lw.addSpacer(10)


  // Legg til info om når widget sist hentet prisen
  d = new Date()
  let hour1 = d.getHours();

  // Omgjør til formatet HH:mm
  if (hour1 < 10) hour1 = "0" + hour1;
  let min1 = d.getMinutes();
  if (min1 < 10) min1 = "0" + min1;

  let time1 = lw.addText(STATE + ": " + hour1 + ":" + min1);
  time1.centerAlignText();
  time1.font = Font.lightSystemFont(8);
  time1.textColor = new Color(TEKSTFARGE);

  // Return the created widget
  return lw;
}

let widget = await createWidget();

// Check where the script is running
if (config.runsInWidget) {
  // Runs inside a widget so add it to the homescreen widget
  Script.setWidget(widget);
} else {
  // Show the medium widget inside the app
  widget.presentMedium();
}
Script.complete();
