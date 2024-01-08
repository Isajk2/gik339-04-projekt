function openModal() {
  document.getElementById('contributionModal').classList.remove('hidden');
  resetModalForm();
}

function closeModal() {
  document.getElementById('contributionModal').classList.add('hidden');
  resetModalForm();
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
    const message = `Sevärdheten har ${
      isUpdating ? 'uppdaterats' : 'lagts till'
    }.`;
    handleSuccess(message);

    // Specifik hantering för uppdatering
    if (isUpdating) {
      const updatedDestination = {
        id: document.getElementById('destinationId').value,
        name: formData.get('name'),
        location: formData.get('location'),
        description: formData.get('description'),
        // Lägg till ytterligare fält om nödvändigt
      };
      updateInfoSection(updatedDestination);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Ett fel inträffade när ditt bidrag skulle skickas.');
  }
}

function updateInfoSectionAfterEdit(updatedDestination) {
  const existingCard = document.querySelector(
    `[data-id='${updatedDestination.id}']`
  );
  if (existingCard) {
    // Uppdatera kortet med den nya informationen ----------------------------------------
    // (Du kan behöva justera detta beroende på hur ditt kort är uppbyggt)
    existingCard.querySelector('.destination-name').textContent =
      updatedDestination.name;
    existingCard.querySelector('.destination-description').textContent =
      updatedDestination.description;
    // Uppdatera eventuella andra element som behövs
    fetchDestinations(); // Ladda om alla sevärdheter
  }
}

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

function updateInfoSection(destination) {
  const infoSection = document.getElementById('info-section');
  const name = destination.name;
  const nameLength = name.length;
  let textSizeClass = nameLength > 10 ? 'text-7xl' : 'text-8xl';
  textSizeClass = nameLength > 20 ? 'text-6xl' : textSizeClass;

  // Ändra bildens URL för att använda den korrekta server-sökvägen
  const backgroundImageUrl = destination.backgroundImage
    ? `http://localhost:3000/uploads/${destination.backgroundImage
        .split('\\')
        .pop()}`
    : '../images/default_background.png'; // Använd standardbakgrund om ingen bild finns

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

  // Uppdatera bakgrundsbilden
  document.body.style.backgroundImage = `url('${backgroundImageUrl}')`;
  // Visa Redigera-knappen och uppdatera dess onclick-händelse
  const editButton = document.getElementById('edit-button');
  editButton.classList.remove('hidden'); // Ta bort 'hidden' klassen för att visa knappen
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
      form.elements['name'].value = destination.name;
      form.elements['location'].value = destination.location;
      form.elements['description'].value = destination.description;

      // Här kan du hantera befintliga bildfiler om det behövs

      // Visa "Ta bort sevärdhet" knappen och konfigurera dess onclick-händelse
      const deleteButton = document.getElementById('delete-button');
      deleteButton.classList.remove('hidden');
      deleteButton.onclick = () => deleteDestination(destinationId);

      // Ändra texten på skicka-knappen till "Uppdatera"
      const submitButton = document.querySelector(
        '#contributionForm button[type="submit"]'
      );
      submitButton.textContent = 'Uppdatera';

      // Ändra formulärets beteende för att hantera uppdatering istället för skapande
      form.onsubmit = (event) => submitEditForm(event, destinationId);

      // Visa modalen
      document.getElementById('contributionModal').classList.remove('hidden');
    })
    .catch((error) => console.error('Error:', error));
  fetchDestinations();
}

// Modal Dialog Functions
function openAddModal() {
  document.getElementById('destinationId').value = ''; // Rensa destinationId för ny tillägg
  openModal(); // Anropa openModal för att öppna modalen
  console.log(destinationId);
}

// stänger modalen när en uppdatering lyckats genom att stänga modalen, visa ett meddelande om att det lyckats, och uppdatera listan med destinationer.
// Om det finns en nyare version av destinationen, så kommer även informationen om den att uppdateras på sidan.
function handleSuccess(message, updatedDestination = null) {
  closeModal();
  alert(message);

  if (updatedDestination) {
    // Uppdatera info-section med den uppdaterade destinationen
    submitDestinationData(updatedDestination);
  } else {
    // Om ingen specifik destination tillhandahålls, hämta och visa alla destinationer
    fetchDestinations();
  }
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
