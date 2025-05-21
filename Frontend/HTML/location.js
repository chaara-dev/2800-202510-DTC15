
const WEATHER_API_KEY = "dcb92ea80c4014610f139151a2633d67";

function getLocationAndWeather() {
  if (!navigator.geolocation) {
    document.getElementById("location").innerText = "Geolocation is not supported by your browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(success, error);

  function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    document.getElementById("location").innerText = `Latitude: ${lat.toFixed(2)},  Longitude: ${lon.toFixed(2)}`;

    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`)
      .then(response => response.json())
      .then(data => {
        const temp = data.main.temp;
        const weather = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        const city = data.name;

        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        document.getElementById("weather").innerHTML = `
          📍 ${city}: ${temp}°C, ${weather}
          <img id="weather-icon" src="${iconUrl}" alt="${weather}" class="inline-icon">
        `;
      })
      .catch(() => {
        document.getElementById("weather").innerText = "Could not fetch weather data.";
      });
  }

  function error() {
    document.getElementById("location").innerText = "Unable to retrieve your location.";
  }
}

getLocationAndWeather();
