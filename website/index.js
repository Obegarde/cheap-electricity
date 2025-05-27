const canvas = document.querySelector("#map");
let ctx = canvas.getContext("2d");
async function getData() {
  const url = "http://127.0.0.1:3000";
  let data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    data = await response.json();
  } catch (error) {
    console.error(error.message);
  }
  canvas.setAttribute("width", data[0].length);
  canvas.setAttribute("height", data.length);

  const dataPoints = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[0].length; j++) {
      if (i < data.length * 0.5 || i > data.length * 0.625) {
        continue;
      }
      if (j < data[0].length * 0.65 || j > data[0].length * 0.75) {
        continue;
      }
      dataPoints.push(data[i][j]);
      ctx.fillStyle = `rgb(
            ${Math.floor(255 * (1 / data[i][j]))},
            ${Math.floor(255 * (1 / data[i][j]))},
            ${Math.floor(255 * (1 / data[i][j]))})`;
      ctx.fillRect(j, i, 1, 1);
    }
  }
  console.log(
    dataPoints.reduce(
      (accumulator, currentvalue) => accumulator + currentvalue,
    ) / dataPoints.length,
  );
}

getData();
