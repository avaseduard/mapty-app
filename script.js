'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Workout parent class
class Workout {
  date = new Date();
  id = Date.now().toString().slice(-10);

  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

// Running child class
class Running extends Workout {
  type = 'running';
  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling child class
class Cycling extends Workout {
  type = 'cycling';
  constructor(coordinates, distance, duration, elevation) {
    super(coordinates, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Application architecture
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // All methods are called as soon as the constructor get's trigerred by creating the App class
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Submitting a new workout
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Toggling cadence/ elevation when selecting running/ cycling
    inputType.addEventListener('change', this._toggleElevationField);

    // Centering the popup on map when the user clicks the workout container
    containerWorkouts.addEventListener(
      'click',
      this._centerMapOnPopup.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Cannot access your location');
        }
      ); // the first function is for succes, the second one is for error
  }

  _loadMap(position) {
    const latitude = position.coords.latitude; // getting the latitude
    const { longitude } = position.coords; // same thing as above, but using destructuring

    const coordinates = [latitude, longitude];

    // L is the namespace (like Intl), map is a function and "map" is the id of the html element; 13 is the zoom level
    this.#map = L.map('map').setView(coordinates, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // looping through each workout from the array to render the marker on the map
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE; // assigning the event to a variable that we can use later for displaying the marker
    form.classList.remove('hidden'); // revealing the form when the map is clicked
    inputDistance.focus(); // adding the input cursor to the distance input field (for user convenience)
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        ''; // clearing the form
    form.style.display = 'none'; // preventing the animation
    form.classList.add('hidden'); // hiding the form
    setInterval(() => (form.style.display = 'grid'), 1000); // enabling the animation
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault(); // otherwise the marker would dissapear
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // checks if every parameter of the function is a number
    const allPositive = (...inputs) => inputs.every(inp => inp > 0); // checks if every parameter of the function is positive

    // Getting data from the form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = +inputDuration.value; // converting to number, as above, but using a different
    const { lat, lng } = this.#mapEvent.latlng; // reading the coordinates and defining them in variables
    let workout;

    // Check if data is valid
    // If workout is running, create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);

      if (
        !Number.isFinite(distance) ||
        !Number.isFinite(duration) ||
        !Number.isFinite(cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Please input a positive number.');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        // same as above, but using the validInputs function
        return alert('Please input a positive number.');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkout(workout);

    // Render workout on list
    this._renderWorkoutMarker(workout);

    // Clearing the fields after input
    this._hideForm();

    // Setting the local storage for workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coordinates, { opacity: 0.7 })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _centerMapOnPopup(e) {
    const workoutElement = e.target.closest('.workout'); // targetting the workout container and it's closest elements, so the user can click anywhere inside it

    if (!workoutElement) return; // ignoring the situation where the user clicks outside the workout container

    const workout = this.#workouts.find(
      work => work.id === workoutElement.dataset.id
    ); // finding the workout from the workouts array that matches the id

    this.#map.setView(workout.coordinates, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    }); // using the map property to move to the coordinates, zoom to the default level and do all this slow
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // first argument is key (the object's name); second argument is the object converted to a string
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); // retrieving the data and converting it back to an object

    if (!data) return; // if there's no data found in local storage, return

    this.#workouts = data; // if data is found, fill it in the workouts array

    this.#workouts.forEach(workout => this._renderWorkout(workout)); // looping though each workout from the array to render it in the container
  }

  reset() {
    localStorage.removeItem('workouts'); // removing the workout from the local storage (only through the console)
    location.reload(); // reloading the page
  }
}

const app = new App();
