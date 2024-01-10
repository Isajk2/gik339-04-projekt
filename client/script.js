function openModal() {
  document.getElementById('contributionModal').classList.remove('hidden');
  resetModalForm();
}

function closeModal() {
  document.getElementById('contributionModal').classList.add('hidden');

  resetModalForm();
  fetchDestinations();
}

//återställ formuläret i modalen
function resetModalForm() {
  const form = document.getElementById('contributionForm');
  form.reset();
  document.getElementById('destinationId').value = ''; // Nollställer destinationId varje gång modalen öppnas för nytt bidrag
  document.getElementById('delete-button').classList.add('hidden');
  document.querySelector(
    '#contributionForm button[type="submit"]'
  ).textContent = 'Skicka';
}

// Säkerställ att event-propagation stoppas så att closeModal inte aktiveras när modalen själv klickas
function modalContentClick(event) {
  event.stopPropagation();
}

// Form Submission and Page Initialization
document.addEventListener('DOMContentLoaded', function () {
  setupInitialView();
  setupFormSubmission();
  // Lägger till event listeners för knappar
  document
    .getElementById('contribute-button')
    .addEventListener('click', openModal);
  // Eftersom closeModal() är anropad när modal bakgrund klickas, behöver vi inte passa event argumentet
  document
    .getElementById('contributionModal')
    .addEventListener('click', closeModal);
});

// det inledande innehållet när sidan laddas för första gången
function setupInitialView() {
  const infoSection = document.getElementById('info-section');
  infoSection.innerHTML = `
    <div class="flex flex-col h-full p-4 justify-center items-start">
      <h2 class="text-4xl font-bold text-white mb-4">Upptäck och Dela Dina Resefavoriter</h2>
      <p class="text-lg text-white mb-4">
          Välkommen till en värld av upptäckter! På SightSharing delar resenärer från hela världen med sig av sina mest älskade platser. 
          Från dolda pärlor till berömda landmärken, hitta inspiration för ditt nästa äventyr och dela med dig av dina egna oförglömliga erfarenheter.
      </p>
      <button id="explore-button" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Börja Utforska</button>
    </div>
  `;
  document
    .getElementById('explore-button')
    .addEventListener('click', function () {
      fetchDestinations(true);
    });
  fetchDestinations();
  document.getElementById('edit-button').classList.add('hidden');
}
// Funktion för  Put&Post (uppdatera & lägga till)
function setupFormSubmission() {
  const form = document.getElementById('contributionForm');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const destinationId = document.getElementById('destinationId').value;
    const isUpdating = destinationId !== '';
    const method = isUpdating ? 'PUT' : 'POST';
    const url = isUpdating
      ? `http://localhost:3000/destinations/${destinationId}`
      : 'http://localhost:3000/destinations';
    const formData = new FormData(form);

    submitDestinationData(url, method, formData, isUpdating);
  });
}
// Skickar destinationens data till servern och hanterar uppdatering eller error
async function submitDestinationData(url, method, formData, isUpdating) {
  try {
    const response = await fetch(url, { method, body: formData });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const operation = isUpdating ? 'uppdaterats' : 'lagts till';
    const message = `Sevärdheten har ${operation}.`;
    console.log(`Före handleSuccess: ${message}`);
    handleSuccess(message);
    console.log(`Efter handleSuccess: ${message}`);
  } catch (error) {
    console.error('Error:', error);
    alert('Ett fel inträffade när ditt bidrag skulle skickas.');
  }
}

// Globala variabler för paginering
let currentPage = 1;
const itemsPerPage = 9; // Antal kort per sida

function showPage(page) {
  const cards = Array.from(document.querySelectorAll('#gallery-grid > div'));
  const totalPages = Math.ceil(cards.length / itemsPerPage);

  console.log(`Visar sida ${page} av ${totalPages}`);

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;

  cards.forEach((card, index) => {
    card.style.display = index >= start && index < end ? 'block' : 'none';
  });

  document.getElementById('prev-button').style.visibility =
    currentPage === 1 ? 'hidden' : 'visible';
  document.getElementById('next-button').style.visibility =
    currentPage === totalPages ? 'hidden' : 'visible';
}

function setupPaginationButtons() {
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');

  // Ta bort befintliga event listeners
  prevButton.removeEventListener('click', handlePrevClick);
  nextButton.removeEventListener('click', handleNextClick);

  // Lägg till event listeners igen
  prevButton.addEventListener('click', handlePrevClick);
  nextButton.addEventListener('click', handleNextClick);
}

function handlePrevClick() {
  if (currentPage > 1) {
    currentPage--;
    showPage(currentPage);
  }
}

function handleNextClick() {
  const cards = Array.from(document.querySelectorAll('#gallery-grid > div'));
  const totalPages = Math.ceil(cards.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    showPage(currentPage);
  }
}

// Anropa denna funktion när alla kort har lagts till på sidan och efter att en ny sevärdhet har valts
initPagination();

function initPagination() {
  showPage(currentPage);
  setupPaginationButtons();
}

async function fetchDestinations(randomize = false) {
  try {
    const response = await fetch('http://localhost:3000/destinations');
    const destinations = await response.json();
    const galleryGrid = document.getElementById('gallery-grid');

    galleryGrid.innerHTML = ''; // Rensa tidigare kort

    // Lägg till kort och dess event listeners
    destinations.forEach((destination) => {
      const card = createCard(destination);
      galleryGrid.appendChild(card);
      card.addEventListener('click', () => {
        currentDestinationId = destination.id;
        updateInfoSection(destination);
        updateBackground(destination);
      });
    });

    // Initiera paginering här
    initPagination();

    // Hantera slumpmässigt vald sevärdhet eller befintligt vald sevärdhet
    if (randomize && destinations.length > 0) {
      const randomIndex = Math.floor(Math.random() * destinations.length);
      currentDestinationId = destinations[randomIndex].id;
      currentPage = Math.ceil((randomIndex + 1) / itemsPerPage);
      showPage(currentPage);
      updateInfoSection(destinations[randomIndex]);
      updateBackground(destinations[randomIndex]);
    } else if (currentDestinationId) {
      const currentDestination = destinations.find(
        (dest) => dest.id === currentDestinationId
      );
      if (currentDestination) {
        updateInfoSection(currentDestination);
        updateBackground(currentDestination);
      }
    } else {
      // Visa första sidan om ingen sevärdhet är vald
      showPage(1);
    }
  } catch (error) {
    console.error('Error fetching destinations:', error);
  }
}

function createCard(destination) {
  // Kontrollera om bildsökvägen finns och ersätt bakåtstreck med framåtstreck
  const imageUrl = destination.galleryImage
    ? `http://localhost:3000/${destination.galleryImage.replace(/\\/g, '/')}`
    : '../images/noImage.png'; // Ange en standardbild om ingen finns

  // Skapa kortdiven
  const card = document.createElement('div');
  card.className =
    'mb-4 rounded-lg shadow-lg overflow-hidden relative text-white';

  // Skapa bildcontainern
  const imageContainer = document.createElement('div');
  imageContainer.className =
    'bg-cover bg-center rounded-lg cursor-pointer transition-transform duration-700 ease-in-out';
  imageContainer.style.backgroundImage = `url('${imageUrl}')`;
  imageContainer.classList.add('h-full', 'w-full');

  // Lägg till hover-effekten för zoomning endast på bilden
  card.addEventListener('mouseenter', () => {
    imageContainer.classList.add('scale-110');
  });
  card.addEventListener('mouseleave', () => {
    imageContainer.classList.remove('scale-110');
  });

  // Skapa textoverlay
  const textOverlay = document.createElement('div');
  textOverlay.className =
    'absolute bottom-0 left-0 bg-black bg-opacity-50 p-2 rounded-bl-lg w-full';
  textOverlay.innerHTML = `<h3 class="text-sm font-bold">${destination.name}</h3>`;

  // Lägg till imageContainer och textOverlay till kortet
  card.appendChild(imageContainer);
  card.appendChild(textOverlay);

  return card;
}

function updateBackground(destination) {
  // Uppdatera bakgrundsbilden
  const backgroundImageUrl = destination.backgroundImage
    ? `http://localhost:3000/uploads/${destination.backgroundImage
        .split('\\')
        .pop()}`
    : '../images/default_background.png';
  document.body.style.backgroundImage = `url('${backgroundImageUrl}')`;
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

  // Visa Redigera-knappen och uppdatera dess onclick-händelse
  const editButton = document.getElementById('edit-button');
  editButton.classList.remove('hidden');
  editButton.onclick = () => openEditModal(destination.id);

  infoSection.classList.remove('hidden');
}

function openEditModal(destinationId) {
  console.log(destinationId);
  // Sätt destinationens ID i ett dolt fält i formuläret
  document.getElementById('destinationId').value = destinationId;

  // Hämta befintlig data om destinationen
  fetch(`http://localhost:3000/destinations/${destinationId}`)
    .then((response) => response.json())
    .then((destination) => {
      // Fyll i formuläret med befintlig data
      const form = document.getElementById('contributionForm');
      // Ta bort befintlig onsubmit-händelselyssnare för att förhindra dubbelbindning
      form.onsubmit = null;
      form.elements['name'].value = destination.name;
      form.elements['location'].value = destination.location;
      form.elements['description'].value = destination.description;

      // Hantera befintliga bildfiler om det behövs...

      // Visa "Ta bort sevärdhet" knappen och konfigurera dess onclick-händelse
      const deleteButton = document.getElementById('delete-button');
      deleteButton.classList.remove('hidden');
      deleteButton.onclick = () => deleteDestination(destinationId);

      // Ändra texten på skicka-knappen till "Uppdatera"
      document.querySelector(
        '#contributionForm button[type="submit"]'
      ).textContent = 'Uppdatera';

      // Ändra formulärets beteende för att hantera uppdatering istället för skapande
      form.onsubmit = function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        const url = `http://localhost:3000/destinations/${destinationId}`;
        // submitDestinationData(url, 'PUT', formData, true);
      };

      // Visa modalen
      document.getElementById('contributionModal').classList.remove('hidden');
    })
    .catch((error) => console.error('Error:', error));
}

// Modal Dialog Functions
function openAddModal() {
  document.getElementById('destinationId').value = ''; // Rensa destinationId för ny tillägg
  openModal(); // Anropa openModal för att öppna modalen
  console.log(destinationId);
}

// stänger modalen när en uppdatering lyckats genom att stänga modalen, visa ett meddelande om att det lyckats, och uppdatera listan med destinationer.
// Om det finns en nyare version av destinationen, så kommer även informationen om den att uppdateras på sidan.
function handleSuccess(message) {
  console.log('handleSuccess called with message:', message);
  closeModal();
  alert(message);
  fetchDestinations();
}

// Tar bort en destination efter användarens bekräftelse och hanterar uppdatering eller error.
async function deleteDestination(destinationId) {
  if (confirm('Är du säker på att du vill ta bort denna sevärdhet?')) {
    try {
      const response = await fetch(
        `http://localhost:3000/destinations/${destinationId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      handleSuccess('Sevärdheten har tagits bort.');
    } catch (error) {
      console.error('Error:', error);
      alert('Ett fel inträffade vid borttagning: ' + error.message);
    }
  }
}
