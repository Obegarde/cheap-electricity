const fs = require("fs");
const { NetCDFReader } = require("netcdfjs");
const https = require("https");
const subProcess = require("child_process");
function main() {
  fetchJSONFromDMI();
}
main();

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

function createFolders(folderName) {
  try {
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
    }
  } catch (err) {
    console.error(err);
  }
  try {
    if (!fs.existsSync(`${folderName}/GRIB`)) {
      fs.mkdirSync(`${folderName}/GRIB`);
    }
  } catch (err) {
    console.error(err);
  }
  try {
    if (!fs.existsSync(`${folderName}/NetCDF`)) {
      fs.mkdirSync(`${folderName}/NetCDF`);
    }
  } catch (err) {
    console.error(err);
  }
}
function convertFromGribToNetCDF(dateFolder, fileName) {
  const withoutExt = fileName.split(".")[0];
  let gribToCDFProcess = subProcess.spawn("cdo", [
    "-f",
    "nc",
    "copy",
    `./input_files/${dateFolder}/GRIB/${fileName}`,
    `./input_files/${dateFolder}/NetCDF/${withoutExt}.nc`,
  ]);
  gribToCDFProcess.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  gribToCDFProcess.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  gribToCDFProcess.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
    createAverageForTime(dateFolder, withoutExt);
  });
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
  createFolders(folderName);
  for (let i = 0; i < data.features.length; i++) {
    downloadGRIBFromAmazon(
      data.features[i].asset.data.href,
      `${linkDate[1]}`,
      data.features[i].id,
    );
  }
}

function downloadGRIBFromAmazon(fileUrl, folderDate, fileName) {
  const dest = `./input_files/${folderDate}/GRIB/${fileName}`;
  const file = fs.createWriteStream(dest);
  https
    .get(fileUrl, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          console.log(`${fileName} successfully downloaded`);
          convertFromGribToNetCDF(folderDate, fileName);
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

function createAverageForTime(folderDate, runName) {
  const data = fs.readFileSync(
    `./input_files/${folderDate}/NetCDF/${runName}.nc`,
  );
  var reader = new NetCDFReader(data);
  const xLength = reader.getDataVariable("x").length;
  const windSpeed = reader.getDataVariable("10si")[0];
  const windTwoDimensions = convertToTwoDimensions(windSpeed, xLength);
  const dataPoints = [];
  for (let i = 0; i < windTwoDimensions.length; i++) {
    for (let j = 0; j < windTwoDimensions[0].length; j++) {
      //Excludes points outside a box around Denmark
      if (
        i < windTwoDimensions.length * 0.5 ||
        i > windTwoDimensions.length * 0.625
      ) {
        continue;
      }
      if (
        j < windTwoDimensions[0].length * 0.65 ||
        j > windTwoDimensions[0].length * 0.75
      ) {
        continue;
      }
      dataPoints.push(windTwoDimensions[i][j]);
    }
  }
  const averageWindSpeed =
    dataPoints.reduce(
      (accumulator, currentvalue) => accumulator + currentvalue,
    ) / dataPoints.length;
  const averageArrayPoint = [runName, averageWindSpeed];
  saveAverageToFile(folderDate, averageArrayPoint);
}

function saveAverageToFile(folderDate, dataToSave) {
  const runName = dataToSave[0];
  const runAverage = dataToSave[1];

  try {
    if (
      !fs.existsSync(`./input_files/${folderDate}/averagesFor${folderDate}`)
    ) {
      let dataWrappedForFirst = {};
      dataWrappedForFirst[runName] = runAverage;
      fs.writeFile(
        `./input_files/${folderDate}/averagesFor${folderDate}`,
        JSON.stringify(dataWrappedForFirst),
        (err) => {
          if (err) throw err;
          console.log(`${dataToSave} saved to new file`);
        },
      );
    } else {
      const existingData = JSON.parse(
        fs.readFileSync(`./input_files/${folderDate}/averagesFor${folderDate}`),
      );
      existingData[runName] = runAverage;
      fs.writeFile(
        `./input_files/${folderDate}/averagesFor${folderDate}`,
        JSON.stringify(existingData),
        (err) => {
          if (err) throw err;
          console.log(`${dataToSave} saved to existingFile`);
        },
      );
    }
  } catch (err) {
    console.error(err);
  }
}
