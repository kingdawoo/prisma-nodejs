// Modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // krävs för enctype = multipart/form-data (filuppladdning)
const notifier = require('node-notifier');

const app = express(); // muy importante

// Prisma
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // CRUD operationer kan göras här direkt
}

main()
  .then(async () => {
    await prisma.$disconnect()
})
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})

// Behandla statiska filer i det nuvarande dir (med hjälp av express module)
app.use(express.static('.'));

// Multer storage config (cb = callback)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads/')); // destinationen där alla uppladdade bilder går
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // använd originalla namnet för filen
  }
});

// Variable som ska behandla filuppladningarna med definierad lagring (linje 12-19)
const upload = multer({ storage: storage });

// Parse URL-encoded body, tilldelar resultat inuti req.body 
app.use(express.urlencoded({ extended: true })); // extended: true; för mer komplexa objekt

// Routes för HTML filerna
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/create_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'create_user.html'));
});

app.get('/edit_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'edit_user.html'));
});

app.get('/view_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'view_user.html'));
});

app.get('/delete_user', (req, res) => {
  res.sendFile(path.join(__dirname, 'delete_user.html'));
});

// Starta server på port 3000
app.listen(3000, () => {
  console.log('Server is listening on http://localhost:3000');
});

// V Processa form data från post V

// SKAPA KONTO med prisma
app.post('/create_user', upload.single('image'), async (req, res) => {
  console.log(req.body);

  const formData = req.body; // request.body, ta info från just den client request i <body> html (form)

  // Skapa ett nytt user med form datan och in i 'Users' tabellen
  try {
    const newUser = await prisma.user.create({
      data: {
        firstName: formData['first-name'],
        lastName: formData['last-name'],
        userName: formData['user-name'],
        birthDate: new Date(formData['birth-date']), // Konvertera birthDate till Date objekt
        image: req.file ? req.file.filename : '',
        profession: formData['profession']
      },
    });

    notifier.notify({
      title: 'Konto skapad!',
      message: 'Bra jobbat',
      icon: path.join(__dirname, '/img/check.jpg')
    });

    res.redirect('/index.html');
  } catch (error) {
    console.error('Error (skapa):', error);
    res.status(500).send('Error (skapa)');
  }
});

// SÖKA KONTO
app.post('/search_user', (req, res) => {
  console.log("Searched username: " + req.body.username);

  const userSearched = req.body.username;
  let userFound = false;
  
  // Loop igenom för att hitta användare
  userData.users.forEach(user => {
    if (userSearched === user.userName) {
      userFound = true;
      notifier.notify({
        title: 'JA!',
        message: `${userSearched} fanns!`,
        icon: path.join(__dirname, '/img/check.jpg')
      });

      // Jämför sökt användarnamn med existerande och tilldela dess värden till user variabel
      const user = userData.users.find(u => u.userName === userSearched);
      const userValues = Object.values(user);
      console.log('Values of user:', userValues);

      // Lägg till redigeringsformulär + användardata
      res.send(` 
        <link rel="stylesheet" href="../css/edit_user.css">
        <form action="/edit_user" method="POST" enctype="multipart/form-data">
          <label for="first-name">Förnamn: </label>
          <input type="text" name="first-name" id="first-name">

          <label for="last-name">Efternamn: </label>
          <input type="text" name="last-name" id="last-name">

          <label for="user-name">Användarnamn: </label>
          <input type="text" name="user-name" id="user-name">

          <label for="birth-date">Födelsedag: </label>
          <input type="date" name="birth-date" id="birth-date">

          <label for="image">Bild: </label>
          <input type="file" accept="image/png, image/jpeg" name="image" id="image">

          <label for="profession">Yrke: </label>
          <input type="text" name="profession" id="profession">

          <input type="submit" name="edit" value="Redigera">

          <input type="hidden" name="edit-username" value="${userSearched}">
        </form>

        <div id="user-info">
          <p id="f-name">${userValues[1]}</p>
          <p id="l-name">${userValues[2]}</p>
          <p id="u-name">${userValues[3]}</p>
          <p id="b-date">${userValues[4]}</p>
          <img src="../uploads/${userValues[5]}" alt="Portrait" id="photo" width=250 height=250>
          <p id="pro">${userValues[6]}</p>
        </div>
      `);
    }
  });

  if (!userFound) {
    notifier.notify({
      title: 'Fel!',
      message: 'Inget konto med det användarnamn existerar',
      icon: path.join(__dirname, '/img/cross.png')
    });
  }
});

// REDIGERA KONTO
app.post('/edit_user', upload.single('image'), (req, res) => {
  const editUsername = req.body['edit-username']; // Ta den användaren som blev sökt för ifrån hidden type

  // Hitta användaren genom jämföring (istället för loop kan man använda 'find')
  const userToEdit = userData.users.find(user => user.userName === editUsername);

  if (userToEdit) {
    // Uppdatera användardatan med de nya form datan
    userToEdit.firstName = req.body['first-name'];
    userToEdit.lastName = req.body['last-name'];
    userToEdit.userName = req.body['user-name'];
    userToEdit.birthDate = req.body['birth-date'];
    userToEdit.image = req.file ? req.file.filename : "",
    userToEdit.profession = req.body['profession'];

    // Skriv om de redigerade användardatan till JSON filen
    fs.writeFile(filePathToJSON, JSON.stringify(userData, null, 2), (err) => {
      if (err) {
        res.status(500).send('<p>Error saving data</p>');
      } else {
        notifier.notify({
          title: 'Konto uppdaterat!',
          message: 'Användarens information har uppdaterats',
          icon: path.join(__dirname, '/img/check.jpg')
        });
        res.redirect('/index.html');
      }
    });
  }
});

// SE KONTO
app.post('/view_user', (req, res) => { // Va osäker ifall all funktionalitet skulle vara i nodejs, det här fungerar dock lika bra
  console.log(userData.users);

  let userHTML = '<!DOCTYPE html>';
  userHTML += '<html lang="en">';
  userHTML += '<head>';
  userHTML += '<meta charset="UTF-8">';
  userHTML += '<title>View Users</title>';
  userHTML += '<link rel="stylesheet" href="../css/view_user.css">'
  userHTML += '</head>';
  userHTML += '<body>';
  userHTML += '<div id="user-list">';

  userData.users.forEach(user => { // Loopa igenom all info från alla användare och lägg i element sedan variabel
    userHTML += '<div class="user">';
    userHTML += `<h2>${user.userName}</h2>`;
    userHTML += `<p>${user.firstName} ${user.lastName}</p>`;
    userHTML += `<p>${user.birthDate}</p>`;
    userHTML += `<img src="/uploads/${user.image}" alt="Portrait" width="100" height="100">`;
    userHTML += `<p>${user.profession}</p>`;
    userHTML += '</div>';
  });

  userHTML += '</div>';
  userHTML += '</body>';
  userHTML += '</html>';

  res.send(userHTML); // Skicka tillbaka till client för att se
});

// RADERA KONTO