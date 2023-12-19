// Modal Dialog Functions
function openModal() {
  document.getElementById('contributionModal').classList.remove('hidden');
}

function toggleModal() {
  document.getElementById('contributionModal').classList.toggle('hidden');
}

function closeModal(event) {
  if (event.target.id === 'contributionModal') {
    toggleModal();
  }
}

// Form Submission and Page Initialization
document.addEventListener('DOMContentLoaded', function () {
  const infoSection = document.getElementById('info-section');
  infoSection.innerHTML = `
  <div class="flex flex-col h-full p-4 justify-center items-start">
  <h2 class="text-4xl font-bold text-white mb-4">Upptäck och Dela Dina Resefavoriter</h2>
  <p class="text-lg text-white mb-4">
      Välkommen till en värld av upptäckter! På SightSharing delar resenärer från hela världen med sig av sina mest älskade platser. 
      Från dolda pärlor till berömda landmärken, hitta inspiration för ditt nästa äventyr och dela med dig av dina egna oförglömliga erfarenheter.
  </p>
  <button
      id="explore-button"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
  >
      Börja Utforska
  </button>
</div>

  `;
  // Lägg till en eventlyssnare för 'Börja utforska' knappen
  document
    .getElementById('explore-button')
    .addEventListener('click', function () {
      fetchDestinations((randomize = true));
    });
  fetchDestinations();

  const form = document.getElementById('contributionForm');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(form);
    fetch('http://localhost:3000/destinations', {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        console.log(response); // Logga hela svaret
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Success:', data);
        closeModal();
        form.reset(); // Optionally, clear the form fields
        alert('Ditt bidrag har skickats!'); // Feedback to the user
        fetchDestinations(); // Fetch the updated list of destinations
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Ett fel inträffade när ditt bidrag skulle skickas.'); // Error feedback to the user
      });
  });
});

async function fetchDestinations(randomize = false) {
  try {
    const response = await fetch('http://localhost:3000/destinations');
    const destinations = await response.json();
    const galleryGrid = document.getElementById('gallery-grid');
    const infoSection = document.getElementById('info-section');

    if (randomize && destinations.length > 0) {
      // Slumpmässigt välj en destination
      const randomDestination =
        destinations[Math.floor(Math.random() * destinations.length)];
      updateInfoSection(randomDestination);
    } else {
      // Rensa tidigare kort innan nya läggs till
      galleryGrid.innerHTML = '';
      // Visa alla destinationer som kort
      destinations.forEach((destination) => {
        const card = createCard(destination);
        galleryGrid.appendChild(card);
        card.addEventListener('click', () => updateInfoSection(destination));
      });
    }
  } catch (error) {
    console.error('Error fetching destinations:', error);
  }
}

function createCard(destination) {
  const pathSegments = destination.galleryImage
    .split('\\')
    .map((segment) => encodeURIComponent(segment));
  const imageUrl = pathSegments.join('/');

  // Skapar huvudkortdiven.
  const card = document.createElement('div');
  card.className =
    'mb-4 rounded-lg shadow-lg overflow-hidden relative text-white';

  // Skapar bildcontainern som kommer att zoomas.
  const imageContainer = document.createElement('div');
  imageContainer.className =
    'bg-cover bg-center rounded-lg cursor-pointer transition-transform duration-700 ease-in-out'; // Ökad duration för en långsammare effekt
  imageContainer.style.backgroundImage = `url('/server/${imageUrl}')`;
  imageContainer.classList.add('h-full', 'w-full');

  // Lägger till hover-effekten för zoomning endast på bilden.
  card.addEventListener('mouseenter', () => {
    imageContainer.classList.add('scale-110');
  });
  card.addEventListener('mouseleave', () => {
    imageContainer.classList.remove('scale-110');
  });

  // Skapar en textoverlay som inte kommer att zoomas.
  const textOverlay = document.createElement('div');
  textOverlay.className =
    'absolute bottom-0 left-0 bg-black bg-opacity-50 p-2 rounded-bl-lg w-full';
  textOverlay.innerHTML = `<h3 class="text-sm font-bold">${destination.name}</h3>`;

  // Lägger till imageContainer och textOverlay som barn till kortet.
  card.appendChild(imageContainer);
  card.appendChild(textOverlay); // Detta gör att texten inte påverkas av zoomningen.

  return card;
}

function updateInfoSection(destination) {
  const infoSection = document.getElementById('info-section');
  const name = destination.name;
  const nameLength = name.length;
  let textSizeClass = nameLength > 10 ? 'text-7xl' : 'text-8xl';
  textSizeClass = nameLength > 20 ? 'text-6xl' : textSizeClass;

  infoSection.innerHTML = `
    <div class="flex flex-col h-full p-4">
      <h2 class="font-bold mb-2 text-white destination-name ${textSizeClass}">${name}</h2>
      <div class="text-xs mt-2 text-white">${
        'Plats: ' + destination.location
      }</div>
      <p class="text-lg text-white mt-2">${destination.description}</p>
      <a class="text-white hover:text-green-500 font-bold py-2 px-0 rounded mt-4 text-left"
         href="https://www.google.com/search?q=${encodeURIComponent(
           name + ' ' + destination.location
         )}"
         target="_blank" rel="noopener noreferrer">Mer information</a>
    </div>
  `;

  infoSection.classList.remove('hidden');
  document.body.style.backgroundImage = `url('/server/${destination.backgroundImage.replace(
    /\\/g,
    '/'
  )}')`;
}
