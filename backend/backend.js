const fs = require("fs");
const { NetCDFReader } = require("netcdfjs");
const https = require("https");

function generateApiLink() {
  const apiKey = fs.readFileSync("./secrets.txt", {
    encoding: "utf8",
    flag: "r",
  });
  const dateNow = new Date();
  const utcYear = dateNow.getUTCFullYear();
  const utcMonth = padWithLeadingZero(dateNow.getUTCMonth() + 1);
  const utcDay = padWithLeadingZero(dateNow.getUTCDate());
  const apiLink = `https://dmigw.govcloud.dk/v1/forecastdata/collections/harmonie_dini_eps_means/items?modelRun=${utcYear}-${utcMonth}-${utcDay}T00%3A00%3A00Z&sortorder=datetime%2CDESC&bbox-crs=https%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FOGC%2F1.3%2FCRS84&api-key=${apiKey}`;
  return [apiLink, `${utcYear}-${utcMonth}-${utcDay}`];
}

function padWithLeadingZero(input) {
  if (input < 10) {
    return `0${input}`;
  } else {
    return `${input}`;
  }
}

async function fetchJSONFromDMI() {
  const linkDate = generateApiLink();
  try {
    const response = await fetch(linkDate[0]);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    console.error(error.message);
  }
  const folderName = `./input_files/${linkDate[1]}/`;
  try {
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
    }
  } catch (err) {
    console.error(err);
  }
  for (let i = 0; i < data.features.length; i++) {
    console.log(data.features[i].asset.data.href);
    downloadGRIBFromAmazon(
      data.features[i].asset.data.href,
      folderName,
      data.features[i].id,
    );
  }
}
fetchJSONFromDMI();

function downloadGRIBFromAmazon(fileUrl, folderName, fileName) {
  const dest = `${folderName}${fileName}`;
  const file = fs.createWriteStream(dest);
  https
    .get(fileUrl, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          console.log(`${fileName} successfully downloaded`);
        });
      });
    })
    .on("error", (err) => {
      fs.unlink(dest, () => {
        console.error(`Error downloading ${fileName}: ${err}`);
      });
    });
}

function convertToTwoDimensions(inputArray, wantedLength) {
  const outArray = [];
  for (let i = 0; i * wantedLength < inputArray.length; i++) {
    let sliceArray = inputArray.slice(
      i * wantedLength,
      i * wantedLength + wantedLength,
    );
    outArray.push(sliceArray);
  }
  return outArray;
}

function getData() {
  var reader = new NetCDFReader(testData); // read the header
  const xLength = reader.getDataVariable("x").length;
  const testHeader = reader.header;
  const windSpeed = reader.getDataVariable("10si")[0];
  const windTwoDimensions = convertToTwoDimensions(windSpeed, xLength);
  const JSONData = JSON.stringify(windTwoDimensions);
  console.log(testHeader);
  return JSONData;
}

module.exports = { getData };
