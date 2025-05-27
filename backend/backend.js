const { readFileSync } = require("fs");
const { NetCDFReader } = require("netcdfjs");

// http://www.unidata.ucar.edu/software/netcdf/examples/files.html
const data = readFileSync(
  "/home/obegarde/workspace/github.com/obegarde/cheap-electricity/backend/input_files/test1.nc",
);

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
  var reader = new NetCDFReader(data); // read the header
  const xLength = reader.getDataVariable("x").length;
  const testHeader = reader.header;
  const windSpeed = reader.getDataVariable("10si")[0];
  const windTwoDimensions = convertToTwoDimensions(windSpeed, xLength);
  const JSONData = JSON.stringify(windTwoDimensions);
  console.log(testHeader);
  return JSONData;
}

module.exports = { getData };
